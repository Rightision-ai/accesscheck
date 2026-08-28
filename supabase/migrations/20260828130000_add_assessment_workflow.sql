-- Typed assessment workflow and status audit trail.

ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS assessment_completion_percent integer NOT NULL DEFAULT 0 CHECK (assessment_completion_percent BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS assessment_readiness text NOT NULL DEFAULT 'incomplete' CHECK (assessment_readiness IN ('ready', 'partial', 'incomplete')),
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_comment text,
  ADD COLUMN IF NOT EXISTS transition_reason text;

UPDATE public.surveys
SET status = CASE
  WHEN lower(coalesce(status, '')) IN ('complete', 'completed', 'finalized', 'finalised') THEN 'complete'
  WHEN lower(coalesce(status, '')) IN ('review', 'under review', 'pending review') THEN 'review'
  WHEN lower(coalesce(status, '')) IN ('in progress', 'in_progress', 'active') THEN 'in_progress'
  ELSE 'draft'
END;

ALTER TABLE public.surveys ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.surveys ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.surveys DROP CONSTRAINT IF EXISTS surveys_assessment_status_check;
ALTER TABLE public.surveys ADD CONSTRAINT surveys_assessment_status_check
  CHECK (status IN ('draft', 'in_progress', 'review', 'complete'));

CREATE TABLE public.assessment_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  survey_id bigint NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assessment_status_events_survey_idx
  ON public.assessment_status_events (survey_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.validate_assessment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := (SELECT auth.uid());
  allowed boolean := false;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  allowed := CASE
    WHEN OLD.status = 'draft' AND NEW.status = 'in_progress' THEN public.has_organisation_permission(NEW.organisation_id, 'author')
    WHEN OLD.status = 'in_progress' AND NEW.status = 'review' THEN public.has_organisation_permission(NEW.organisation_id, 'author') AND NEW.assessment_completion_percent = 100
    WHEN OLD.status = 'review' AND NEW.status = 'in_progress' THEN
      (public.has_organisation_permission(NEW.organisation_id, 'reviewer') OR public.has_organisation_permission(NEW.organisation_id, 'author'))
      AND length(trim(coalesce(NEW.transition_reason, ''))) > 0
    WHEN OLD.status = 'review' AND NEW.status = 'complete' THEN public.has_organisation_permission(NEW.organisation_id, 'reviewer')
    WHEN OLD.status = 'complete' AND NEW.status = 'in_progress' THEN
      public.has_organisation_permission(NEW.organisation_id, 'reviewer')
      AND length(trim(coalesce(NEW.transition_reason, ''))) > 0
    ELSE false
  END;

  IF NOT allowed THEN RAISE EXCEPTION 'Invalid or unauthorised assessment status transition: % -> %', OLD.status, NEW.status; END IF;

  IF NEW.status = 'review' THEN NEW.submitted_by := actor; NEW.submitted_at := now(); END IF;
  IF NEW.status = 'complete' THEN NEW.reviewed_by := actor; NEW.reviewed_at := now(); NEW.completed_at := now(); END IF;

  INSERT INTO public.assessment_status_events (
    organisation_id, survey_id, from_status, to_status, actor_user_id, reason
  ) VALUES (
    NEW.organisation_id, NEW.id, OLD.status, NEW.status, actor, NEW.transition_reason
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER surveys_validate_status_transition
  BEFORE UPDATE OF status ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.validate_assessment_status_transition();

ALTER TABLE public.assessment_status_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY assessment_status_events_read ON public.assessment_status_events FOR SELECT TO authenticated
  USING (public.is_organisation_member(organisation_id));
CREATE POLICY assessment_status_events_insert ON public.assessment_status_events FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = (SELECT auth.uid()) AND public.is_organisation_member(organisation_id));
GRANT SELECT, INSERT ON public.assessment_status_events TO authenticated;
