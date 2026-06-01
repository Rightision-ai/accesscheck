-- Private bucket for Evidence Harvester CSV uploads.
-- Unlike the public `evidences` bucket, council stock lists are sensitive and must stay private:
-- the bucket is not public and objects are readable/writable only within the owner's own folder
-- (the first path segment is the user's auth uid, e.g. "<uid>/<job>.csv").

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-csv-uploads',
  'property-csv-uploads',
  false,
  20971520,                                  -- 20 MB
  ARRAY['text/csv', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "property_csv_upload_own_folder" ON storage.objects;
CREATE POLICY "property_csv_upload_own_folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'property-csv-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "property_csv_read_own_folder" ON storage.objects;
CREATE POLICY "property_csv_read_own_folder"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'property-csv-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "property_csv_delete_own_folder" ON storage.objects;
CREATE POLICY "property_csv_delete_own_folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'property-csv-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
