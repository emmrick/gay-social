
-- Add push_announcements to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS push_announcements boolean NOT NULL DEFAULT true;

-- Create conversation mute table for per-conversation muting (private chats)
CREATE TABLE IF NOT EXISTS public.conversation_mute_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id text NOT NULL,
  is_muted boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

ALTER TABLE public.conversation_mute_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mute prefs"
  ON public.conversation_mute_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mute prefs"
  ON public.conversation_mute_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mute prefs"
  ON public.conversation_mute_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mute prefs"
  ON public.conversation_mute_preferences FOR DELETE
  USING (auth.uid() = user_id);
