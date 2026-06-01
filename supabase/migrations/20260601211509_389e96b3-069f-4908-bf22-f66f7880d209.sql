
-- Rollback: restaure SELECT complet sur profiles (les select('*') étaient cassés)
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Rollback: restaure la policy storage permissive pour le bucket media
DROP POLICY IF EXISTS "Users can view media in their own folder" ON storage.objects;

CREATE POLICY "Authenticated users can view media bucket"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'media');
