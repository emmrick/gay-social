-- Allow admins to update profile_photos (e.g. approve/reject)
CREATE POLICY "Admins can update profile photos"
ON public.profile_photos
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow moderators to update profile_photos (e.g. approve/reject)
CREATE POLICY "Moderators can update profile photos"
ON public.profile_photos
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Allow admins to view all profile photos
CREATE POLICY "Admins can view all profile photos"
ON public.profile_photos
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow moderators to view all profile photos
CREATE POLICY "Moderators can view all profile photos"
ON public.profile_photos
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'));