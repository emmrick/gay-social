-- Create table to track read status of messages
CREATE TABLE public.message_read_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_partner_id UUID NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_partner_id)
);

-- Enable RLS
ALTER TABLE public.message_read_status ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own read status
CREATE POLICY "Users can view their own read status"
ON public.message_read_status FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read status"
ON public.message_read_status FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read status"
ON public.message_read_status FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_message_read_status_updated_at
BEFORE UPDATE ON public.message_read_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast lookups
CREATE INDEX idx_message_read_status_user ON public.message_read_status(user_id);
CREATE INDEX idx_message_read_status_lookup ON public.message_read_status(user_id, conversation_partner_id);