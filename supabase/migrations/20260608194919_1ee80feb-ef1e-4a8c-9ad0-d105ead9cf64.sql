
-- admin_popups: restrict SELECT to authenticated + filter is_active
DROP POLICY IF EXISTS "Anyone can read active popups" ON public.admin_popups;
CREATE POLICY "Authenticated can read active popups"
ON public.admin_popups FOR SELECT
TO authenticated
USING (is_active = true);

-- chat_room_members: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Members can view group members" ON public.chat_room_members;
CREATE POLICY "Authenticated can view group members"
ON public.chat_room_members FOR SELECT
TO authenticated
USING (true);

-- group_event_rsvps: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view RSVPs" ON public.group_event_rsvps;
CREATE POLICY "Authenticated can view RSVPs"
ON public.group_event_rsvps FOR SELECT
TO authenticated
USING (true);

-- tween_follows: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view tween follows" ON public.tween_follows;
CREATE POLICY "Authenticated can view tween follows"
ON public.tween_follows FOR SELECT
TO authenticated
USING (true);

-- typing_indicators: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view typing indicators in public rooms" ON public.typing_indicators;
CREATE POLICY "Authenticated can view typing indicators"
ON public.typing_indicators FOR SELECT
TO authenticated
USING (true);

-- user_chatbot_config: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can read active chatbot configs" ON public.user_chatbot_config;
CREATE POLICY "Authenticated can read chatbot configs"
ON public.user_chatbot_config FOR SELECT
TO authenticated
USING (true);

-- visitor_support_messages: anon can only send sender_type='visitor';
-- staff can post any sender_type via authenticated session.
DROP POLICY IF EXISTS "Anyone can insert visitor messages" ON public.visitor_support_messages;

CREATE POLICY "Anon visitors can insert visitor messages"
ON public.visitor_support_messages FOR INSERT
TO anon
WITH CHECK (
  session_id IS NOT NULL
  AND content IS NOT NULL
  AND length(content) BETWEEN 1 AND 4000
  AND sender_type = 'visitor'
  AND EXISTS (
    SELECT 1 FROM public.visitor_support_sessions s
    WHERE s.id = visitor_support_messages.session_id AND s.closed_at IS NULL
  )
);

CREATE POLICY "Authenticated users can insert visitor messages"
ON public.visitor_support_messages FOR INSERT
TO authenticated
WITH CHECK (
  session_id IS NOT NULL
  AND content IS NOT NULL
  AND length(content) BETWEEN 1 AND 4000
  AND EXISTS (
    SELECT 1 FROM public.visitor_support_sessions s
    WHERE s.id = visitor_support_messages.session_id AND s.closed_at IS NULL
  )
  AND (
    sender_type = 'visitor'
    OR (
      sender_type IN ('agent', 'system', 'bot')
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'moderator'::app_role)
      )
    )
  )
);
