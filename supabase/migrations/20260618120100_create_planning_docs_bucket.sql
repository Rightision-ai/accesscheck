-- Private bucket caching planning-application plan/elevation files (PDF/image) fetched from council
-- portals. Unlike property-images these are SHARED (one cached doc serves every property that matches
-- the application), so it is NOT owner-folder scoped. Reads are allowed to any authenticated user
-- (public-record data); writes happen only via the service-role key (bypasses storage RLS) in the
-- background storePlanDocs task. Treat stored files as cache — refresh/delete per portal terms.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'planning-docs',
  'planning-docs',
  false,
  26214400,                                  -- 25 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "planning_docs_read_authenticated" ON storage.objects;
CREATE POLICY "planning_docs_read_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'planning-docs');
-- No INSERT/UPDATE/DELETE policy: only the service role (RLS bypass) writes cached files.
