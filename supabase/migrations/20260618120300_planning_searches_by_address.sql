-- Make the floor-plan discovery freshness cache per-ADDRESS, not per-postcode.
--
-- A postcode holds many addresses, and document extraction is address-specific (we only scrape the
-- plans for the exact address that triggered the search). Keying planning_searches by postcode meant
-- a second address in the same postcode got a "cache hit" with no documents. Re-key it by an address
-- key (UPRN when known, else normalised address|postcode) so every address does its own search, and
-- the TTL re-search applies per address.
--
-- planning_searches is a cache, so clearing the obsolete postcode-keyed rows is safe — they repopulate
-- on the next search.

DELETE FROM public.planning_searches;

ALTER TABLE public.planning_searches DROP CONSTRAINT IF EXISTS planning_searches_postcode_normalised_key;
ALTER TABLE public.planning_searches ADD COLUMN IF NOT EXISTS address_key text;
ALTER TABLE public.planning_searches ALTER COLUMN address_key SET NOT NULL;

ALTER TABLE public.planning_searches DROP CONSTRAINT IF EXISTS planning_searches_address_key_key;
ALTER TABLE public.planning_searches ADD CONSTRAINT planning_searches_address_key_key UNIQUE (address_key);

CREATE INDEX IF NOT EXISTS planning_searches_postcode_idx ON public.planning_searches (postcode_normalised);
