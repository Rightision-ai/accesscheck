-- Survey media contains photographs of the inside of applicants' homes. Until
-- now `evidences` and `floor-plan-detections` were PUBLIC buckets with a
-- `TO public` SELECT policy, which meant an anonymous client could list every
-- object and then read each one over its public URL, permanently. Writes were
-- equally open: `WITH CHECK (bucket_id = 'evidences')` let any authenticated
-- user in any organisation write to any path.
--
-- After this migration both buckets are private. Reads happen only through
-- short-lived signed URLs minted server-side (lib/storage/signing.ts) once the
-- caller has been authorised against the owning survey row, and writes are
-- confined to the caller's own organisation prefix.

UPDATE storage.buckets SET public = false WHERE id IN ('evidences', 'floor-plan-detections');

-- A public bucket serves /object/public/... without consulting RLS at all, so
-- these policies never served an image — they only granted the ability to LIST
-- the bucket. Dropping them removes anonymous enumeration and breaks nothing;
-- `marketing-assets` and `branding` stay public and keep working.
DROP POLICY IF EXISTS "Public can view evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view floor plan detections" ON storage.objects;
DROP POLICY IF EXISTS "Public can view marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "branding_public_read" ON storage.objects;

-- Every authenticated user could read every organisation's cached council
-- documents. Nothing reads this bucket with a user-scoped client — the only
-- reader is the service-role proxy at
-- app/api/evidence-harvester/floorplan-file/[sourceId]/route.ts — so removing
-- the policy costs nothing.
DROP POLICY IF EXISTS "planning_docs_read_authenticated" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload floor plan detections" ON storage.objects;

-- New objects land under <organisation id>/<survey id>/... and are checked
-- against membership. FOR ALL rather than FOR INSERT because the upload helpers
-- pass `upsert: true`, which needs UPDATE on conflict.
--
-- The uuid shape is tested before the cast so a malformed prefix is denied
-- rather than raising. Objects written before this migration keep their old
-- un-prefixed paths (`wizard/...`, `survey/new/...`); they fall outside this
-- policy and are readable only via the service role, which is what the signing
-- layer uses — so nothing already stored is orphaned.
DROP POLICY IF EXISTS "evidence_org_write" ON storage.objects;
CREATE POLICY "evidence_org_write"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id IN ('evidences', 'floor-plan-detections')
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND public.is_organisation_member(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id IN ('evidences', 'floor-plan-detections')
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND public.is_organisation_member(((storage.foldername(name))[1])::uuid)
  );

-- Deliberately NO SELECT policy on the two media buckets: `authenticated` is
-- not granted read at all. Reads go through signed URLs issued by the service
-- role after our own organisation check.
