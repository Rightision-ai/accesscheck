-- Case visibility was purely organisation-scoped: every member could read every
-- case in their council. Narrow it so a plain author sees only the cases they
-- created, while admins and reviewers keep the full list — a reviewer whose job
-- is approving other people's work has to be able to open them.
--
-- UPDATE and DELETE are narrowed the same way. Tightening SELECT alone would
-- leave an author able to PATCH or delete a colleague's case by id without ever
-- being able to see it.

CREATE OR REPLACE FUNCTION public.can_view_all_surveys(target_organisation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- has_organisation_permission() already short-circuits for platform admins.
  SELECT public.has_organisation_permission(target_organisation_id, 'admin')
      OR public.has_organisation_permission(target_organisation_id, 'reviewer');
$$;

-- Rows the current user may see: their own, or everything when they are an
-- admin/reviewer. The organisation_id IS NULL branch preserves the pre-existing
-- escape hatch for legacy surveys that were never assigned to a council.
CREATE OR REPLACE FUNCTION public.can_access_survey(
  target_organisation_id uuid,
  target_user_id uuid
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (
      public.is_organisation_member(target_organisation_id)
      AND (
        public.can_view_all_surveys(target_organisation_id)
        OR target_user_id = (SELECT auth.uid())
      )
    )
    OR (target_organisation_id IS NULL AND target_user_id = (SELECT auth.uid()));
$$;

DROP POLICY IF EXISTS surveys_org_select ON public.surveys;
CREATE POLICY surveys_org_select ON public.surveys FOR SELECT TO authenticated
  USING (public.can_access_survey(organisation_id, user_id));

DROP POLICY IF EXISTS surveys_org_update ON public.surveys;
CREATE POLICY surveys_org_update ON public.surveys FOR UPDATE TO authenticated
  USING (
    public.has_organisation_permission(organisation_id, 'author')
    AND (public.can_view_all_surveys(organisation_id) OR user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    public.has_organisation_permission(organisation_id, 'author')
    AND (public.can_view_all_surveys(organisation_id) OR user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS surveys_org_delete ON public.surveys;
CREATE POLICY surveys_org_delete ON public.surveys FOR DELETE TO authenticated
  USING (
    public.has_organisation_permission(organisation_id, 'author')
    AND (public.can_view_all_surveys(organisation_id) OR user_id = (SELECT auth.uid()))
  );

-- surveys_org_reviewer_update is left as-is: a reviewer may update any case in
-- the organisation, which is the whole point of the role.

-- ── Child tables ────────────────────────────────────────────────────────────
-- These were organisation-scoped, so an author who could no longer see a case
-- could still read its photos, its costed plan and its status history. Scope
-- each through its parent survey instead, the same shape adaptation_plan_lines
-- already uses for its own parent.

DROP POLICY IF EXISTS survey_evidence_org_select ON public.survey_evidences;
CREATE POLICY survey_evidence_org_select ON public.survey_evidences FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_evidences.survey_id
      AND public.can_access_survey(s.organisation_id, s.user_id)
  ));

DROP POLICY IF EXISTS survey_evidence_org_write ON public.survey_evidences;
CREATE POLICY survey_evidence_org_write ON public.survey_evidences FOR ALL TO authenticated
  USING (
    public.has_organisation_permission(organisation_id, 'author')
    AND EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_evidences.survey_id
        AND public.can_access_survey(s.organisation_id, s.user_id)
    )
  )
  WITH CHECK (
    public.has_organisation_permission(organisation_id, 'author')
    AND EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_evidences.survey_id
        AND public.can_access_survey(s.organisation_id, s.user_id)
    )
  );

-- SECURITY FIX, unrelated to the visibility change but found while auditing it.
-- These three survived from the table's original migration: `Enable read access
-- for all users` is `USING (true)` granted to PUBLIC, and `anon` holds a SELECT
-- grant — so ANY anonymous caller could read every floor plan detection in the
-- database, across all organisations, including the image reference and the raw
-- detection JSON. `Enable delete for all users` likewise let any authenticated
-- user delete any row. Migration 20260828100000 intended to drop these but used
-- the wrong policy names, so they were never removed. Policies are OR-ed, so
-- these must go or the new scoped policies below are meaningless.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.floor_plan_detections;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.floor_plan_detections;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.floor_plan_detections;

DROP POLICY IF EXISTS floor_plan_detections_org_select ON public.floor_plan_detections;
CREATE POLICY floor_plan_detections_org_select ON public.floor_plan_detections FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = floor_plan_detections.survey_id
      AND public.can_access_survey(s.organisation_id, s.user_id)
  ));

DROP POLICY IF EXISTS floor_plan_detections_org_write ON public.floor_plan_detections;
CREATE POLICY floor_plan_detections_org_write ON public.floor_plan_detections FOR ALL TO authenticated
  USING (
    public.has_organisation_permission(organisation_id, 'author')
    AND EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = floor_plan_detections.survey_id
        AND public.can_access_survey(s.organisation_id, s.user_id)
    )
  )
  WITH CHECK (
    public.has_organisation_permission(organisation_id, 'author')
    AND EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = floor_plan_detections.survey_id
        AND public.can_access_survey(s.organisation_id, s.user_id)
    )
  );

DROP POLICY IF EXISTS adaptation_plans_org_select ON public.adaptation_plans;
CREATE POLICY adaptation_plans_org_select ON public.adaptation_plans FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = adaptation_plans.survey_id
      AND public.can_access_survey(s.organisation_id, s.user_id)
  ));

DROP POLICY IF EXISTS adaptation_plans_org_write ON public.adaptation_plans;
CREATE POLICY adaptation_plans_org_write ON public.adaptation_plans FOR ALL TO authenticated
  USING (
    public.has_organisation_permission(organisation_id, 'author')
    AND EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = adaptation_plans.survey_id
        AND public.can_access_survey(s.organisation_id, s.user_id)
    )
  )
  WITH CHECK (
    public.has_organisation_permission(organisation_id, 'author')
    AND EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = adaptation_plans.survey_id
        AND public.can_access_survey(s.organisation_id, s.user_id)
    )
  );

DROP POLICY IF EXISTS assessment_status_events_read ON public.assessment_status_events;
CREATE POLICY assessment_status_events_read ON public.assessment_status_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = assessment_status_events.survey_id
      AND public.can_access_survey(s.organisation_id, s.user_id)
  ));
