-- Exact-address geocoding.
--
-- properties.latitude/longitude hold the POSTCODE CENTROID (Postcodes.io) — fine for area context but
-- wrong for the property entrance, so Street View / static map / exterior-vision can show the wrong
-- building. Add address-level coordinates (Google Geocoding) used for imagery, plus a shared geocode
-- cache to avoid re-billing Google for the same address at scale.

-- Address-level location of the selected property (rooftop when available). latitude/longitude keep
-- their existing postcode-centroid meaning.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS address_latitude  double precision,
  ADD COLUMN IF NOT EXISTS address_longitude double precision,
  ADD COLUMN IF NOT EXISTS geocode_source    text,        -- 'google'
  ADD COLUMN IF NOT EXISTS geocode_precision text;         -- Google location_type: ROOFTOP | RANGE_INTERPOLATED | GEOMETRIC_CENTER | APPROXIMATE

-- ---------------------------------------------------------------------------
-- address_geocodes — shared geocode cache (no user_id). Keyed by UPRN when known, else a normalised
-- address|postcode key. Read-only to authenticated; service-role writes only (same shape as the
-- planning cache tables / adaptation_catalogue).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.address_geocodes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_key       text NOT NULL UNIQUE,    -- 'uprn:100023...' or 'addr:<normalised address>|<postcode>'
  formatted_address text,
  latitude          double precision,
  longitude         double precision,
  precision         text,                    -- Google location_type
  source            text NOT NULL DEFAULT 'google',
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.address_geocodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "address_geocodes_read_all" ON public.address_geocodes;
CREATE POLICY "address_geocodes_read_all"
  ON public.address_geocodes FOR SELECT TO authenticated USING (true);

REVOKE ALL ON TABLE public.address_geocodes FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public.address_geocodes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.address_geocodes TO authenticated, service_role;
