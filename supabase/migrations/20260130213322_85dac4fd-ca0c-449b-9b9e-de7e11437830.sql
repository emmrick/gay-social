-- Fix #1: Require authentication for profile_photos SELECT
DROP POLICY IF EXISTS "Anyone can view profile photos" ON public.profile_photos;

CREATE POLICY "Authenticated users can view profile photos"
  ON public.profile_photos FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix #2: Make media bucket private
UPDATE storage.buckets SET public = false WHERE id = 'media';