
-- ============================================================
-- 1. Group message read receipts
-- ============================================================
CREATE TABLE public.group_message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.group_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view read receipts for messages in their groups"
  ON public.group_message_reads FOR SELECT
  USING (true);

CREATE POLICY "Users can mark messages as read"
  ON public.group_message_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_group_message_reads_message ON public.group_message_reads(message_id);
CREATE INDEX idx_group_message_reads_user ON public.group_message_reads(user_id);

-- Enable realtime for read receipts
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_message_reads;

-- ============================================================
-- 2. Extend chat_rooms for custom groups
-- ============================================================
ALTER TABLE public.chat_rooms
  ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN created_by UUID,
  ADD COLUMN custom_name TEXT,
  ADD COLUMN avatar_url TEXT,
  ADD COLUMN description TEXT;

-- ============================================================
-- 3. Custom group members
-- ============================================================
CREATE TABLE public.chat_room_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_room_id, user_id)
);

ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group members"
  ON public.chat_room_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join groups"
  ON public.chat_room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage members"
  ON public.chat_room_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_members m
      WHERE m.chat_room_id = chat_room_members.chat_room_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
  );

CREATE INDEX idx_chat_room_members_room ON public.chat_room_members(chat_room_id);
CREATE INDEX idx_chat_room_members_user ON public.chat_room_members(user_id);

-- Enable realtime for members
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_members;
