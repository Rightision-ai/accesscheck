-- Collapse the assessment workflow to three statuses: draft -> review -> complete.
--
-- `in_progress` was indistinguishable from `draft` in the UI and produced unreachable
-- transitions (review -> in_progress, complete -> in_progress) plus a save-time failure
-- whenever a reopened in_progress case was saved back as a draft. Every in_progress row
-- becomes a draft: those cases were never submitted, so draft is the honest equivalent.
--
-- The transition table below mirrors canTransitionAssessment() in lib/assessments/workflow.ts.
-- Change both together.

-- The backfill is itself a status change, so it would be rejected by the existing trigger
-- (there is no in_progress -> draft rule, and auth.uid() is NULL during a migration, which
-- the audit insert cannot accept). Drop the trigger, migrate the data, then reinstall it.
DROP TRIGGER IF EXISTS surveys_validate_status_transition ON public.surveys;

UPDATE public.surveys SET status = 'draft' WHERE status = 'in_progress';

ALTER TABLE public.surveys DROP CONSTRAINT IF EXISTS surveys_assessment_status_check;
ALTER TABLE public.surveys ADD CONSTRAINT surveys_assessment_status_check
  CHECK (status IN ('draft', 'review', 'complete'));

-- public.assessment_status_events keeps its historical 'in_progress' from_status/to_status
-- values; that table has no CHECK constraint, so the audit trail stays intact.

CREATE OR REPLACE FUNCTION public.validate_assessment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := (SELECT auth.uid());
  can_edit boolean;
  allowed boolean := false;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  -- The reviewer role exists but is not part of this flow — authors and admins drive it.
  -- has_organisation_permission() already short-circuits for platform admins.
  can_edit :=
    public.has_organisation_permission(NEW.organisation_id, 'author')
    OR public.has_organisation_permission(NEW.organisation_id, 'admin');

  allowed := can_edit AND CASE
    WHEN OLD.status = 'draft' AND NEW.status = 'review' THEN NEW.assessment_completion_percent = 100
    WHEN OLD.status = 'review' AND NEW.status = 'complete' THEN true
    WHEN OLD.status = 'review' AND NEW.status = 'draft' THEN length(trim(coalesce(NEW.transition_reason, ''))) > 0
    WHEN OLD.status = 'complete' AND NEW.status = 'draft' THEN length(trim(coalesce(NEW.transition_reason, ''))) > 0
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
