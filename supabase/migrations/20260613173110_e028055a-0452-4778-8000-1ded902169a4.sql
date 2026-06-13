DROP POLICY IF EXISTS "Users can delete their group avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their group avatars" ON storage.objects;

CREATE POLICY "Group creators can update their group avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'group-avatars'
  AND EXISTS (
    SELECT 1 FROM public.chat_rooms cr
    WHERE cr.id::text = (storage.foldername(name))[1]
      AND cr.created_by = auth.uid()
  )
);

CREATE POLICY "Group creators can delete their group avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'group-avatars'
  AND EXISTS (
    SELECT 1 FROM public.chat_rooms cr
    WHERE cr.id::text = (storage.foldername(name))[1]
      AND cr.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload group avatars" ON storage.objects;
CREATE POLICY "Group creators can upload group avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'group-avatars'
  AND EXISTS (
    SELECT 1 FROM public.chat_rooms cr
    WHERE cr.id::text = (storage.foldername(name))[1]
      AND cr.created_by = auth.uid()
  )
);