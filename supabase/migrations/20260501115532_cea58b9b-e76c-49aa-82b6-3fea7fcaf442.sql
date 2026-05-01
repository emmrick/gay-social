-- Trigger function: fires when a user_suggestion status changes to approved/rejected
CREATE OR REPLACE FUNCTION public.notify_suggestion_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _supabase_url TEXT;
  _service_key TEXT;
  _title TEXT;
  _msg TEXT;
BEGIN
  -- Only react to actual transitions into approved/rejected
  IF NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- 1. In-app notification (always)
  IF NEW.status = 'approved' THEN
    _title := '🎉 Votre idée a été approuvée !';
    _msg := CASE
      WHEN COALESCE(NEW.credits_awarded, 0) > 0
        THEN '« ' || LEFT(COALESCE(NEW.title, 'Votre proposition'), 80) ||
             ' » — +' || NEW.credits_awarded || ' crédits crédités !'
      ELSE '« ' || LEFT(COALESCE(NEW.title, 'Votre proposition'), 80) || ' » a été approuvée. Merci !'
    END;
  ELSE
    _title := 'Mise à jour sur votre proposition';
    _msg := '« ' || LEFT(COALESCE(NEW.title, 'Votre proposition'), 80) ||
            ' » n''a pas été retenue cette fois-ci.';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, action_url, is_read)
  VALUES (NEW.user_id, 'system', _title, _msg, '/profile', false);

  -- 2. Push + email via dedicated edge function (best-effort, async via pg_net)
  SELECT decrypted_secret INTO _supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;
  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1;

  IF _supabase_url IS NOT NULL AND _service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := _supabase_url || '/functions/v1/notify-suggestion-decision',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_key
      ),
      body := jsonb_build_object(
        'suggestion_id', NEW.id::text,
        'user_id', NEW.user_id::text,
        'status', NEW.status,
        'title', NEW.title,
        'credits_awarded', NEW.credits_awarded,
        'admin_notes', NEW.admin_notes
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_suggestion_decision ON public.user_suggestions;
CREATE TRIGGER trg_notify_suggestion_decision
AFTER UPDATE OF status ON public.user_suggestions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_suggestion_decision();

-- Allow the trigger to insert notifications (system-generated)
DROP POLICY IF EXISTS "System can insert suggestion decision notifications" ON public.notifications;
CREATE POLICY "System can insert suggestion decision notifications"
ON public.notifications
FOR INSERT
WITH CHECK (type = 'system');