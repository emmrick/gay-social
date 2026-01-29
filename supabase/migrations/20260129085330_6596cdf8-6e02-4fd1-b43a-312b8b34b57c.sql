-- Create profile_photos table for multiple photos per user
CREATE TABLE public.profile_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_profile_photos_user_id ON public.profile_photos(user_id);
CREATE INDEX idx_profile_photos_order ON public.profile_photos(user_id, display_order);

-- Enable RLS
ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

-- Users can view anyone's photos (public profiles)
CREATE POLICY "Anyone can view profile photos"
ON public.profile_photos
FOR SELECT
USING (true);

-- Users can only insert their own photos
CREATE POLICY "Users can insert their own photos"
ON public.profile_photos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own photos
CREATE POLICY "Users can update their own photos"
ON public.profile_photos
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own photos
CREATE POLICY "Users can delete their own photos"
ON public.profile_photos
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_profile_photos_updated_at
BEFORE UPDATE ON public.profile_photos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Limit photos per user (max 6) via trigger
CREATE OR REPLACE FUNCTION public.check_photo_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.profile_photos WHERE user_id = NEW.user_id) >= 6 THEN
    RAISE EXCEPTION 'Maximum 6 photos allowed per user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_photo_limit
BEFORE INSERT ON public.profile_photos
FOR EACH ROW
EXECUTE FUNCTION public.check_photo_limit();