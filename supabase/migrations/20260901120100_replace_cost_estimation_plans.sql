-- Phase 1 candidate-pool refactor: replace the cost-estimation plan tables.
--
-- Existing plans are DISCARDED, not migrated. They were produced by the deleted per-tier
-- generation path (buildTier + enforceCumulativeTiers), so their cumulativity and potential_band
-- are the artefacts this refactor exists to fix. They also carry a point cost with no
-- provenance and a single plan-level confidence, and there is no honest way to split either
-- into the per-line range and per-line confidence the new shape requires — inventing one would
-- be exactly the fabricated precision the change is meant to remove.
--
-- Every plan surface auto-regenerates when nothing is stored, and a one-off backfill script
-- (scripts/backfill-adaptation-plans.ts) repopulates the estate in a rate-limited pass.
--
-- Note the tables are renamed as well as reshaped: `adaptation_plans` / `adaptation_plan_lines`
-- match the product noun. `surveys.cost_estimation_status` deliberately keeps its old name —
-- renaming it means rewriting touch_surveys_updated_at(), which hardcodes the column in a
-- `to_jsonb(NEW) - '…'` expression, and a silent miss there reintroduces the false-stale
-- "Re-assess" banner for no user-visible gain.

DROP TABLE IF EXISTS public.cost_estimation_adaptations;
DROP TABLE IF EXISTS public.cost_estimation_plans;

CREATE TABLE IF NOT EXISTS public.adaptation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id bigint NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  budget_gbp integer NOT NULL,
  total_cost_low_gbp integer NOT NULL DEFAULT 0,
  total_cost_expected_gbp integer NOT NULL DEFAULT 0,
  total_cost_high_gbp integer NOT NULL DEFAULT 0,
  total_duration_days integer NOT NULL DEFAULT 0,
  overall_difficulty text NOT NULL CHECK (overall_difficulty IN ('minor', 'moderate', 'major')),
  potential_band text NOT NULL,
  current_band text NOT NULL,
  rules_cleared integer[] NOT NULL DEFAULT '{}',
  rules_remaining integer[] NOT NULL DEFAULT '{}',
  unavailable_reason text,
  -- Run-level metadata, duplicated across the three tier rows so a single select rehydrates
  -- the whole plan set.
  overall_narrative text NOT NULL DEFAULT '',
  reaches_band_a_at_30k boolean NOT NULL DEFAULT false,
  rationale_if_not_band_a text,
  additional_works jsonb NOT NULL DEFAULT '[]'::jsonb,
  dropped_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  engine_model text NOT NULL,
  budget_cap_gbp integer NOT NULL,
  rate_card_id uuid REFERENCES public.rate_cards(id) ON DELETE SET NULL,
  rate_card_label text NOT NULL DEFAULT 'National indicative — obtain quote',
  rate_card_effective_from date,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, budget_gbp),
  CONSTRAINT adaptation_plans_cost_order_check
    CHECK (total_cost_low_gbp <= total_cost_expected_gbp
           AND total_cost_expected_gbp <= total_cost_high_gbp)
);

CREATE INDEX IF NOT EXISTS adaptation_plans_survey_idx
  ON public.adaptation_plans (survey_id);

CREATE TABLE IF NOT EXISTS public.adaptation_plan_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.adaptation_plans(id) ON DELETE CASCADE,
  position integer NOT NULL,
  candidate_id text NOT NULL,
  label text NOT NULL,
  addresses_rules integer[] NOT NULL DEFAULT '{}',
  cost_low_gbp integer NOT NULL,
  cost_expected_gbp integer NOT NULL,
  cost_high_gbp integer NOT NULL,
  cost_basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_days integer NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('minor', 'moderate', 'major')),
  trades text[] NOT NULL DEFAULT '{}',
  narrative text,
  preconditions text,
  confidence numeric(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  confidence_basis text NOT NULL DEFAULT 'rate_card_match'
    CHECK (confidence_basis IN ('rate_card_match', 'model_estimate')),
  verify_on_site boolean NOT NULL DEFAULT false,
  verify_note text,
  feasibility text NOT NULL DEFAULT 'feasible'
    CHECK (feasibility IN ('feasible', 'conditional')),
  depends_on text[] NOT NULL DEFAULT '{}',
  -- Persisted even though it comes from the rate card, so a plan stays reproducible after the
  -- card is edited or an authority uploads its own.
  field_patches jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- The UI has rendered a "Carried over" pill against this since the first release, but the
  -- old schema had no column for it, so it never survived a page reload.
  is_inherited boolean NOT NULL DEFAULT false,
  selection_reason text NOT NULL DEFAULT '',
  -- Phase 2 turns these on; carried now so editing needs no further migration.
  source text NOT NULL DEFAULT 'ai_suggested'
    CHECK (source IN ('ai_suggested', 'professional_amended', 'professional_added')),
  UNIQUE (plan_id, position),
  CONSTRAINT adaptation_plan_lines_cost_order_check
    CHECK (cost_low_gbp <= cost_expected_gbp AND cost_expected_gbp <= cost_high_gbp)
);

CREATE INDEX IF NOT EXISTS adaptation_plan_lines_plan_idx
  ON public.adaptation_plan_lines (plan_id);

GRANT SELECT ON TABLE public.adaptation_plans TO anon;
GRANT SELECT ON TABLE public.adaptation_plan_lines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.adaptation_plans
  TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.adaptation_plan_lines
  TO authenticated, service_role;

ALTER TABLE public.adaptation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptation_plan_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS adaptation_plans_org_select ON public.adaptation_plans;
CREATE POLICY adaptation_plans_org_select ON public.adaptation_plans FOR SELECT TO authenticated
  USING (public.is_organisation_member(organisation_id));

DROP POLICY IF EXISTS adaptation_plans_org_write ON public.adaptation_plans;
CREATE POLICY adaptation_plans_org_write ON public.adaptation_plans FOR ALL TO authenticated
  USING (public.has_organisation_permission(organisation_id, 'author'))
  WITH CHECK (public.has_organisation_permission(organisation_id, 'author'));

DROP POLICY IF EXISTS adaptation_plan_lines_org_select ON public.adaptation_plan_lines;
CREATE POLICY adaptation_plan_lines_org_select ON public.adaptation_plan_lines
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.adaptation_plans plan
    WHERE plan.id = plan_id AND public.is_organisation_member(plan.organisation_id)));

DROP POLICY IF EXISTS adaptation_plan_lines_org_write ON public.adaptation_plan_lines;
CREATE POLICY adaptation_plan_lines_org_write ON public.adaptation_plan_lines
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.adaptation_plans plan
    WHERE plan.id = plan_id
      AND public.has_organisation_permission(plan.organisation_id, 'author')))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.adaptation_plans plan
    WHERE plan.id = plan_id
      AND public.has_organisation_permission(plan.organisation_id, 'author')));

-- Clear the job status of any survey whose plan we just dropped, so the UI shows "not
-- generated" rather than polling forever for a result that no longer exists.
UPDATE public.surveys SET cost_estimation_status = NULL
WHERE cost_estimation_status IS NOT NULL;

-- ─── Atomic replace ──────────────────────────────────────────────────────────
-- The old repository did delete-then-insert across four round trips with no transaction, so a
-- failure partway left a survey with some tiers persisted and some missing, and the UI would
-- render that partial plan as if it were complete. One function, one statement, one transaction.
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
      COALESCE(payload ->> 'rateCardLabel', 'National indicative — obtain quote'),
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
