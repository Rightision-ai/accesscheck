-- Backfill assessment completion metrics using the same four required sections as the app.
WITH readiness AS (
  SELECT
    survey.id,
    (
      CASE WHEN nullif(trim(coalesce(survey.street, '')), '') IS NOT NULL
             AND nullif(trim(coalesce(survey.postcode, '')), '') IS NOT NULL
             AND nullif(trim(coalesce(survey.property_type, '')), '') IS NOT NULL THEN 1 ELSE 0 END
      + CASE WHEN nullif(trim(coalesce(survey.inspector_name, '')), '') IS NOT NULL
               AND survey.inspection_date IS NOT NULL THEN 1 ELSE 0 END
      + CASE WHEN nullif(trim(coalesce(survey.overall_grade, '')), '') IS NOT NULL THEN 1 ELSE 0 END
      + CASE WHEN EXISTS (SELECT 1 FROM public.survey_evidences evidence WHERE evidence.survey_id = survey.id) THEN 1 ELSE 0 END
    ) AS completed_sections
  FROM public.surveys survey
)
UPDATE public.surveys survey
SET
  assessment_completion_percent = readiness.completed_sections * 25,
  assessment_readiness = CASE
    WHEN readiness.completed_sections = 4 THEN 'ready'
    WHEN readiness.completed_sections = 0 THEN 'incomplete'
    ELSE 'partial'
  END
FROM readiness
WHERE readiness.id = survey.id;
