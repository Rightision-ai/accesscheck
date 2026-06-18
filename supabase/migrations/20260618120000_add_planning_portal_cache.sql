-- Self-hosted planning-portal floor-plan discovery + cache.
--
-- Replaces sole reliance on PlanIt with direct-to-council portal search (Idox first), backed by a
-- shared Postgres cache so repeat/nearby lookups are instant and we accumulate our own dataset.
--
-- These four tables are SHARED reference/cache data (no user_id): public planning records, not
-- per-user. Following the adaptation_catalogue precedent (20260424120000): RLS enabled, authenticated
-- read-only (USING(true)), NO client write policy — writes happen only via the service-role key
-- (createServiceClient(), bypasses RLS) in the floor-plan harvester. Grants follow
-- 20260529120000_standardize_data_api_grants.sql.

-- ---------------------------------------------------------------------------
-- council_portals — registry of councils whose planning portal we can search directly.
-- Keyed by GSS code (= properties.local_authority_code = Postcodes.io codes.admin_district), with
-- lpa_name kept for name-based fallback resolution and for seeds sourced by name (code backfilled later).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.council_portals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lpa_code    text,                       -- GSS code, e.g. 'E09000007'; nullable until backfilled
  lpa_name    text NOT NULL,              -- e.g. 'Camden'
  software    text NOT NULL CHECK (software IN ('idox', 'northgate', 'other')),
  base_url    text NOT NULL,              -- host owning /online-applications/, e.g. 'https://idox.camden.gov.uk'
  search_path text NOT NULL DEFAULT '/online-applications/search.do',
  enabled     boolean NOT NULL DEFAULT true,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Partial unique: one row per GSS code, but allow multiple NULL codes during bootstrap.
CREATE UNIQUE INDEX IF NOT EXISTS council_portals_lpa_code_key
  ON public.council_portals (lpa_code) WHERE lpa_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS council_portals_lpa_name_idx
  ON public.council_portals (lower(lpa_name));

DROP TRIGGER IF EXISTS trg_council_portals_updated_at ON public.council_portals;
CREATE TRIGGER trg_council_portals_updated_at BEFORE UPDATE ON public.council_portals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.council_portals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "council_portals_read_all" ON public.council_portals;
CREATE POLICY "council_portals_read_all"
  ON public.council_portals FOR SELECT TO authenticated USING (true);

REVOKE ALL ON TABLE public.council_portals FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public.council_portals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.council_portals TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- planning_applications — shared accumulating index of discovered applications (postcode-area level).
-- One portal search returns all apps in a postcode, reused by every address in it. Fallback rows
-- (PlanIt/PlanWire) with no GSS code use a synthetic lpa_code ('planit:'||council) so the unique
-- constraint still dedupes (Postgres treats NULLs as distinct).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planning_applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lpa_code            text,
  council             text,
  reference           text NOT NULL,
  address             text,
  postcode_normalised text,
  description         text,
  app_type            text,
  application_url     text,
  docs_url            text,
  software            text,                -- 'idox' | 'northgate' | 'planit' | 'planwire' | 'other'
  n_documents         integer,
  raw                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at       timestamptz NOT NULL DEFAULT now(),
  last_checked_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lpa_code, reference)
);

CREATE INDEX IF NOT EXISTS planning_applications_postcode_idx
  ON public.planning_applications (postcode_normalised);
CREATE INDEX IF NOT EXISTS planning_applications_lpa_idx
  ON public.planning_applications (lpa_code);

ALTER TABLE public.planning_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "planning_applications_read_all" ON public.planning_applications;
CREATE POLICY "planning_applications_read_all"
  ON public.planning_applications FOR SELECT TO authenticated USING (true);

REVOKE ALL ON TABLE public.planning_applications FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public.planning_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.planning_applications TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- planning_application_documents — per-application plan/elevation docs. stored_path holds the cached
-- PDF object path in the planning-docs bucket (set by the background storePlanDocs task).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planning_application_documents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.planning_applications(id) ON DELETE CASCADE,
  description    text,
  doc_url        text NOT NULL,
  doc_kind       text,                     -- 'floor_plan' | 'elevation' | 'site' | 'other'
  stored_path    text,                     -- planning-docs bucket object path (nullable)
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, doc_url)
);

CREATE INDEX IF NOT EXISTS planning_application_documents_app_idx
  ON public.planning_application_documents (application_id);

ALTER TABLE public.planning_application_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "planning_application_documents_read_all" ON public.planning_application_documents;
CREATE POLICY "planning_application_documents_read_all"
  ON public.planning_application_documents FOR SELECT TO authenticated USING (true);

