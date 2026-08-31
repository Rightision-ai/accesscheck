-- Cap each organisation's membership. Stored per-organisation rather than as a
-- constant so seats can be sold individually later; only platform admins can
-- raise it (see the allowlist in app/api/platform/organisations/[id]/route.ts).
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS member_limit integer NOT NULL DEFAULT 5 CHECK (member_limit > 0);

-- Enforcement has to be a trigger, not an RLS policy: the invitation-accept
-- route creates memberships with the service-role client, which bypasses RLS
-- entirely. Triggers still fire for the service role.
--
-- Only ACTIVE members are counted here. A pending invitation also reserves a
-- seat, but that reservation is enforced in the API when the invitation is
-- created — counting it here too would double-count at the moment an invite is
-- accepted, because the invitation is still 'pending' while this trigger runs.
CREATE OR REPLACE FUNCTION public.enforce_organisation_member_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  active_count integer;
  seat_limit integer;
BEGIN
  -- Only a row arriving at, or newly becoming, 'active' consumes a seat.
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND OLD.organisation_id = NEW.organisation_id THEN
    RETURN NEW;
  END IF;

  SELECT organisation.member_limit INTO seat_limit
    FROM public.organisations organisation
   WHERE organisation.id = NEW.organisation_id;
  IF seat_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO active_count
    FROM public.organisation_members member
   WHERE member.organisation_id = NEW.organisation_id
     AND member.status = 'active'
     AND member.id IS DISTINCT FROM NEW.id;

  IF active_count >= seat_limit THEN
    RAISE EXCEPTION
      'This organisation has reached its limit of % members. Deactivate a member or contact AccessCheck to add seats.',
      seat_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organisation_members_enforce_limit ON public.organisation_members;
CREATE TRIGGER organisation_members_enforce_limit
  BEFORE INSERT OR UPDATE ON public.organisation_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_organisation_member_limit();
