-- Council organisations, additive permissions and organisation-scoped access.

CREATE TABLE IF NOT EXISTS public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  account_type text NOT NULL DEFAULT 'council',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
  contract_name text,
  contract_start_date date,
  contract_end_date date,
  support_email text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  postcode text,
  logo_url text,
  timezone text NOT NULL DEFAULT 'Europe/London',
  locale text NOT NULL DEFAULT 'en-GB',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organisation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  display_name text,
  job_title text,
  phone text,
  avatar_url text,
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organisation_member_permissions (
  member_id uuid NOT NULL REFERENCES public.organisation_members(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN ('author', 'reviewer', 'admin')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, permission)
);

CREATE TABLE IF NOT EXISTS public.organisation_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  token_hash text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS organisation_pending_invitation_idx
  ON public.organisation_invitations (organisation_id, lower(email))
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organisation_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organisation_members_user_idx
  ON public.organisation_members (user_id, status);
CREATE INDEX IF NOT EXISTS organisation_audit_events_org_created_idx
  ON public.organisation_audit_events (organisation_id, created_at DESC);

ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.survey_evidences ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.cost_estimation_plans ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.harvest_jobs ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.harvest_job_items ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.evidence_sources ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.property_features ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.property_listings ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.property_assessment_status ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.floor_plan_detections ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id);

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_organisation_member(target_organisation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1
    FROM public.organisation_members
    WHERE organisation_id = target_organisation_id
      AND user_id = (SELECT auth.uid())
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_organisation_permission(
  target_organisation_id uuid,
  target_permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1
    FROM public.organisation_members member
    JOIN public.organisation_member_permissions permission ON permission.member_id = member.id
    JOIN public.organisations organisation ON organisation.id = member.organisation_id
    WHERE member.organisation_id = target_organisation_id
      AND member.user_id = (SELECT auth.uid())
      AND member.status = 'active'
      AND organisation.status = 'active'
      AND permission.permission = target_permission
  );
$$;

-- Bootstrap AccessCheck Council when the agreed production owner exists.
DO $$
DECLARE
  owner_id uuid;
  council_org_id uuid;
  member_id uuid;
  owner record;
BEGIN
  SELECT id INTO owner_id FROM auth.users WHERE lower(email) = lower('Shahin@homingo.co.uk') LIMIT 1;
  IF owner_id IS NULL THEN
    RAISE NOTICE 'AccessCheck bootstrap skipped: Shahin@homingo.co.uk does not exist in auth.users';
    RETURN;
  END IF;

  INSERT INTO public.organisations (name, slug, contract_name, support_email)
  VALUES ('AccessCheck Council', 'accesscheck-council', 'Council Contract', 'Shahin@homingo.co.uk')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO council_org_id;

  INSERT INTO public.platform_admins (user_id) VALUES (owner_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.organisation_members (organisation_id, user_id, email, display_name)
  VALUES (council_org_id, owner_id, 'Shahin@homingo.co.uk', 'Shahin')
  ON CONFLICT (organisation_id, user_id) DO UPDATE SET status = 'active', email = EXCLUDED.email
  RETURNING id INTO member_id;
  INSERT INTO public.organisation_member_permissions (member_id, permission, granted_by)
  VALUES (member_id, 'admin', owner_id)
  ON CONFLICT DO NOTHING;

  FOR owner IN SELECT DISTINCT survey.user_id, auth_user.email FROM public.surveys survey JOIN auth.users auth_user ON auth_user.id = survey.user_id LOOP
    INSERT INTO public.organisation_members (organisation_id, user_id, email)
    VALUES (council_org_id, owner.user_id, owner.email)
    ON CONFLICT (organisation_id, user_id) DO UPDATE SET status = 'active', email = EXCLUDED.email
    RETURNING id INTO member_id;
    INSERT INTO public.organisation_member_permissions (member_id, permission, granted_by)
    VALUES (member_id, 'author', owner_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  UPDATE public.surveys SET organisation_id = council_org_id WHERE organisation_id IS NULL;
  UPDATE public.survey_evidences evidence
    SET organisation_id = survey.organisation_id
    FROM public.surveys survey
    WHERE evidence.survey_id = survey.id AND evidence.organisation_id IS NULL;
  UPDATE public.cost_estimation_plans plan
    SET organisation_id = survey.organisation_id
    FROM public.surveys survey
    WHERE plan.survey_id = survey.id AND plan.organisation_id IS NULL;
  UPDATE public.properties SET organisation_id = council_org_id WHERE organisation_id IS NULL;
  UPDATE public.harvest_jobs SET organisation_id = council_org_id WHERE organisation_id IS NULL;
  UPDATE public.harvest_job_items SET organisation_id = council_org_id WHERE organisation_id IS NULL;
  UPDATE public.evidence_sources SET organisation_id = council_org_id WHERE organisation_id IS NULL;
  UPDATE public.property_features SET organisation_id = council_org_id WHERE organisation_id IS NULL;
  UPDATE public.property_listings SET organisation_id = council_org_id WHERE organisation_id IS NULL;
  UPDATE public.property_assessment_status SET organisation_id = council_org_id WHERE organisation_id IS NULL;
  UPDATE public.floor_plan_detections detection
    SET organisation_id = survey.organisation_id
    FROM public.surveys survey
    WHERE detection.survey_id = survey.id AND detection.organisation_id IS NULL;
END $$;

-- Replace the permissive legacy survey and cost-estimation policies.
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.surveys;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.surveys;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.surveys;
DROP POLICY IF EXISTS "Policy with table joins" ON public.surveys;
CREATE POLICY surveys_org_select ON public.surveys FOR SELECT TO authenticated
  USING (public.is_organisation_member(organisation_id) OR (organisation_id IS NULL AND user_id = (SELECT auth.uid())));
CREATE POLICY surveys_org_insert ON public.surveys FOR INSERT TO authenticated
  WITH CHECK (public.has_organisation_permission(organisation_id, 'author') AND user_id = (SELECT auth.uid()));
CREATE POLICY surveys_org_update ON public.surveys FOR UPDATE TO authenticated
  USING (public.has_organisation_permission(organisation_id, 'author'))
  WITH CHECK (public.has_organisation_permission(organisation_id, 'author'));
CREATE POLICY surveys_org_reviewer_update ON public.surveys FOR UPDATE TO authenticated
  USING (public.has_organisation_permission(organisation_id, 'reviewer'))
  WITH CHECK (public.has_organisation_permission(organisation_id, 'reviewer'));
CREATE POLICY surveys_org_delete ON public.surveys FOR DELETE TO authenticated
  USING (public.has_organisation_permission(organisation_id, 'author'));

DROP POLICY IF EXISTS "Enable delete for all users" ON public.survey_evidences;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.survey_evidences;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.survey_evidences;
CREATE POLICY survey_evidence_org_select ON public.survey_evidences FOR SELECT TO authenticated
  USING (public.is_organisation_member(organisation_id));
CREATE POLICY survey_evidence_org_write ON public.survey_evidences FOR ALL TO authenticated
  USING (public.has_organisation_permission(organisation_id, 'author'))
  WITH CHECK (public.has_organisation_permission(organisation_id, 'author'));

DROP POLICY IF EXISTS cost_estimation_plans_read_all ON public.cost_estimation_plans;
DROP POLICY IF EXISTS cost_estimation_plans_write_all ON public.cost_estimation_plans;
CREATE POLICY cost_estimation_plans_org_select ON public.cost_estimation_plans FOR SELECT TO authenticated
  USING (public.is_organisation_member(organisation_id));
CREATE POLICY cost_estimation_plans_org_write ON public.cost_estimation_plans FOR ALL TO authenticated
  USING (public.has_organisation_permission(organisation_id, 'author'))
  WITH CHECK (
    public.has_organisation_permission(organisation_id, 'author')
    AND EXISTS (
      SELECT 1 FROM public.surveys survey
      WHERE survey.id = survey_id
        AND survey.organisation_id = cost_estimation_plans.organisation_id
    )
  );

DROP POLICY IF EXISTS cost_estimation_adaptations_read_all ON public.cost_estimation_adaptations;
DROP POLICY IF EXISTS cost_estimation_adaptations_write_all ON public.cost_estimation_adaptations;
CREATE POLICY cost_estimation_adaptations_org_select ON public.cost_estimation_adaptations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cost_estimation_plans plan
    WHERE plan.id = plan_id AND public.is_organisation_member(plan.organisation_id)
  ));
CREATE POLICY cost_estimation_adaptations_org_write ON public.cost_estimation_adaptations FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cost_estimation_plans plan
    WHERE plan.id = plan_id AND public.has_organisation_permission(plan.organisation_id, 'author')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cost_estimation_plans plan
    WHERE plan.id = plan_id AND public.has_organisation_permission(plan.organisation_id, 'author')
  ));

