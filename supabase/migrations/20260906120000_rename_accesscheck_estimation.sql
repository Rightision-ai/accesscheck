-- Rename the built-in card: "national indicative" → "AccessCheck estimation".
--
-- "National indicative" overclaims. These figures are structurally tested but not price-checked
-- (see lib/rate-cards/accesscheckEstimation.ts), so calling them national implies an authority
-- they do not have — and the surveyor carrying the plan to a DFG panel is the one who would
-- have to defend that claim. "AccessCheck estimation" says whose estimate it is, which is what
-- makes the existing "— obtain quote" suffix read as intended.
--
-- Naming only. No price, no date and no schema changes: the code keeps its `-2026-04` suffix and
-- effective_from stays 2026-04-01, so nothing here implies a re-price.
--
-- Table and column names are deliberately untouched. `rate_cards` / `rate_card_items` are
-- internal; renaming them would churn every query, policy, RPC and generated type for no user
-- benefit. The user-facing term is "schedule of rates", and that lives in the UI.

UPDATE public.rate_cards
   SET code = 'accesscheck-estimation-2026-04',
       label = 'AccessCheck estimation — obtain quote',
       updated_at = now()
 WHERE organisation_id IS NULL
   AND code = 'national-indicative-2026-04';

ALTER TABLE public.rate_card_items
  ALTER COLUMN source_label SET DEFAULT 'AccessCheck estimation — obtain quote';

UPDATE public.rate_card_items
   SET source_label = 'AccessCheck estimation — obtain quote',
       updated_at = now()
 WHERE source_label = 'National indicative — obtain quote';

-- Plans store the label by value, so historical plans would keep rendering the old name in the
-- report appendix and the "priced from" line unless they are rewritten too.
ALTER TABLE public.adaptation_plans
  ALTER COLUMN rate_card_label SET DEFAULT 'AccessCheck estimation — obtain quote';

-- Matched on the card, not on the stored string. Plans carry whatever label the card held when
-- they were generated, and the local database already holds a plan saying plain "National
-- indicative" — an exact-string rewrite silently skips it and the old name survives in the PDF.
-- Keying on `rate_card_id` catches every past wording while leaving an authority's own label
-- alone, which is the line that must not be rewritten.
UPDATE public.adaptation_plans p
   SET rate_card_label = 'AccessCheck estimation — obtain quote'
  FROM public.rate_cards c
 WHERE p.rate_card_id = c.id
   AND c.organisation_id IS NULL;

UPDATE public.adaptation_plans
   SET rate_card_label = 'AccessCheck estimation — obtain quote'
 WHERE rate_card_id IS NULL
   AND rate_card_label IN ('National indicative — obtain quote', 'National indicative');

-- Every plan LINE carries its own provenance in `cost_basis`, rendered as "Priced from: …" on
-- the tier detail and in the report appendix. Lines are the finer-grained copy of the same
-- label — an inherited line names the estimation while the org-priced line beside it names the
-- authority — so they need the same treatment, keyed on the same card id.
UPDATE public.adaptation_plan_lines
   SET cost_basis = jsonb_set(
         cost_basis,
         '{rateCardLabel}',
         '"AccessCheck estimation — obtain quote"'::jsonb)
 WHERE cost_basis ? 'rateCardLabel'
   AND (
     cost_basis ->> 'rateCardId' IS NULL
     OR EXISTS (
       SELECT 1 FROM public.rate_cards c
        WHERE c.id = (cost_basis ->> 'rateCardId')::uuid
          AND c.organisation_id IS NULL));

