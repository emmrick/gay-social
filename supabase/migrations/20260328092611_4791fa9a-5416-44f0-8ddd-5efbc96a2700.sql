CREATE POLICY "Profile owner can update is_seen"
ON public.profile_reactions
FOR UPDATE
TO authenticated
USING (auth.uid() = profile_user_id)
WITH CHECK (auth.uid() = profile_user_id);