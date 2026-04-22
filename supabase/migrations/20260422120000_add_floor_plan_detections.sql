-- Separate bucket for model-produced floor plan snapshots (keeps them distinct
-- from user-uploaded evidence).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('floor-plan-detections', 'floor-plan-detections', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload floor plan detections"
  ON storage.objects
  AS permissive
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'floor-plan-detections');

CREATE POLICY "Public can view floor plan detections"
  ON storage.objects
  AS permissive
  FOR SELECT
  TO public
  USING (bucket_id = 'floor-plan-detections');

-- Detection output persisted only when a survey is saved. One row per save per
-- survey (replaced on re-save, cascaded on survey delete).
CREATE TABLE "public"."floor_plan_detections" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "survey_id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "image_url" text NOT NULL,
  "image_id" text,
  "detection" jsonb NOT NULL,
  "scale_px_per_mm" numeric,
  "scale_confidence" numeric,
  "warnings" jsonb
);

ALTER TABLE "public"."floor_plan_detections" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX floor_plan_detections_pkey
  ON public.floor_plan_detections USING btree (id);

ALTER TABLE "public"."floor_plan_detections"
  ADD CONSTRAINT "floor_plan_detections_pkey"
  PRIMARY KEY USING INDEX "floor_plan_detections_pkey";

ALTER TABLE "public"."floor_plan_detections"
  ADD CONSTRAINT "floor_plan_detections_survey_id_fkey"
  FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."floor_plan_detections"
  VALIDATE CONSTRAINT "floor_plan_detections_survey_id_fkey";

CREATE INDEX floor_plan_detections_survey_id_idx
  ON public.floor_plan_detections USING btree (survey_id);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."floor_plan_detections" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."floor_plan_detections" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."floor_plan_detections" TO "postgres";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."floor_plan_detections" TO "service_role";

CREATE POLICY "Enable read access for all users"
  ON "public"."floor_plan_detections"
  AS permissive
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON "public"."floor_plan_detections"
  AS permissive
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
  ON "public"."floor_plan_detections"
  AS permissive
  FOR DELETE
  TO public
  USING (true);
