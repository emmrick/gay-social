-- Create enum for report reasons
CREATE TYPE public.report_reason AS ENUM (
  'harassment',
  'inappropriate_content', 
  'spam',
  'fake_profile',
  'underage',
  'other'
);

-- Create enum for report status
CREATE TYPE public.report_status AS ENUM (
  'pending',
  'reviewed',
  'resolved',
  'dismissed'
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  reason report_reason NOT NULL,
  description TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports (but not report themselves)
CREATE POLICY "Users can create reports"
ON public.reports
FOR INSERT
WITH CHECK (
  auth.uid() = reporter_id 
  AND auth.uid() != reported_user_id
);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.reports
FOR SELECT
USING (reporter_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_reports_reported_user ON public.reports(reported_user_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);