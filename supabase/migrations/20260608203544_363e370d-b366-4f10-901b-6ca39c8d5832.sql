
-- 1. media bucket: owner-only read; tween media stays accessible to authenticated.
DROP POLICY IF EXISTS "Authenticated users can view media bucket" ON storage.objects;
CREATE POLICY "Users can view own media folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
-- "Authenticated users can view tween media" already exists and stays.

-- 2. stories bucket: owner-only read; cross-user access goes through signed URLs.
DROP POLICY IF EXISTS "Users can view stories media" ON storage.objects;
CREATE POLICY "Users can view own stories folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'stories'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 3. ad-images bucket: remove anonymous upload path (keep authenticated upload).
DROP POLICY IF EXISTS "Anyone can upload ad images" ON storage.objects;