-- ─── Recreate the two functions that hard-code the old strings ───────────────
-- Neither would error if left alone, which is what makes them worth calling out:
-- `commit_rate_card_version` would silently lose its preferred-card tiebreak and degrade to
-- "highest version wins", and `replace_adaptation_plan` would write the old label back onto any
-- plan whose payload omitted one. Bodies are otherwise verbatim from
-- 20260902120000_rate_card_versioning.sql and 20260901120100_replace_cost_estimation_plans.sql.

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
  estimation_card_id uuid;
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

  SELECT id INTO estimation_card_id
    FROM public.rate_cards
   WHERE organisation_id IS NULL AND is_active
   ORDER BY (code = 'accesscheck-estimation-2026-04') DESC, version DESC, created_at DESC
   LIMIT 1;
  IF estimation_card_id IS NULL THEN
    RAISE EXCEPTION 'No active AccessCheck estimation card to inherit from';
  END IF;

  -- An upload prices work the estimation card already defines; it cannot invent a work item.
  -- A new item would need rule mappings and field_patches nobody has validated, and the engine
  -- is never prompted with it, so it could never clear a rule anyway. Checked in TypeScript
  -- too, but this function is a public surface and TypeScript is not a security boundary.
  SELECT array_agg(DISTINCT codes.row_code) INTO unknown_codes
    FROM (SELECT r ->> 'work_item_code' AS row_code
            FROM jsonb_array_elements(payload) r) codes
   WHERE NOT EXISTS (
     SELECT 1 FROM public.rate_card_items estimation
      WHERE estimation.rate_card_id = estimation_card_id
        AND estimation.work_item_code = codes.row_code
        AND estimation.is_active);
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
  -- classification depends on comes from the estimation row, copied by value so this version
  -- stays reproducible even after the estimation card is itself revised.
  INSERT INTO public.rate_card_items (
    rate_card_id, work_item_code, description, unit,
    rate_low_gbp, rate_expected_gbp, rate_high_gbp,
    duration_days_low, duration_days_expected, duration_days_high,
    difficulty, trades, addresses_rule_numbers, preconditions, field_patches,
    priority_hint, source_label)
  SELECT
    new_card_id, estimation.work_item_code, estimation.description, estimation.unit,
    (uploaded ->> 'rate_low_gbp')::integer,
    (uploaded ->> 'rate_expected_gbp')::integer,
    (uploaded ->> 'rate_high_gbp')::integer,
    COALESCE((uploaded ->> 'duration_days_low')::integer,      estimation.duration_days_low),
    COALESCE((uploaded ->> 'duration_days_expected')::integer, estimation.duration_days_expected),
    COALESCE((uploaded ->> 'duration_days_high')::integer,     estimation.duration_days_high),
    estimation.difficulty, estimation.trades, estimation.addresses_rule_numbers,
    estimation.preconditions, estimation.field_patches, estimation.priority_hint,
    COALESCE(NULLIF(uploaded ->> 'source_label', ''), card_label)
  FROM jsonb_array_elements(payload) uploaded
  JOIN public.rate_card_items estimation
    ON estimation.rate_card_id = estimation_card_id
   AND estimation.work_item_code = uploaded ->> 'work_item_code'
   AND estimation.is_active;

  GET DIAGNOSTICS inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'card_id', new_card_id, 'version', next_version, 'item_count', inserted);
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_adaptation_plan(
  target_survey_id bigint,
  target_organisation_id uuid,
  payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  tier jsonb;
  line jsonb;
  new_plan_id uuid;
  line_position integer;
BEGIN
  DELETE FROM public.adaptation_plans WHERE survey_id = target_survey_id;

  FOR tier IN SELECT * FROM jsonb_array_elements(payload -> 'tiers')
  LOOP
    INSERT INTO public.adaptation_plans (
      survey_id, organisation_id, budget_gbp,
      total_cost_low_gbp, total_cost_expected_gbp, total_cost_high_gbp,
      total_duration_days, overall_difficulty, potential_band, current_band,
      rules_cleared, rules_remaining, unavailable_reason,
      overall_narrative, reaches_band_a_at_30k, rationale_if_not_band_a,
      additional_works, dropped_candidates, engine_model, budget_cap_gbp,
      rate_card_id, rate_card_label, rate_card_effective_from, generated_at
    ) VALUES (
      target_survey_id, target_organisation_id, (tier ->> 'budgetGbp')::integer,
      (tier #>> '{totalCost,lowGbp}')::integer,
      (tier #>> '{totalCost,expectedGbp}')::integer,
      (tier #>> '{totalCost,highGbp}')::integer,
      (tier ->> 'totalDurationDays')::integer,
      tier ->> 'overallDifficulty',
      tier ->> 'potentialBand',
      payload ->> 'currentBand',
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(tier -> 'rulesCleared'))::integer[], '{}'),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(tier -> 'rulesRemaining'))::integer[], '{}'),
      tier ->> 'unavailableReason',
      COALESCE(payload ->> 'overallNarrative', ''),
      COALESCE((payload ->> 'reachesBandAAt30k')::boolean, false),
      payload ->> 'rationaleIfNotBandA',
      COALESCE(payload -> 'additionalWorks', '[]'::jsonb),
      COALESCE(tier -> 'droppedCandidates', '[]'::jsonb),
      payload ->> 'engineModel',
      (payload ->> 'budgetCapGbp')::integer,
      NULLIF(payload ->> 'rateCardId', '')::uuid,
      COALESCE(payload ->> 'rateCardLabel', 'AccessCheck estimation — obtain quote'),
      NULLIF(payload ->> 'rateCardEffectiveFrom', '')::date,
      COALESCE((payload ->> 'generatedAt')::timestamptz, now())
    )
    RETURNING id INTO new_plan_id;

    line_position := 0;
    FOR line IN SELECT * FROM jsonb_array_elements(tier -> 'lines')
    LOOP
      INSERT INTO public.adaptation_plan_lines (
        plan_id, position, candidate_id, label, addresses_rules,
        cost_low_gbp, cost_expected_gbp, cost_high_gbp, cost_basis,
        duration_days, difficulty, trades, narrative, preconditions,
        confidence, confidence_basis, verify_on_site, verify_note,
        feasibility, depends_on, field_patches, is_inherited, selection_reason, source
      ) VALUES (
        new_plan_id, line_position, line ->> 'id', line ->> 'label',
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(line -> 'addressesRules'))::integer[], '{}'),
        (line #>> '{cost,lowGbp}')::integer,
        (line #>> '{cost,expectedGbp}')::integer,
        (line #>> '{cost,highGbp}')::integer,
        COALESCE(line -> 'costBasis', '{}'::jsonb),
        (line ->> 'durationDays')::integer,
        line ->> 'difficulty',
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(line -> 'trades')), '{}'),
        line ->> 'narrative',
        line ->> 'preconditions',
        (line #>> '{confidence,score}')::numeric,
        COALESCE(line #>> '{confidence,basis}', 'rate_card_match'),
        COALESCE((line #>> '{confidence,verifyOnSite}')::boolean, false),
        line #>> '{confidence,verifyNote}',
        COALESCE(line ->> 'feasibility', 'feasible'),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(line -> 'dependsOn')), '{}'),
        COALESCE(line -> 'fieldPatches', '{}'::jsonb),
        COALESCE((line ->> 'isInherited')::boolean, false),
        COALESCE(line ->> 'selectionReason', ''),
        COALESCE(line ->> 'source', 'ai_suggested')
      );
      line_position := line_position + 1;
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_adaptation_plan(bigint, uuid, jsonb)
  TO authenticated, service_role;

-- `activate_rate_card_version` raises two messages that the activate route hands straight back
-- to the admin (it returns `error.message` verbatim), so they are user-facing copy. Body is
-- otherwise verbatim from 20260902120100_fix_activate_rate_card_effective_to.sql, GREATEST clamp
-- included.
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
    RAISE EXCEPTION 'Schedule of rates version not found';
  END IF;
  IF target_org IS NULL THEN
    RAISE EXCEPTION 'The AccessCheck estimation cannot be activated or retired';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(target_org::text || ':' || target_code, 0));

  UPDATE public.rate_cards
     SET is_active = false,
         -- GREATEST, not COALESCE: a version starting in the future must not retire before it
         -- began.
         effective_to = GREATEST(effective_from, COALESCE(effective_to, current_date)),
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

GRANT EXECUTE ON FUNCTION public.activate_rate_card_version(uuid)
  TO authenticated, service_role;
