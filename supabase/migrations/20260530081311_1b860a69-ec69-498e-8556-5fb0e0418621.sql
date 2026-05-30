ALTER TABLE public.plan_now_auto_replies
  ADD COLUMN IF NOT EXISTS custom_qa jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS media_tiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS presets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_preset_id text;