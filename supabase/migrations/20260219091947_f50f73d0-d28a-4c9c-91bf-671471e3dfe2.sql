
-- Allow group creators to update their custom groups (name, description, avatar)
CREATE POLICY "Group creators can update their groups"
ON public.chat_rooms
FOR UPDATE
USING (is_custom = true AND created_by = auth.uid())
WITH CHECK (is_custom = true AND created_by = auth.uid());

-- Allow group creators to delete their custom groups
CREATE POLICY "Group creators can delete their groups"
ON public.chat_rooms
FOR DELETE
USING (is_custom = true AND created_by = auth.uid());

-- Pinned messages table
CREATE TABLE public.pinned_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_room_id, message_id)
);

ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view pinned messages"
ON public.pinned_messages FOR SELECT USING (true);

CREATE POLICY "Group admins can pin messages"
ON public.pinned_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_room_members m
    WHERE m.chat_room_id = pinned_messages.chat_room_id
    AND m.user_id = auth.uid()
    AND m.role = 'admin'
  )
);

CREATE POLICY "Group admins can unpin messages"
ON public.pinned_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM chat_room_members m
    WHERE m.chat_room_id = pinned_messages.chat_room_id
    AND m.user_id = auth.uid()
    AND m.role = 'admin'
  )
);

-- Group events table
CREATE TABLE public.group_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group events"
ON public.group_events FOR SELECT USING (true);

CREATE POLICY "Group members can create events"
ON public.group_events FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM chat_room_members m
    WHERE m.chat_room_id = group_events.chat_room_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Event creators can update their events"
ON public.group_events FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Event creators or admins can delete events"
ON public.group_events FOR DELETE
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM chat_room_members m
    WHERE m.chat_room_id = group_events.chat_room_id
    AND m.user_id = auth.uid()
    AND m.role = 'admin'
  )
);

-- Group event RSVPs
CREATE TABLE public.group_event_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.group_event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view RSVPs"
ON public.group_event_rsvps FOR SELECT USING (true);

CREATE POLICY "Users can RSVP"
ON public.group_event_rsvps FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their RSVP"
ON public.group_event_rsvps FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their RSVP"
ON public.group_event_rsvps FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for group avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('group-avatars', 'group-avatars', true);

CREATE POLICY "Anyone can view group avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'group-avatars');

CREATE POLICY "Authenticated users can upload group avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'group-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their group avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'group-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their group avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'group-avatars' AND auth.uid() IS NOT NULL);

-- Enable realtime for pinned_messages and group_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.pinned_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_event_rsvps;
