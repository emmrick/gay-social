
-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view album media" ON public.album_media;

-- Create a new policy that directly checks album_shares for recipients
CREATE POLICY "Users can view album media" 
ON public.album_media 
FOR SELECT 
USING (
  -- Owner can see their media
  EXISTS (
    SELECT 1 FROM user_albums a 
    WHERE a.id = album_media.album_id 
    AND a.user_id = auth.uid()
  )
  OR
  -- Users with active share can see media
  EXISTS (
    SELECT 1 FROM album_shares s
    WHERE s.album_id = album_media.album_id
    AND s.shared_with_user_id = auth.uid()
    AND s.is_active = true
    AND (s.expires_at IS NULL OR s.expires_at > now())
  )
  OR
  -- Public albums can be viewed by anyone
  EXISTS (
    SELECT 1 FROM user_albums a 
    WHERE a.id = album_media.album_id 
    AND a.is_private = false
  )
);
