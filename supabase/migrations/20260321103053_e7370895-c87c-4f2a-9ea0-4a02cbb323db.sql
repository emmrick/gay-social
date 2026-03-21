-- Allow moderators to see all ads (for management panel)
CREATE POLICY "Moderators can read all ads"
ON public.ads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'));

-- Allow moderators to update ads (approve/reject/toggle)
CREATE POLICY "Moderators can update ads"
ON public.ads
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));