DROP POLICY IF EXISTS "Enable read access for all users" ON public.floor_plan_detections;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.floor_plan_detections;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.floor_plan_detections;
CREATE POLICY floor_plan_detections_org_select ON public.floor_plan_detections FOR SELECT TO authenticated
  USING (public.is_organisation_member(organisation_id));
CREATE POLICY floor_plan_detections_org_write ON public.floor_plan_detections FOR ALL TO authenticated
  USING (public.has_organisation_permission(organisation_id, 'author'))
  WITH CHECK (public.has_organisation_permission(organisation_id, 'author'));

-- Add shared organisation access alongside owner access for Property Check data.
DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY[
    'properties', 'harvest_jobs', 'harvest_job_items', 'evidence_sources',
    'property_features', 'property_listings', 'property_assessment_status'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_org_select', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_organisation_member(organisation_id))',
      table_name || '_org_select', table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_org_write', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_organisation_permission(organisation_id, ''author'')) WITH CHECK (public.has_organisation_permission(organisation_id, ''author''))',
      table_name || '_org_write', table_name
    );
  END LOOP;
END $$;

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY organisations_member_select ON public.organisations FOR SELECT TO authenticated
  USING (public.is_organisation_member(id));
CREATE POLICY organisations_platform_write ON public.organisations FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY organisation_members_select ON public.organisation_members FOR SELECT TO authenticated
  USING (public.is_organisation_member(organisation_id));
