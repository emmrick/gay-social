
-- Create trigger function to generate a moderation task when a visitor support session is created
CREATE OR REPLACE FUNCTION public.create_visitor_support_task()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _rate_cents INTEGER;
  _visitor_name TEXT;
BEGIN
  IF NEW.status = 'open' THEN
    -- Get the rate for support_chat tasks
    SELECT rate_cents INTO _rate_cents FROM public.task_rates WHERE task_type = 'support_chat' AND is_active = true;

    _visitor_name := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');

    -- Avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM public.moderation_tasks
      WHERE target_entity_id = NEW.id
        AND task_type = 'support_chat'
        AND status IN ('pending', 'reserved')
    ) THEN
      INSERT INTO public.moderation_tasks (task_type, target_entity_id, reward_cents, description, metadata)
      VALUES (
        'support_chat',
        NEW.id,
        COALESCE(_rate_cents, 5),
        'Demande de support visiteur de ' || trim(_visitor_name),
        jsonb_build_object(
          'visitor_session_id', NEW.id,
          'visitor_name', trim(_visitor_name),
          'visitor_email', NEW.email,
          'is_visitor', true
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger on visitor_support_sessions INSERT
CREATE TRIGGER trg_create_visitor_support_task
  AFTER INSERT ON public.visitor_support_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_visitor_support_task();
