
-- Table for moderator/admin saved reply templates
CREATE TABLE public.moderator_saved_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  label TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.moderator_saved_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can view their own saved replies"
  ON public.moderator_saved_replies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Moderators can insert their own saved replies"
  ON public.moderator_saved_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)));

CREATE POLICY "Moderators can update their own saved replies"
  ON public.moderator_saved_replies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Moderators can delete their own saved replies"
  ON public.moderator_saved_replies FOR DELETE
  USING (auth.uid() = user_id);
