-- Create table for profile reactions
CREATE TABLE public.profile_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_user_id UUID NOT NULL,
  reactor_user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_user_id, reactor_user_id, emoji)
);

-- Enable Row Level Security
ALTER TABLE public.profile_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view all reactions on any profile
CREATE POLICY "Anyone can view profile reactions"
  ON public.profile_reactions
  FOR SELECT
  USING (true);

-- Users can add their own reactions
CREATE POLICY "Users can add their own reactions"
  ON public.profile_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = reactor_user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
  ON public.profile_reactions
  FOR DELETE
  USING (auth.uid() = reactor_user_id);

-- Create indexes for performance
CREATE INDEX idx_profile_reactions_profile ON public.profile_reactions(profile_user_id);
CREATE INDEX idx_profile_reactions_reactor ON public.profile_reactions(reactor_user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_reactions;