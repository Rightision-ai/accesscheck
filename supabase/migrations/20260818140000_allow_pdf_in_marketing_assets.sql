-- Allow PDFs in the marketing-assets bucket (e.g. the homepage sample
-- accessibility report), alongside the existing video/image mime types.
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'application/pdf')
WHERE id = 'marketing-assets'
  AND NOT ('application/pdf' = ANY(allowed_mime_types));
