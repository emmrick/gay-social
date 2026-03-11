
-- Fix Gay17's avatar_url now
UPDATE public.profiles 
SET avatar_url = (
  SELECT photo_url FROM public.profile_photos 
  WHERE user_id = profiles.user_id AND is_primary = true 
  LIMIT 1
)
WHERE avatar_url IS NULL 
AND EXISTS (SELECT 1 FROM public.profile_photos WHERE user_id = profiles.user_id);

-- Create trigger to auto-sync avatar_url when a photo is inserted and profile has no avatar
CREATE OR REPLACE FUNCTION public.auto_set_avatar_on_photo_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET avatar_url = NEW.photo_url
  WHERE user_id = NEW.user_id
    AND avatar_url IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_set_avatar_on_photo_insert ON public.profile_photos;
CREATE TRIGGER trg_auto_set_avatar_on_photo_insert
  AFTER INSERT ON public.profile_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_avatar_on_photo_insert();
