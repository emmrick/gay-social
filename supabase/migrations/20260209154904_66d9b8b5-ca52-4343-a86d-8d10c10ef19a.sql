
-- Table for chatbot configuration per user
CREATE TABLE public.user_chatbot_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  greeting_message TEXT DEFAULT 'Salut ! Je suis le chatbot de ce profil. Pose-moi des questions pour en savoir plus ! 😊',
  chatbot_info TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_chatbot_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read active chatbot configs
CREATE POLICY "Anyone can read active chatbot configs"
ON public.user_chatbot_config
FOR SELECT
USING (true);

-- Users can manage their own config
CREATE POLICY "Users can insert their own chatbot config"
ON public.user_chatbot_config
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chatbot config"
ON public.user_chatbot_config
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chatbot config"
ON public.user_chatbot_config
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_chatbot_config_updated_at
BEFORE UPDATE ON public.user_chatbot_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table for chatbot conversation messages (ephemeral, not stored long-term)
CREATE TABLE public.chatbot_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_user_id UUID NOT NULL,
  profile_user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- Visitors can read their own conversations
CREATE POLICY "Users can read their own chatbot conversations"
ON public.chatbot_conversations
FOR SELECT
USING (auth.uid() = visitor_user_id);

-- Users can insert messages
CREATE POLICY "Users can insert chatbot messages"
ON public.chatbot_conversations
FOR INSERT
WITH CHECK (auth.uid() = visitor_user_id);

-- Profile owners can read conversations about them
CREATE POLICY "Profile owners can read conversations about them"
ON public.chatbot_conversations
FOR SELECT
USING (auth.uid() = profile_user_id);
