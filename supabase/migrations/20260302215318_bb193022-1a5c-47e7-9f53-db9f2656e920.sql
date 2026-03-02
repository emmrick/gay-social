
-- Add chatbot history and rating columns to support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS chatbot_history jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rating_emoji text,
  ADD COLUMN IF NOT EXISTS rating_comment text,
  ADD COLUMN IF NOT EXISTS rated_at timestamptz;
