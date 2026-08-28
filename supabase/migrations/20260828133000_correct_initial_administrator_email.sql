-- Correct the initial administrator address in environments where the preceding bootstrap
-- migration was already applied.

CREATE OR REPLACE FUNCTION public.attach_accesscheck_initial_administrator(target_user_id uuid, target_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_council_id uuid;
  council_member_id uuid;
BEGIN
  IF lower(coalesce(target_email, '')) <> lower('Shahin@homingo.co.uk') THEN
    RETURN;
  END IF;

  INSERT INTO public.organisations (name, slug, contract_name, support_email)
  VALUES ('AccessCheck Council', 'accesscheck-council', 'Council Contract', 'Shahin@homingo.co.uk')
  ON CONFLICT (slug)
  DO UPDATE SET name = EXCLUDED.name, support_email = EXCLUDED.support_email
  RETURNING id INTO target_council_id;

  INSERT INTO public.platform_admins (user_id)
  VALUES (target_user_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organisation_members (
    organisation_id,
    user_id,
    email,
    display_name,
    status
  )
  VALUES (target_council_id, target_user_id, target_email, 'Shahin', 'active')
  ON CONFLICT (organisation_id, user_id)
  DO UPDATE SET status = 'active', email = EXCLUDED.email
  RETURNING id INTO council_member_id;

  INSERT INTO public.organisation_member_permissions (member_id, permission, granted_by)
  SELECT council_member_id, permission, target_user_id
  FROM unnest(ARRAY['admin', 'author', 'reviewer']) AS permission
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_accesscheck_initial_administrator(uuid, text) FROM PUBLIC;

UPDATE public.organisations
SET support_email = 'Shahin@homingo.co.uk', updated_at = now()
WHERE slug = 'accesscheck-council';

DO $$
DECLARE
  initial_admin_id uuid;
BEGIN
  SELECT id INTO initial_admin_id
  FROM auth.users
  WHERE lower(email) = lower('Shahin@homingo.co.uk')
  LIMIT 1;

  IF initial_admin_id IS NOT NULL THEN
    PERFORM public.attach_accesscheck_initial_administrator(
      initial_admin_id,
      'Shahin@homingo.co.uk'
    );
  END IF;
END;
$$;
