-- The original bootstrap exited early when the agreed administrator had not signed up yet.
-- Always create the initial council, backfill existing records, and attach the administrator
-- whenever that auth account is created.

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
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
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

CREATE OR REPLACE FUNCTION public.handle_accesscheck_initial_administrator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.attach_accesscheck_initial_administrator(NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attach_accesscheck_initial_administrator ON auth.users;
CREATE TRIGGER attach_accesscheck_initial_administrator
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_accesscheck_initial_administrator();

DO $$
DECLARE
  target_council_id uuid;
  initial_admin_id uuid;
  existing_owner record;
  council_member_id uuid;
BEGIN
  INSERT INTO public.organisations (name, slug, contract_name, support_email)
  VALUES ('AccessCheck Council', 'accesscheck-council', 'Council Contract', 'Shahin@homingo.co.uk')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO target_council_id;

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

  FOR existing_owner IN
    SELECT DISTINCT survey.user_id, auth_user.email
    FROM public.surveys survey
    JOIN auth.users auth_user ON auth_user.id = survey.user_id
  LOOP
    INSERT INTO public.organisation_members (organisation_id, user_id, email, status)
    VALUES (target_council_id, existing_owner.user_id, existing_owner.email, 'active')
    ON CONFLICT (organisation_id, user_id)
    DO UPDATE SET status = 'active', email = EXCLUDED.email
    RETURNING id INTO council_member_id;

    INSERT INTO public.organisation_member_permissions (member_id, permission, granted_by)
    VALUES (council_member_id, 'author', initial_admin_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  UPDATE public.surveys SET organisation_id = target_council_id WHERE organisation_id IS NULL;
  UPDATE public.survey_evidences evidence
    SET organisation_id = survey.organisation_id
    FROM public.surveys survey
    WHERE evidence.survey_id = survey.id AND evidence.organisation_id IS NULL;
  UPDATE public.cost_estimation_plans plan
    SET organisation_id = survey.organisation_id
    FROM public.surveys survey
    WHERE plan.survey_id = survey.id AND plan.organisation_id IS NULL;
  UPDATE public.properties SET organisation_id = target_council_id WHERE organisation_id IS NULL;
  UPDATE public.harvest_jobs SET organisation_id = target_council_id WHERE organisation_id IS NULL;
  UPDATE public.harvest_job_items SET organisation_id = target_council_id WHERE organisation_id IS NULL;
  UPDATE public.evidence_sources SET organisation_id = target_council_id WHERE organisation_id IS NULL;
  UPDATE public.property_features SET organisation_id = target_council_id WHERE organisation_id IS NULL;
  UPDATE public.property_listings SET organisation_id = target_council_id WHERE organisation_id IS NULL;
  UPDATE public.property_assessment_status SET organisation_id = target_council_id WHERE organisation_id IS NULL;
  UPDATE public.floor_plan_detections detection
    SET organisation_id = survey.organisation_id
    FROM public.surveys survey
    WHERE detection.survey_id = survey.id AND detection.organisation_id IS NULL;
END;
$$;
