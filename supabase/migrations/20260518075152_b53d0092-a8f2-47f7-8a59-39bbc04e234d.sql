-- Add image_urls array to ads (multi-image support)
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

-- Backfill from existing single image_url
UPDATE public.ads
SET image_urls = ARRAY[image_url]
WHERE (image_urls IS NULL OR array_length(image_urls, 1) IS NULL)
  AND image_url IS NOT NULL
  AND image_url <> '';

-- Trigger to keep image_url in sync with first element of image_urls
CREATE OR REPLACE FUNCTION public.sync_ad_primary_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.image_urls IS NOT NULL AND array_length(NEW.image_urls, 1) > 0 THEN
    NEW.image_url := NEW.image_urls[1];
  ELSIF NEW.image_url IS NOT NULL AND NEW.image_url <> '' THEN
    NEW.image_urls := ARRAY[NEW.image_url];
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ad_primary_image ON public.ads;
CREATE TRIGGER trg_sync_ad_primary_image
  BEFORE INSERT OR UPDATE OF image_url, image_urls ON public.ads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ad_primary_image();