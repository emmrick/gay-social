
-- Fix: Require authentication for profile_photos SELECT
DROP POLICY IF EXISTS "Authenticated users can view profile photos" ON public.profile_photos;
DROP POLICY IF EXISTS "Anyone can view profile photos" ON public.profile_photos;

CREATE POLICY "Authenticated users can view profile photos"
ON public.profile_photos
FOR SELECT
TO authenticated
USING (true);
