-- Replace the JSONB cost_estimation blob + global adaptation_catalogue with a
-- per-case schema. Each survey has 3 adoption plans (one per DFG budget tier),
-- and each plan has N bespoke adaptations. Re-estimate = delete plans for the
-- survey, cascade-clears adaptations, then re-insert.

DROP TRIGGER IF EXISTS surveys_touch_updated_at ON surveys;
DROP FUNCTION IF EXISTS touch_surveys_updated_at();

ALTER TABLE surveys DROP COLUMN IF EXISTS cost_estimation;
ALTER TABLE surveys DROP COLUMN IF EXISTS cost_estimation_updated_at;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TABLE IF EXISTS adaptation_catalogue;

CREATE OR REPLACE FUNCTION touch_surveys_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER surveys_touch_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION touch_surveys_updated_at();

CREATE TABLE cost_estimation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id BIGINT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  budget_gbp INT NOT NULL,

  -- Per-plan rollups
  total_cost_gbp INT NOT NULL DEFAULT 0,
  total_duration_days INT NOT NULL DEFAULT 0,
  overall_difficulty TEXT NOT NULL CHECK (overall_difficulty IN ('minor', 'moderate', 'major')),
  potential_band TEXT NOT NULL,

  -- Run metadata — duplicated across the 3 plans for one case. Tiny cost,
  -- saves a join and keeps the schema flat.
  current_band TEXT NOT NULL,
  overall_narrative TEXT NOT NULL DEFAULT '',
  reaches_band_a_at_30k BOOLEAN NOT NULL DEFAULT FALSE,
  rationale_if_not_band_a TEXT,
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
  gemini_model TEXT NOT NULL,
  budget_cap_gbp INT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Dropped candidates are short prose, never queried alone — JSONB array of
  -- { label, reason }.
  dropped_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,

  UNIQUE (survey_id, budget_gbp)
);

CREATE INDEX cost_estimation_plans_survey_id_idx ON cost_estimation_plans(survey_id);

CREATE TABLE cost_estimation_adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES cost_estimation_plans(id) ON DELETE CASCADE,
  position INT NOT NULL,
  label TEXT NOT NULL,
  addresses_rules INT[] NOT NULL DEFAULT '{}',
  cost_gbp INT NOT NULL,
  duration_days INT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('minor', 'moderate', 'major')),
  trades TEXT[] NOT NULL DEFAULT '{}',
  narrative TEXT,
  preconditions TEXT,
  visual_evidence_confidence NUMERIC(3, 2) CHECK (visual_evidence_confidence IS NULL OR visual_evidence_confidence BETWEEN 0 AND 1),
  field_patches JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (plan_id, position)
);

CREATE INDEX cost_estimation_adaptations_plan_id_idx ON cost_estimation_adaptations(plan_id);

ALTER TABLE cost_estimation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_estimation_adaptations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cost_estimation_plans_read_all"
  ON cost_estimation_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "cost_estimation_plans_write_all"
  ON cost_estimation_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "cost_estimation_adaptations_read_all"
  ON cost_estimation_adaptations FOR SELECT TO authenticated USING (true);
CREATE POLICY "cost_estimation_adaptations_write_all"
  ON cost_estimation_adaptations FOR ALL TO authenticated USING (true) WITH CHECK (true);
