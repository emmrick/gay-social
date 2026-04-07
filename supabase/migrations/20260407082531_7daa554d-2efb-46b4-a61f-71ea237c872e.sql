
CREATE TABLE public.faq_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  article_id UUID REFERENCES public.faq_articles(id) ON DELETE CASCADE,
  static_article_id TEXT,
  vote TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id),
  UNIQUE (user_id, static_article_id)
);

ALTER TABLE public.faq_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback"
ON public.faq_feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
ON public.faq_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
ON public.faq_feedback FOR UPDATE
USING (auth.uid() = user_id);

-- Admins/moderators can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.faq_feedback FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
);
