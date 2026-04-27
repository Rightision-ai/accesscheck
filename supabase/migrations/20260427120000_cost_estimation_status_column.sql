-- Background cost-estimation jobs were writing their status to surveys.raw_ai_data, which
-- bumped surveys.updated_at via the touch trigger. The report UI uses updated_at as the
-- "the user changed something" signal, so the cost-estimation completion was making every
-- case look like the report had pending edits — false-positive Re-assess banner.
--
-- Move job status to a dedicated column and exclude it from the touch trigger so completion
-- writes no longer perturb updated_at.

ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS cost_estimation_status JSONB;

CREATE OR REPLACE FUNCTION touch_surveys_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Skip the timestamp bump when only the cost_estimation_status JSONB changed. This is
  -- background bookkeeping, not a user-initiated change to the survey record.
  IF NEW.cost_estimation_status IS DISTINCT FROM OLD.cost_estimation_status
     AND to_jsonb(NEW) - 'cost_estimation_status' - 'updated_at'
         = to_jsonb(OLD) - 'cost_estimation_status' - 'updated_at'
  THEN
    NEW.updated_at := OLD.updated_at;
  ELSE
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger itself was already created by 20260425120000; CREATE OR REPLACE FUNCTION above is
-- enough to swap the implementation. Re-assert the trigger in case it was dropped:
DROP TRIGGER IF EXISTS surveys_touch_updated_at ON surveys;
CREATE TRIGGER surveys_touch_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION touch_surveys_updated_at();
