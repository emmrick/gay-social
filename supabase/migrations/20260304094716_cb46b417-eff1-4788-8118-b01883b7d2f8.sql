
-- Error logs table for collecting client-side errors
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_source TEXT, -- 'unhandled_rejection', 'error_boundary', 'global_error', 'network_error'
  page_url TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for admin queries
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_is_resolved ON public.error_logs(is_resolved);
CREATE INDEX idx_error_logs_error_source ON public.error_logs(error_source);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can INSERT their own errors
CREATE POLICY "Users can insert their own error logs"
ON public.error_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins/moderators can read all
CREATE POLICY "Admins can read all error logs"
ON public.error_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Admins can update (resolve)
CREATE POLICY "Admins can update error logs"
ON public.error_logs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Admins can delete
CREATE POLICY "Admins can delete error logs"
ON public.error_logs FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Also allow anonymous inserts for errors before login
CREATE POLICY "Anon can insert error logs"
ON public.error_logs FOR INSERT TO anon
WITH CHECK (user_id IS NULL);
