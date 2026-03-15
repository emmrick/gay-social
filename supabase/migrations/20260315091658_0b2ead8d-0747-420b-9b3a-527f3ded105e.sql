
CREATE TABLE public.user_active_conversations (
  user_id uuid PRIMARY KEY,
  active_private_user_id uuid,
  active_chat_room_id uuid,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_active_conversations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own row
CREATE POLICY "Users can upsert own active conversation"
  ON public.user_active_conversations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone authenticated can read (to check if recipient is viewing)
CREATE POLICY "Authenticated users can read active conversations"
  ON public.user_active_conversations
  FOR SELECT
  TO authenticated
  USING (true);
