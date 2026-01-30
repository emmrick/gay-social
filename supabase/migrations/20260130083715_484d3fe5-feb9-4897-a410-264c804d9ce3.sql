-- Add admin policy to view all albums for moderation
CREATE POLICY "Admins can view all albums"
ON public.user_albums
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policy to view all album media for moderation
CREATE POLICY "Admins can view all album media"
ON public.album_media
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policy to delete album media for moderation
CREATE POLICY "Admins can delete album media"
ON public.album_media
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policy to delete albums for moderation
CREATE POLICY "Admins can delete albums"
ON public.user_albums
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));