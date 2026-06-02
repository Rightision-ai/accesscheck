-- Evidence Harvester feature.
--
-- Lets a user upload a CSV of properties (address + postcode) and enrich each one with
-- public/internal evidence (postcode geography, EPC/UPRN, listing history, exterior Street View),
-- then compute a per-property evidence readiness status, confidence, AccessCheck question mapping,
-- and missing-evidence checklist.
--
-- Adaptation notes vs the original spec:
--   * The spec assumed FastAPI/Redis and `council_id` multi-tenancy. This app is single-user
--     (Supabase Auth), so every table is scoped by `user_id uuid -> auth.users(id)`. A nullable
--     `council_id text` is kept for future multi-tenant use.
--   * Strict owner RLS is used here (auth.uid() = user_id) — deliberately NOT the permissive
--     `using (true)` policy the surveys table carries, which would leak property lists across users.
--   * Grants follow supabase/migrations/20260529120000_standardize_data_api_grants.sql:
--     anon -> SELECT; authenticated, service_role -> SELECT, INSERT, UPDATE, DELETE.
--   * The background harvest worker uses the service-role key (bypasses RLS) and sets user_id
--     explicitly on every insert.

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  council_id text,
  property_ref text,
  uprn text,
  uprn_source text,
  address text NOT NULL,
  postcode text NOT NULL,
  postcode_normalised text,
  latitude double precision,
  longitude double precision,
  local_authority text,
  local_authority_code text,
  region text,
  ward text,
  bedrooms integer,
  floor_level text,
  property_type text,
  known_adaptations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS properties_user_id_idx ON properties (user_id);
CREATE INDEX IF NOT EXISTS properties_postcode_normalised_idx ON properties (postcode_normalised);
CREATE INDEX IF NOT EXISTS properties_uprn_idx ON properties (uprn);

-- ---------------------------------------------------------------------------
-- harvest_jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS harvest_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  council_id text,
  uploaded_file_url text,          -- private bucket object path; signed URL is generated on read
  original_filename text,
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  job_status jsonb,                -- granular after() worker status: {status,startedAt,finishedAt,error,step}
  total_properties integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  error_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS harvest_jobs_user_id_created_idx ON harvest_jobs (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- harvest_job_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS harvest_job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- denormalized for simple RLS
  job_id uuid NOT NULL REFERENCES harvest_jobs(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  row_number integer,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS harvest_job_items_job_id_idx ON harvest_job_items (job_id);
CREATE INDEX IF NOT EXISTS harvest_job_items_job_status_idx ON harvest_job_items (job_id, status);
CREATE INDEX IF NOT EXISTS harvest_job_items_property_id_idx ON harvest_job_items (property_id);

-- ---------------------------------------------------------------------------
-- evidence_sources
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  source_type text NOT NULL,   -- postcodes_io | epc | google_street_view | land_registry |
                               -- listing_portal | planning_portal | internal_record |
                               -- manual_upload | cbl_advert | similar_property_inference
  source_name text,
  source_url text,
  source_date text,
  external_reference text,
  raw_metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_sources_property_id_idx ON evidence_sources (property_id);
CREATE INDEX IF NOT EXISTS evidence_sources_property_source_idx ON evidence_sources (property_id, source_type);

-- ---------------------------------------------------------------------------
-- property_features
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  evidence_source_id uuid REFERENCES evidence_sources(id) ON DELETE SET NULL,
  feature_name text NOT NULL,
  feature_value jsonb NOT NULL,
  source_type text,
  confidence numeric,
  inferred boolean NOT NULL DEFAULT false,
  justification text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_features_property_id_idx ON property_features (property_id);
CREATE INDEX IF NOT EXISTS property_features_property_name_idx ON property_features (property_id, feature_name);

-- ---------------------------------------------------------------------------
-- property_listings  (sale/rent history with source attribution; no valuation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  evidence_source_id uuid REFERENCES evidence_sources(id) ON DELETE SET NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('sale', 'rent')),
  event_date date,
  price_gbp numeric,           -- sale price (Land Registry) or asking rent (configured provider)
  status text,                 -- e.g. sold | let | listed
  source_name text,            -- e.g. "HM Land Registry"
  source_url text,             -- the post/record URL where available
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_listings_property_id_idx ON property_listings (property_id);
CREATE INDEX IF NOT EXISTS property_listings_property_type_idx ON property_listings (property_id, listing_type);

-- ---------------------------------------------------------------------------
-- property_assessment_status
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_assessment_status (
  property_id uuid PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_status text NOT NULL CHECK (
    evidence_status IN (
      'auto_assessable', 'exterior_only', 'data_enriched_only',
      'needs_manual_survey', 'no_useful_evidence'
    )
  ),
  assessment_readiness text NOT NULL,
  overall_confidence numeric,
  missing_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  question_mapping jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_action text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_assessment_status_readiness_idx
  ON property_assessment_status (user_id, assessment_readiness);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse the existing public.update_updated_at() function)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_properties_updated_at ON properties;
CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_harvest_jobs_updated_at ON harvest_jobs;
CREATE TRIGGER trg_harvest_jobs_updated_at BEFORE UPDATE ON harvest_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_harvest_job_items_updated_at ON harvest_job_items;
CREATE TRIGGER trg_harvest_job_items_updated_at BEFORE UPDATE ON harvest_job_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_property_assessment_status_updated_at ON property_assessment_status;
CREATE TRIGGER trg_property_assessment_status_updated_at BEFORE UPDATE ON property_assessment_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: strict owner-only policies on every table
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'properties', 'harvest_jobs', 'harvest_job_items', 'evidence_sources',
    'property_features', 'property_listings', 'property_assessment_status'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_select_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);',
      t || '_select_own', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_insert_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);',
      t || '_insert_own', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_update_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);',
      t || '_update_own', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_delete_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);',
      t || '_delete_own', t);

    -- Standardized Data API grants (matches 20260529120000_standardize_data_api_grants.sql).
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated, service_role;', t);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated, service_role;', t);
  END LOOP;
END $$;