CREATE POLICY organisation_members_admin_write ON public.organisation_members FOR ALL TO authenticated
  USING (public.has_organisation_permission(organisation_id, 'admin'))
  WITH CHECK (public.has_organisation_permission(organisation_id, 'admin'));
CREATE POLICY organisation_members_self_update ON public.organisation_members FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND status = 'active')
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'active');
CREATE POLICY organisation_permissions_select ON public.organisation_member_permissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organisation_members member
    WHERE member.id = member_id AND public.is_organisation_member(member.organisation_id)
  ));
CREATE POLICY organisation_permissions_admin_write ON public.organisation_member_permissions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organisation_members member
    WHERE member.id = member_id AND public.has_organisation_permission(member.organisation_id, 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organisation_members member
    WHERE member.id = member_id AND public.has_organisation_permission(member.organisation_id, 'admin')
  ));
CREATE POLICY organisation_invitations_admin ON public.organisation_invitations FOR ALL TO authenticated
  USING (public.has_organisation_permission(organisation_id, 'admin'))
  WITH CHECK (public.has_organisation_permission(organisation_id, 'admin'));
CREATE POLICY platform_admins_self_select ON public.platform_admins FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin());
CREATE POLICY organisation_audit_select ON public.organisation_audit_events FOR SELECT TO authenticated
  USING (public.is_organisation_member(organisation_id));
CREATE POLICY organisation_audit_insert ON public.organisation_audit_events FOR INSERT TO authenticated
  WITH CHECK (public.is_organisation_member(organisation_id) AND actor_user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisations, public.organisation_members,
  public.organisation_member_permissions, public.organisation_invitations,
  public.organisation_audit_events TO authenticated;
GRANT SELECT ON public.platform_admins TO authenticated;
