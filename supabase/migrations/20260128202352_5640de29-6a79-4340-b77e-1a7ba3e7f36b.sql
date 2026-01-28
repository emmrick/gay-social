-- Drop existing insert policy on messages
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- Create new policy that checks if user is blocked
CREATE POLICY "Users can send messages if not blocked"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() 
  AND NOT is_user_blocked(auth.uid())
);

-- Also prevent blocked users from creating conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.private_conversations;

CREATE POLICY "Users can create conversations if not blocked"
ON public.private_conversations FOR INSERT
WITH CHECK (
  (user1_id = auth.uid() OR user2_id = auth.uid())
  AND NOT is_user_blocked(auth.uid())
);

-- Prevent blocked users from creating reports
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;

CREATE POLICY "Users can create reports if not blocked"
ON public.reports FOR INSERT
WITH CHECK (
  auth.uid() = reporter_id 
  AND auth.uid() <> reported_user_id
  AND NOT is_user_blocked(auth.uid())
);