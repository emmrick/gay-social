
-- Fix: trigger should only create task when submitted_at becomes non-null (actual submission)
CREATE OR REPLACE FUNCTION public.create_verification_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rate_cents INTEGER;
  _username TEXT;
BEGIN
  -- Only create task when submitted_at transitions from NULL to non-NULL (actual document submission)
  IF NEW.status = 'pending' 
     AND NEW.submitted_at IS NOT NULL 
     AND (OLD IS NULL OR OLD.submitted_at IS NULL) THEN
    
    -- Get the rate for identity verification
    SELECT rate_cents INTO _rate_cents FROM public.task_rates WHERE task_type = 'identity_verification' AND is_active = true;
    
    -- Get username
    SELECT username INTO _username FROM public.profiles WHERE user_id = NEW.user_id;

    -- Check no duplicate pending task for this entity
    IF NOT EXISTS (
      SELECT 1 FROM public.moderation_tasks 
      WHERE target_entity_id = NEW.id 
        AND task_type = 'identity_verification' 
        AND status IN ('pending', 'reserved')
    ) THEN
      INSERT INTO public.moderation_tasks (task_type, target_entity_id, target_user_id, reward_cents, description, metadata)
      VALUES (
        'identity_verification',
        NEW.id,
        NEW.user_id,
        COALESCE(_rate_cents, 50),
        'Vérifier l''identité de ' || COALESCE(_username, 'un utilisateur'),
        jsonb_build_object('verification_id', NEW.id, 'username', _username)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
