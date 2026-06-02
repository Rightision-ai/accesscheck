-- Evidence Harvester: store a Street View screenshot + a static map per property.
--
-- NOTE on licensing: Google Maps Platform terms generally restrict permanent storage/caching of
-- Street View imagery. These columns/bucket exist because the product explicitly wants a saved
-- screenshot per property; treat stored imagery as cache and refresh/delete per Google's terms.

-- Private bucket for the saved images (owner-folder access only, like the CSV bucket).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  false,
  10485760,                                  -- 10 MB
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "property_images_insert_own_folder" ON storage.objects;
CREATE POLICY "property_images_insert_own_folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "property_images_read_own_folder" ON storage.objects;
CREATE POLICY "property_images_read_own_folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "property_images_update_own_folder" ON storage.objects;
CREATE POLICY "property_images_update_own_folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "property_images_delete_own_folder" ON storage.objects;
CREATE POLICY "property_images_delete_own_folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage object paths for the saved imagery (signed URLs generated on read).
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS street_view_image_path text,
  ADD COLUMN IF NOT EXISTS map_image_path text;
