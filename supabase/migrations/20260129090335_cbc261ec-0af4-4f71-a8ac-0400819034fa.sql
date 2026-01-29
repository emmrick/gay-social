-- Create table for saved messages
CREATE TABLE public.saved_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_saved_messages_user_id ON public.saved_messages(user_id);

-- Enable RLS
ALTER TABLE public.saved_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own saved messages
CREATE POLICY "Users can view their own saved messages"
  ON public.saved_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved messages"
  ON public.saved_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved messages"
  ON public.saved_messages
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved messages"
  ON public.saved_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_saved_messages_updated_at
  BEFORE UPDATE ON public.saved_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();