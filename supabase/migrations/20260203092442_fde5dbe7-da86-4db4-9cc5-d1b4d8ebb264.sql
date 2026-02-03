-- Create table to track swipe actions
CREATE TABLE public.swipe_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('like', 'dislike', 'hide')),
  credits_spent NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE, -- For dislike: 3 months from creation
  UNIQUE(user_id, target_user_id, action_type)
);

-- Enable RLS
ALTER TABLE public.swipe_actions ENABLE ROW LEVEL SECURITY;

-- Users can view their own swipe actions
CREATE POLICY "Users can view their own swipe actions"
ON public.swipe_actions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own swipe actions
CREATE POLICY "Users can insert their own swipe actions"
ON public.swipe_actions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own swipe actions
CREATE POLICY "Users can update their own swipe actions"
ON public.swipe_actions
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own swipe actions
CREATE POLICY "Users can delete their own swipe actions"
ON public.swipe_actions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_swipe_actions_user_id ON public.swipe_actions(user_id);
CREATE INDEX idx_swipe_actions_target_user_id ON public.swipe_actions(target_user_id);
CREATE INDEX idx_swipe_actions_expires_at ON public.swipe_actions(expires_at) WHERE expires_at IS NOT NULL;

-- Enable realtime for matches notification
ALTER PUBLICATION supabase_realtime ADD TABLE public.swipe_actions;