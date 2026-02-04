-- Allow public read access to chat_rooms for registration
CREATE POLICY "Chat rooms are viewable by everyone" 
ON public.chat_rooms 
FOR SELECT 
USING (true);