-- Add message_id column to reports table to support reporting specific messages
ALTER TABLE public.reports 
ADD COLUMN message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN report_type text NOT NULL DEFAULT 'user' CHECK (report_type IN ('user', 'message', 'group'));

-- Add suspension fields to user_blocks for temporary suspensions
ALTER TABLE public.user_blocks
ADD COLUMN suspension_type text CHECK (suspension_type IN ('temporary', 'permanent')),
ADD COLUMN suspension_duration interval,
ADD COLUMN suspension_ends_at timestamp with time zone;

-- Create function to check if user is suspended (temporary block)
CREATE OR REPLACE FUNCTION public.is_user_suspended(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_blocks
    WHERE user_id = _user_id
      AND is_active = true
      AND (
        suspension_type = 'permanent' 
        OR (suspension_type = 'temporary' AND suspension_ends_at > now())
      )
  )
$$;

-- Add index for faster message lookups in reports
CREATE INDEX IF NOT EXISTS idx_reports_message_id ON public.reports(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_blocks_suspension ON public.user_blocks(user_id, is_active, suspension_ends_at);