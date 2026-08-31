-- Versioned rate cards: an authority's uploaded schedule of rates becomes a new row, never an
-- edit of the existing one.
--
-- Every organisation starts on the national indicative card and keeps it as the floor:
-- loadRateCardForOrganisation merges the two per work_item_code, so an authority that prices six
-- items gets their six plus the national figures for the rest. Uploading is an override, never a
-- replacement, and a brand-new organisation needs no rate_cards row at all.
--
-- Why a new row per upload rather than an edit: a plan carries `adaptation_plans.rate_card_id`,
-- and its lines carry the prices by value. If an upload rewrote a card in place, every plan
-- already priced against it would keep claiming a provenance it no longer had — the fabricated
-- precision this whole layer exists to remove. Comparing a plan's card id against the currently
-- active one is also what lets the UI say "this was priced by a superseded version".
--
-- `source_csv` holds the uploaded text rather than a Storage object. A schedule of rates is
-- 15-40 rows (~3 KB). A bucket would add an object that can go missing independently of the row
-- documenting it, a second set of policies, a signed-URL read path and an orphan-cleanup
-- problem, to save a few kilobytes. A column is transactional with the commit; an object is not.
--
-- Writes narrow from `author` to `admin`: rates are a procurement decision with a budget
-- consequence for every case in the organisation, not day-to-day survey authorship.

ALTER TABLE public.rate_cards
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_csv text,
  ADD COLUMN IF NOT EXISTS source_filename text;

ALTER TABLE public.rate_cards DROP CONSTRAINT IF EXISTS rate_cards_version_check;
ALTER TABLE public.rate_cards
  ADD CONSTRAINT rate_cards_version_check CHECK (version >= 1);

-- An admin can backdate a new version to before the current one started; without this the
-- retired row would end up with effective_to < effective_from, which nothing else forbids.
ALTER TABLE public.rate_cards DROP CONSTRAINT IF EXISTS rate_cards_effective_range_check;
ALTER TABLE public.rate_cards
  ADD CONSTRAINT rate_cards_effective_range_check
  CHECK (effective_to IS NULL OR effective_to >= effective_from);

-- A schedule of rates is tens of rows. Anything larger is a paste accident.
ALTER TABLE public.rate_cards DROP CONSTRAINT IF EXISTS rate_cards_source_csv_size_check;
ALTER TABLE public.rate_cards
  ADD CONSTRAINT rate_cards_source_csv_size_check
  CHECK (source_csv IS NULL OR octet_length(source_csv) <= 262144);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
-- Create the replacements BEFORE dropping the old one, so uniqueness is never unenforced.

-- Versions of one card must coexist, so the old (scope, code) uniqueness has to widen.
CREATE UNIQUE INDEX IF NOT EXISTS rate_cards_scope_code_version_idx ON public.rate_cards
  (COALESCE(organisation_id, '00000000-0000-0000-0000-000000000000'::uuid), code, version);

-- At most one live card per scope. loadRateCardForOrganisation picked the organisation's card
-- with a bare `find`, so two active rows made the result depend on whatever order PostgREST
-- happened to return. Make that impossible in the database rather than relying on every future
-- writer to be careful. Note this is checked per statement, so the commit function below must
-- retire version N *before* inserting N+1.
CREATE UNIQUE INDEX IF NOT EXISTS rate_cards_one_active_per_scope_idx ON public.rate_cards
  (COALESCE(organisation_id, '00000000-0000-0000-0000-000000000000'::uuid), code)
  WHERE is_active;

DROP INDEX IF EXISTS public.rate_cards_scope_code_idx;

-- ─── Narrow writes to admin ──────────────────────────────────────────────────
-- The `organisation_id IS NOT NULL` clause stays load-bearing: without it any admin in any
-- organisation could rewrite the shared national card for every other tenant.

DROP POLICY IF EXISTS rate_cards_org_write ON public.rate_cards;
CREATE POLICY rate_cards_org_write ON public.rate_cards FOR ALL TO authenticated
  USING (organisation_id IS NOT NULL
         AND public.has_organisation_permission(organisation_id, 'admin'))
  WITH CHECK (organisation_id IS NOT NULL
         AND public.has_organisation_permission(organisation_id, 'admin'));

DROP POLICY IF EXISTS rate_card_items_org_write ON public.rate_card_items;
CREATE POLICY rate_card_items_org_write ON public.rate_card_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rate_cards card
    WHERE card.id = rate_card_id
      AND card.organisation_id IS NOT NULL
      AND public.has_organisation_permission(card.organisation_id, 'admin')))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.rate_cards card
    WHERE card.id = rate_card_id
      AND card.organisation_id IS NOT NULL
      AND public.has_organisation_permission(card.organisation_id, 'admin')));

-- The two _org_select policies are unchanged: every member reads the national card and their
-- own organisation's, which is what "national by default" needs.

GRANT SELECT ON TABLE public.rate_cards TO anon;
GRANT SELECT ON TABLE public.rate_card_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_cards TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_card_items TO authenticated, service_role;

