-- Allow moderators to view identity documents in storage
CREATE POLICY "Moderators can view identity documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND public.has_role(auth.uid(), 'moderator')
);

-- Allow moderators to delete identity documents (for post-verification cleanup)
CREATE POLICY "Moderators can delete identity documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND public.has_role(auth.uid(), 'moderator')
);