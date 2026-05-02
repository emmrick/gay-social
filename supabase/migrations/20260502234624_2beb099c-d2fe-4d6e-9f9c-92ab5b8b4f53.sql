
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS suggestion_decisions_inapp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS suggestion_decisions_push boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS suggestion_decisions_email boolean NOT NULL DEFAULT true;

-- Update trigger function to respect in-app preference
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
  _inapp_enabled BOOLEAN;
BEGIN
  IF NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(suggestion_decisions_inapp, true) INTO _inapp_enabled
    FROM public.notification_preferences WHERE user_id = NEW.user_id LIMIT 1;
  IF _inapp_enabled IS NULL THEN _inapp_enabled := true; END IF;

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

  IF _inapp_enabled THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url, is_read)
    VALUES (NEW.user_id, 'system', _title, _msg, '/profile', false);
  END IF;

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
