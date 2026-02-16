
-- Add new task types to the enum
ALTER TYPE public.moderator_task_type ADD VALUE IF NOT EXISTS 'content_moderation';
ALTER TYPE public.moderator_task_type ADD VALUE IF NOT EXISTS 'withdrawal_management';
ALTER TYPE public.moderator_task_type ADD VALUE IF NOT EXISTS 'promo_validation';
ALTER TYPE public.moderator_task_type ADD VALUE IF NOT EXISTS 'support_chat';
