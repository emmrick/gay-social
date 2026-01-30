-- Fix the identity documents upload policy to use authenticated role
DROP POLICY IF EXISTS "Users can upload their own identity documents" ON storage.objects;
CREATE POLICY "Users can upload their own identity documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Also fix the view policy
DROP POLICY IF EXISTS "Users can view their own identity documents" ON storage.objects;
CREATE POLICY "Users can view their own identity documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);