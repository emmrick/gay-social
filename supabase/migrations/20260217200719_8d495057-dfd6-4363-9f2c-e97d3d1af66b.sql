
-- Allow users to acknowledge their own investigation notifications
CREATE POLICY "Users can acknowledge their own notifications"
ON public.investigation_notifications
FOR UPDATE
USING (auth.uid() = notified_user_id)
WITH CHECK (auth.uid() = notified_user_id);
