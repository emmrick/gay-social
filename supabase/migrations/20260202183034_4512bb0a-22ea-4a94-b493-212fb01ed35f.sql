-- Drop the overly permissive policy that allows anonymous access to chat_rooms
DROP POLICY IF EXISTS "Chat rooms are viewable by everyone" ON public.chat_rooms;

-- Create a more secure policy that requires authentication
CREATE POLICY "Chat rooms are viewable by authenticated users" 
ON public.chat_rooms 
FOR SELECT 
TO authenticated
USING (true);