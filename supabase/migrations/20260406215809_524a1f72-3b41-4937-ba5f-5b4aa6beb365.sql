
-- Add status column to profile_photos
ALTER TABLE public.profile_photos 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Mark all existing photos as approved
UPDATE public.profile_photos SET status = 'approved' WHERE status = 'pending';

-- Create trigger to auto-create moderation task on photo insert
CREATE OR REPLACE FUNCTION public.create_photo_moderation_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rate_cents INTEGER;
  _username TEXT;
BEGIN
  -- Only on insert or when photo_url changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.photo_url IS DISTINCT FROM OLD.photo_url) THEN
    SELECT rate_cents INTO _rate_cents FROM public.task_rates WHERE task_type = 'content_moderation' AND is_active = true;
    SELECT username INTO _username FROM public.profiles WHERE user_id = NEW.user_id;

    -- Set status to pending
    NEW.status := 'pending';

    -- Avoid duplicate tasks
    IF NOT EXISTS (
      SELECT 1 FROM public.moderation_tasks 
      WHERE target_entity_id = NEW.id 
        AND task_type = 'content_moderation' 
        AND status IN ('pending', 'reserved')
        AND metadata->>'type' = 'photo_review'
    ) THEN
      INSERT INTO public.moderation_tasks (task_type, target_entity_id, target_user_id, reward_cents, description, metadata)
      VALUES (
        'content_moderation',
        NEW.id,
        NEW.user_id,
        COALESCE(_rate_cents, 5),
        'Vérifier la photo de profil de ' || COALESCE(_username, 'un utilisateur'),
        jsonb_build_object(
          'photo_id', NEW.id, 
          'photo_url', NEW.photo_url, 
          'username', _username, 
          'type', 'photo_review'
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_photo_moderation ON public.profile_photos;
CREATE TRIGGER trg_photo_moderation
BEFORE INSERT OR UPDATE ON public.profile_photos
FOR EACH ROW
EXECUTE FUNCTION public.create_photo_moderation_task();