REVOKE ALL ON TABLE public.planning_application_documents FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public.planning_application_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.planning_application_documents TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- planning_searches — per-postcode discovery freshness (the cache key). Distinguishes
-- "searched, found none" (ok/0) from "never searched" (no row) from "no portal known"/"error".
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planning_searches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  postcode_normalised text NOT NULL UNIQUE,
  lpa_code            text,
  source              text NOT NULL CHECK (source IN ('idox', 'northgate', 'planwire', 'planit', 'none')),
  status              text NOT NULL CHECK (status IN ('ok', 'no_portal', 'error')),
  application_count   integer NOT NULL DEFAULT 0,
  error               text,
  searched_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planning_searches_lpa_idx ON public.planning_searches (lpa_code);

ALTER TABLE public.planning_searches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "planning_searches_read_all" ON public.planning_searches;
CREATE POLICY "planning_searches_read_all"
  ON public.planning_searches FOR SELECT TO authenticated USING (true);

REVOKE ALL ON TABLE public.planning_searches FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public.planning_searches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.planning_searches TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Seed: initial Idox councils. base_url is the host owning /online-applications/. lpa_code is left
-- NULL where not yet verified; the runtime name-fallback resolves these and backfills the GSS code
-- the first time a real property matches. Probe before enabling new entries (see plan / Seeding).
-- ---------------------------------------------------------------------------
INSERT INTO public.council_portals (lpa_code, lpa_name, software, base_url, notes) VALUES
  ('E09000007', 'Camden',                 'idox', 'https://accountforms.camden.gov.uk',   'seed v1'),
  ('E09000022', 'Lambeth',                'idox', 'https://planning.lambeth.gov.uk',       'seed v1'),
  ('E09000032', 'Wandsworth',             'idox', 'https://planning.wandsworth.gov.uk',    'seed v1'),
  ('E09000013', 'Hammersmith and Fulham', 'idox', 'https://public-access.lbhf.gov.uk',     'seed v1'),
  ('E09000020', 'Kensington and Chelsea', 'idox', 'https://www.rbkc.gov.uk',               'seed v1; verify base'),
  ('E09000033', 'Westminster',            'idox', 'https://idoxpa.westminster.gov.uk',     'seed v1'),
  ('E09000019', 'Islington',              'idox', 'https://planning.islington.gov.uk',     'seed v1'),
  ('E09000012', 'Hackney',                'idox', 'https://developmentandhousing.hackney.gov.uk', 'seed v1'),
  ('E09000009', 'Ealing',                 'idox', 'https://pam.ealing.gov.uk',              'verified: simple search returns results'),
  ('E08000025', 'Birmingham',             'northgate', 'https://eplanning.birmingham.gov.uk', 'Northgate PlanningExplorer — no direct search adapter yet; discovery via PlanIt'),
  ('E08000003', 'Manchester',             'idox', 'https://pa.manchester.gov.uk',          'seed v1'),
  ('E08000035', 'Leeds',                  'idox', 'https://publicaccess.leeds.gov.uk',     'seed v1'),
  ('E06000023', 'Bristol',                'idox', 'https://pa.bristol.gov.uk',             'seed v1'),
  ('E08000012', 'Liverpool',              'idox', 'https://lar.liverpool.gov.uk',          'seed v1; verify base'),
  ('E06000018', 'Nottingham',             'idox', 'https://publicaccess.nottinghamcity.gov.uk', 'seed v1'),
  ('E07000178', 'Oxford',                 'idox', 'https://public.oxford.gov.uk',          'seed v1; verify base'),
  ('E07000008', 'Cambridge',              'idox', 'https://applications.greatercambridgeplanning.org', 'seed v1; verify base'),
  ('E06000043', 'Brighton and Hove',      'idox', 'https://planningapps.brighton-hove.gov.uk', 'seed v1'),
  ('E08000019', 'Sheffield',              'idox', 'https://planningapps.sheffield.gov.uk',  'seed v1; verify base'),
  ('E09000003', 'Barnet',                 'idox', 'https://publicaccess.barnet.gov.uk',     'seed v1'),
  ('E09000027', 'Richmond upon Thames',   'idox', 'https://www2.richmond.gov.uk',          'base unverified — www2 host has no Idox simple-search form; falls back to PlanIt until confirmed')
ON CONFLICT (lpa_code) WHERE lpa_code IS NOT NULL DO UPDATE
  SET lpa_name = EXCLUDED.lpa_name, software = EXCLUDED.software,
      base_url = EXCLUDED.base_url, notes = EXCLUDED.notes, updated_at = now();
