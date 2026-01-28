-- Create user_blocks table
CREATE TABLE public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  blocked_by UUID NOT NULL,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unblocked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(_user_id UUID)
RETURNS BOOLEAN
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
  )
$$;

-- Admins can view all blocks
CREATE POLICY "Admins can view all blocks"
ON public.user_blocks
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert blocks
CREATE POLICY "Admins can insert blocks"
ON public.user_blocks
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update blocks
CREATE POLICY "Admins can update blocks"
ON public.user_blocks
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Users can check if they are blocked (for app access)
CREATE POLICY "Users can view their own block status"
ON public.user_blocks
FOR SELECT
USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_user_blocks_user_id ON public.user_blocks(user_id) WHERE is_active = true;
CREATE INDEX idx_user_blocks_active ON public.user_blocks(is_active);