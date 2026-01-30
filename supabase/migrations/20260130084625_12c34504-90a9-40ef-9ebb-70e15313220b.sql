-- Create enum for action types
CREATE TYPE public.moderation_action_type AS ENUM (
  'user_suspended',
  'user_unblocked',
  'verification_approved',
  'verification_rejected',
  'verification_requested',
  'report_resolved',
  'report_dismissed',
  'manual_verification'
);

-- Create moderation_actions table
CREATE TABLE public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL,
  performed_by UUID NOT NULL,
  action_type moderation_action_type NOT NULL,
  details TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_moderation_actions_target_user ON public.moderation_actions(target_user_id);
CREATE INDEX idx_moderation_actions_performed_by ON public.moderation_actions(performed_by);
CREATE INDEX idx_moderation_actions_created_at ON public.moderation_actions(created_at DESC);

-- Enable RLS
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

-- Admins and moderators can view all actions
CREATE POLICY "Admins can view all moderation actions"
ON public.moderation_actions
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Admins and moderators can insert actions
CREATE POLICY "Admins can insert moderation actions"
ON public.moderation_actions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));