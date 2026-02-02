-- Create table for broadcast notification history
CREATE TABLE public.broadcast_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_region TEXT,
  sent_by UUID NOT NULL,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  total_subscriptions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view broadcast history
CREATE POLICY "Admins can view broadcast history"
ON public.broadcast_notifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert broadcasts
CREATE POLICY "Admins can insert broadcasts"
ON public.broadcast_notifications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));