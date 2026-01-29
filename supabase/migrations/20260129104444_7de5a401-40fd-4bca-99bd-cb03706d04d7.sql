-- Create album_shares table for tracking who albums are shared with
CREATE TABLE public.album_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES public.user_albums(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL,
  shared_by_user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL means unlimited
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_album_shares_album_id ON public.album_shares(album_id);
CREATE INDEX idx_album_shares_shared_with ON public.album_shares(shared_with_user_id);
CREATE INDEX idx_album_shares_active ON public.album_shares(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.album_shares ENABLE ROW LEVEL SECURITY;

-- Users can view shares for albums they own
CREATE POLICY "Album owners can view their album shares"
  ON public.album_shares
  FOR SELECT
  USING (shared_by_user_id = auth.uid());

-- Users can view albums shared with them
CREATE POLICY "Users can view shares they received"
  ON public.album_shares
  FOR SELECT
  USING (shared_with_user_id = auth.uid() AND is_active = true);

-- Album owners can create shares
CREATE POLICY "Album owners can create shares"
  ON public.album_shares
  FOR INSERT
  WITH CHECK (shared_by_user_id = auth.uid());

-- Album owners can update shares (stop sharing, etc.)
CREATE POLICY "Album owners can update their shares"
  ON public.album_shares
  FOR UPDATE
  USING (shared_by_user_id = auth.uid());

-- Album owners can delete shares
CREATE POLICY "Album owners can delete their shares"
  ON public.album_shares
  FOR DELETE
  USING (shared_by_user_id = auth.uid());

-- Add is_premium field to profiles for caching subscription status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Add trigger to update updated_at
CREATE TRIGGER update_album_shares_updated_at
  BEFORE UPDATE ON public.album_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for album_shares
ALTER PUBLICATION supabase_realtime ADD TABLE public.album_shares;