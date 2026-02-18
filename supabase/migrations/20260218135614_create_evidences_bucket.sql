-- Create the evidences bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('evidences', 'evidences', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;
