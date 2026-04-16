-- 1) Bump bucket size limit to 1 GB so video uploads up to 1 Go and photos up to 500 Mo are allowed
UPDATE storage.buckets
SET file_size_limit = 1073741824
WHERE id = 'media';

-- 2) Allow ANY authenticated user to read files under the public "tweens/" prefix
--    (Tween feed is intentionally public to all logged-in members, like X/Twitter)
DROP POLICY IF EXISTS "Authenticated users can view tween media" ON storage.objects;
CREATE POLICY "Authenticated users can view tween media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'tweens'
);