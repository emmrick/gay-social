-- Remove the old restrictive policy
DROP POLICY IF EXISTS "Chat rooms are viewable by authenticated users" ON public.chat_rooms;