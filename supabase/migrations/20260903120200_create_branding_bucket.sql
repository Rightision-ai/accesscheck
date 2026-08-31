-- Branding bucket — member profile photos and organisation logos. Public read
-- (these are rendered in the app shell and on report PDFs), scoped writes.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "branding_public_read" ON storage.objects;
CREATE POLICY "branding_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'branding');

-- avatars/<user id>/… — a member manages only their own profile photo.
DROP POLICY IF EXISTS "branding_avatar_write" ON storage.objects;
CREATE POLICY "branding_avatar_write"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- organisations/<organisation id>/… — only that organisation's admins.
-- The uuid shape is checked before the cast so a malformed path is denied
-- rather than raising.
DROP POLICY IF EXISTS "branding_logo_write" ON storage.objects;
CREATE POLICY "branding_logo_write"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = 'organisations'
    AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND public.has_organisation_permission(((storage.foldername(name))[2])::uuid, 'admin')
  )
  WITH CHECK (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = 'organisations'
    AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND public.has_organisation_permission(((storage.foldername(name))[2])::uuid, 'admin')
  );
