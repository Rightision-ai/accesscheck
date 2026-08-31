-- Fix: activating an earlier version failed with
--   new row for relation "rate_cards" violates check constraint "rate_cards_effective_range_check"
--
-- `activate_rate_card_version` retired the outgoing version with
-- `effective_to = COALESCE(effective_to, current_date)`. When that version was scheduled to
-- start in the future — an admin publishing next April's schedule of rates today, which is a
-- normal thing to do — `current_date` lands before its `effective_from` and the range check
-- rightly rejects it.
--
-- Clamp with GREATEST, so a version that never actually came into force retires on the day it
-- was due to start and gets a zero-length window rather than a negative one.
-- `commit_rate_card_version` already does this; this is the same guard, missed here.

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
    RAISE EXCEPTION 'Rate card version not found';
  END IF;
  IF target_org IS NULL THEN
    RAISE EXCEPTION 'The national rate card cannot be activated or retired';
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
