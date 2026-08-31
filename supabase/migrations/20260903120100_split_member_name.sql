-- Member profiles captured a single `display_name`. Settings now asks for a
-- first and last name separately, so split the column in two and backfill by
-- the first space (anything after it becomes the last name, so "Ana Maria
-- Lopez" keeps "Maria Lopez" rather than losing a name part).
ALTER TABLE public.organisation_members
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name  text;

UPDATE public.organisation_members
   SET first_name = NULLIF(btrim(split_part(display_name, ' ', 1)), ''),
       last_name  = CASE
                      WHEN position(' ' in btrim(display_name)) = 0 THEN NULL
                      ELSE NULLIF(btrim(substring(btrim(display_name) from position(' ' in btrim(display_name)) + 1)), '')
                    END
 WHERE display_name IS NOT NULL AND btrim(display_name) <> '';

ALTER TABLE public.organisation_members DROP COLUMN IF EXISTS display_name;
