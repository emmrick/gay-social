
-- Table for tracking user infractions (forbidden word violations)
CREATE TABLE public.user_infractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  detected_word TEXT NOT NULL,
  message_content TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT 'chat',
  warning_number INTEGER NOT NULL DEFAULT 1,
  is_sanctioned BOOLEAN NOT NULL DEFAULT false,
  support_ticket_id UUID REFERENCES public.support_tickets(id),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_infractions ENABLE ROW LEVEL SECURITY;

-- Users can view their own infractions
CREATE POLICY "Users can view their own infractions"
  ON public.user_infractions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System/user can insert infractions for themselves
CREATE POLICY "Users can insert their own infractions"
  ON public.user_infractions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins/moderators can view all infractions
CREATE POLICY "Admins can view all infractions"
  ON public.user_infractions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- Admins/moderators can update infractions (resolve)
CREATE POLICY "Admins can update infractions"
  ON public.user_infractions
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_infractions;
