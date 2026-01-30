-- Drop the existing restrictive policy on user_albums
DROP POLICY IF EXISTS "Users can view their own albums" ON public.user_albums;

-- Create a new policy that includes shared albums
CREATE POLICY "Users can view own and shared albums" 
ON public.user_albums 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR is_private = false 
  OR EXISTS (
    SELECT 1 FROM album_shares s 
    WHERE s.album_id = user_albums.id 
      AND s.shared_with_user_id = auth.uid() 
      AND s.is_active = true 
      AND (s.expires_at IS NULL OR s.expires_at > now())
  )
);