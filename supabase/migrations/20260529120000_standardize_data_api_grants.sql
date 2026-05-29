-- Standardize Data API grants across every public table.
--
-- Supabase is removing the legacy auto-grant that exposed new public-schema
-- tables to the Data API (supabase-js / PostgREST / GraphQL): new projects from
-- 2026-05-30, all existing projects from 2026-10-30. After that, a public table
-- is unreachable via the anon/authenticated/service_role keys unless it has an
-- explicit GRANT.
--
-- Three of our tables (survey_annotations, cost_estimation_plans,
-- cost_estimation_adaptations) only work today because of that legacy auto-grant
-- and would break on a fresh `supabase db reset`, a CI/preview env, or a new
-- project. This migration normalizes ALL public tables to the Supabase-
-- recommended grant shape so they survive the change and stay consistent:
--
--   anon                       -> SELECT only
--   authenticated, service_role-> SELECT, INSERT, UPDATE, DELETE
--
-- REVOKE ... ON TABLE touches table privileges only (sequence grants for
-- identity columns are left intact). Row-level security is the real access
-- control and is already enabled on every table below; we re-assert it as a
-- harmless no-op. The owner/postgres role is unaffected.
--
-- Forward-only: historical migrations are already applied and must not be edited.

-- surveys
REVOKE ALL ON TABLE "public"."surveys" FROM "anon", "authenticated", "service_role";
GRANT SELECT ON TABLE "public"."surveys" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."surveys" TO "authenticated", "service_role";
ALTER TABLE "public"."surveys" ENABLE ROW LEVEL SECURITY;

-- survey_evidences
REVOKE ALL ON TABLE "public"."survey_evidences" FROM "anon", "authenticated", "service_role";
GRANT SELECT ON TABLE "public"."survey_evidences" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."survey_evidences" TO "authenticated", "service_role";
ALTER TABLE "public"."survey_evidences" ENABLE ROW LEVEL SECURITY;

-- floor_plan_detections
REVOKE ALL ON TABLE "public"."floor_plan_detections" FROM "anon", "authenticated", "service_role";
GRANT SELECT ON TABLE "public"."floor_plan_detections" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."floor_plan_detections" TO "authenticated", "service_role";
ALTER TABLE "public"."floor_plan_detections" ENABLE ROW LEVEL SECURITY;

-- survey_annotations (was missing an explicit grant)
REVOKE ALL ON TABLE "public"."survey_annotations" FROM "anon", "authenticated", "service_role";
GRANT SELECT ON TABLE "public"."survey_annotations" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."survey_annotations" TO "authenticated", "service_role";
ALTER TABLE "public"."survey_annotations" ENABLE ROW LEVEL SECURITY;

-- cost_estimation_plans (was missing an explicit grant)
REVOKE ALL ON TABLE "public"."cost_estimation_plans" FROM "anon", "authenticated", "service_role";
GRANT SELECT ON TABLE "public"."cost_estimation_plans" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."cost_estimation_plans" TO "authenticated", "service_role";
ALTER TABLE "public"."cost_estimation_plans" ENABLE ROW LEVEL SECURITY;

-- cost_estimation_adaptations (was missing an explicit grant)
REVOKE ALL ON TABLE "public"."cost_estimation_adaptations" FROM "anon", "authenticated", "service_role";
GRANT SELECT ON TABLE "public"."cost_estimation_adaptations" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."cost_estimation_adaptations" TO "authenticated", "service_role";
ALTER TABLE "public"."cost_estimation_adaptations" ENABLE ROW LEVEL SECURITY;
