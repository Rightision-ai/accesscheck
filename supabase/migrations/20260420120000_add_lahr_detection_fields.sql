-- LAHR detection v2: ramp type enums, per-field provenance, per-image annotations.

-- Ramp type enums (straight / dog-leg / switchback / etc.).
-- Text-typed to keep the catalogue editable from app-side without migrations.
ALTER TABLE surveys
ADD COLUMN IF NOT EXISTS communal_ramp_type TEXT,
ADD COLUMN IF NOT EXISTS property_ramp_type TEXT,
ADD COLUMN IF NOT EXISTS second_exit_ramp_type TEXT;

-- Per-field provenance: { [field_name]: { source, confidence, evidence_bbox, evidence_image_id, unit } }
-- source ∈ 'yolo' | 'sam' | 'ocr' | 'llm' | 'user'.
ALTER TABLE surveys
ADD COLUMN IF NOT EXISTS ai_field_provenance JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Per-image detection annotations, rendered as overlays on the report's uploaded images.
CREATE TABLE IF NOT EXISTS survey_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id BIGINT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  evidence_id UUID REFERENCES survey_evidences(id) ON DELETE CASCADE,
  image_kind TEXT NOT NULL CHECK (image_kind IN ('floor_plan', 'photo')),
  object_class TEXT NOT NULL,
  label TEXT NOT NULL,
  value_text TEXT,
  bbox JSONB NOT NULL,
  polygon JSONB,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  criterion_id TEXT,
  color TEXT,
  source TEXT NOT NULL CHECK (source IN ('yolo', 'sam', 'ocr', 'llm', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS survey_annotations_survey_idx ON survey_annotations(survey_id);
CREATE INDEX IF NOT EXISTS survey_annotations_evidence_idx ON survey_annotations(evidence_id);
CREATE INDEX IF NOT EXISTS survey_annotations_criterion_idx ON survey_annotations(criterion_id);

ALTER TABLE survey_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "survey_annotations_select_own"
  ON survey_annotations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM surveys s WHERE s.id = survey_annotations.survey_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "survey_annotations_insert_own"
  ON survey_annotations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM surveys s WHERE s.id = survey_annotations.survey_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "survey_annotations_update_own"
  ON survey_annotations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM surveys s WHERE s.id = survey_annotations.survey_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "survey_annotations_delete_own"
  ON survey_annotations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM surveys s WHERE s.id = survey_annotations.survey_id AND s.user_id = auth.uid()
  ));
