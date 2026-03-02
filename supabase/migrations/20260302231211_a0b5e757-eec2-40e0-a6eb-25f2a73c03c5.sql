-- Allow moderators to delete chatbot nodes
CREATE POLICY "Moderators can delete nodes"
ON public.help_chatbot_nodes FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to insert chatbot nodes
CREATE POLICY "Moderators can insert nodes"
ON public.help_chatbot_nodes FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to update chatbot nodes
CREATE POLICY "Moderators can update nodes"
ON public.help_chatbot_nodes FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));