-- ─── Commit a new version ────────────────────────────────────────────────────
-- One function, one transaction. A client-side sequence (retire, insert card, insert items)
-- that fails partway leaves the organisation with a retired card and no replacement — i.e. no
-- rates at all — or an active card holding half its items. supabase-js has no transaction API,
-- so this mirrors replace_adaptation_plan: SECURITY INVOKER, so the admin RLS policy above is
-- the real boundary and requireApiContext is only a friendlier error.
CREATE OR REPLACE FUNCTION public.commit_rate_card_version(
  target_organisation_id uuid,
  card_code text,
  card_label text,
  card_region_multiplier numeric,
  card_effective_from date,
  card_source_csv text,
  card_source_filename text,
  payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  next_version integer;
  new_card_id uuid;
  national_card_id uuid;
  unknown_codes text[];
  inserted integer;
BEGIN
  IF target_organisation_id IS NULL THEN
    RAISE EXCEPTION 'A rate card version must belong to an organisation';
  END IF;
  IF payload IS NULL OR jsonb_array_length(payload) = 0 THEN
    RAISE EXCEPTION 'A rate card version must contain at least one priced work item';
  END IF;

  -- One committer per lineage. Without it two admins racing both read the same MAX(version)
  -- and the loser fails on the unique index after doing all the work.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(target_organisation_id::text || ':' || card_code, 0));

  SELECT id INTO national_card_id
    FROM public.rate_cards
   WHERE organisation_id IS NULL AND is_active
   ORDER BY (code = 'national-indicative-2026-04') DESC, version DESC, created_at DESC
   LIMIT 1;
  IF national_card_id IS NULL THEN
    RAISE EXCEPTION 'No active national rate card to inherit from';
  END IF;

  -- An upload prices work the national card already defines; it cannot invent a work item.
  -- A new item would need rule mappings and field_patches nobody has validated, and the engine
  -- is never prompted with it, so it could never clear a rule anyway. Checked in TypeScript
  -- too, but this function is a public surface and TypeScript is not a security boundary.
  SELECT array_agg(DISTINCT codes.row_code) INTO unknown_codes
    FROM (SELECT r ->> 'work_item_code' AS row_code
            FROM jsonb_array_elements(payload) r) codes
   WHERE NOT EXISTS (
     SELECT 1 FROM public.rate_card_items national
      WHERE national.rate_card_id = national_card_id
        AND national.work_item_code = codes.row_code
        AND national.is_active);
  IF unknown_codes IS NOT NULL THEN
    RAISE EXCEPTION 'Unknown work item code(s): %', array_to_string(unknown_codes, ', ');
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
    FROM public.rate_cards
   WHERE organisation_id = target_organisation_id AND code = card_code;

  -- Retire first: rate_cards_one_active_per_scope_idx is checked per statement, not at commit.
  UPDATE public.rate_cards
     SET is_active = false,
         effective_to = GREATEST(effective_from, card_effective_from - 1),
         updated_at = now()
   WHERE organisation_id = target_organisation_id
     AND code = card_code
     AND is_active;

  INSERT INTO public.rate_cards (
    organisation_id, code, label, version, region_multiplier,
    effective_from, is_active, created_by, source_csv, source_filename)
  VALUES (
    target_organisation_id, card_code, card_label, next_version,
    COALESCE(card_region_multiplier, 1.000), card_effective_from, true,
    (SELECT auth.uid()), card_source_csv, card_source_filename)
  RETURNING id INTO new_card_id;

  -- The join IS the inheritance: prices and durations come from the upload, everything a
  -- classification depends on comes from the national row, copied by value so this version
  -- stays reproducible even after the national card is itself revised.
  INSERT INTO public.rate_card_items (
    rate_card_id, work_item_code, description, unit,
    rate_low_gbp, rate_expected_gbp, rate_high_gbp,
    duration_days_low, duration_days_expected, duration_days_high,
    difficulty, trades, addresses_rule_numbers, preconditions, field_patches,
    priority_hint, source_label)
  SELECT
    new_card_id, national.work_item_code, national.description, national.unit,
    (uploaded ->> 'rate_low_gbp')::integer,
    (uploaded ->> 'rate_expected_gbp')::integer,
    (uploaded ->> 'rate_high_gbp')::integer,
    COALESCE((uploaded ->> 'duration_days_low')::integer,      national.duration_days_low),
    COALESCE((uploaded ->> 'duration_days_expected')::integer, national.duration_days_expected),
    COALESCE((uploaded ->> 'duration_days_high')::integer,     national.duration_days_high),
    national.difficulty, national.trades, national.addresses_rule_numbers,
    national.preconditions, national.field_patches, national.priority_hint,
    COALESCE(NULLIF(uploaded ->> 'source_label', ''), card_label)
  FROM jsonb_array_elements(payload) uploaded
  JOIN public.rate_card_items national
    ON national.rate_card_id = national_card_id
   AND national.work_item_code = uploaded ->> 'work_item_code'
   AND national.is_active;

  GET DIAGNOSTICS inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'card_id', new_card_id, 'version', next_version, 'item_count', inserted);
END;
$$;

-- ─── Restore an earlier version ──────────────────────────────────────────────
-- Versioning without rollback is a museum. Same lock and same retire-then-activate ordering.
CREATE OR REPLACE FUNCTION public.activate_rate_card_version(target_card_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_org uuid;
  target_code text;
  target_version integer;
BEGIN
  SELECT organisation_id, code, version
    INTO target_org, target_code, target_version
    FROM public.rate_cards WHERE id = target_card_id;

  IF target_code IS NULL THEN
    RAISE EXCEPTION 'Rate card version not found';
  END IF;
  IF target_org IS NULL THEN
    RAISE EXCEPTION 'The national rate card cannot be activated or retired';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(target_org::text || ':' || target_code, 0));

  UPDATE public.rate_cards
     SET is_active = false,
         effective_to = COALESCE(effective_to, current_date),
         updated_at = now()
   WHERE organisation_id = target_org
     AND code = target_code
     AND is_active
     AND id <> target_card_id;

  UPDATE public.rate_cards
     SET is_active = true, effective_to = NULL, updated_at = now()
   WHERE id = target_card_id;

  RETURN jsonb_build_object('card_id', target_card_id, 'version', target_version);
END;
$$;

GRANT EXECUTE ON FUNCTION public.commit_rate_card_version(
  uuid, text, text, numeric, date, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_rate_card_version(uuid)
  TO authenticated, service_role;
