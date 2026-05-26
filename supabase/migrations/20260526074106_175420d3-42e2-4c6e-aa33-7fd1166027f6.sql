
-- 1) Manual overrides per conversation (user_id = the plan-now owner, other_user_id = the chat partner)
CREATE TABLE IF NOT EXISTS public.plan_now_manual_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  other_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, other_user_id)
);

ALTER TABLE public.plan_now_manual_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own plan-now overrides"
  ON public.plan_now_manual_overrides
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) Flag on messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_auto_reply boolean NOT NULL DEFAULT false;

-- 3) Allow new message_type 'auto_reply'
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type = ANY (ARRAY[
    'text','image','video','audio','file',
    'album_share','album_access_request',
    'credit_request','credit_gift',
    'system_screenshot','system_external_warning',
    'auto_reply'
  ]));

-- 4) Trigger: when a new private text message is inserted, if the recipient has an active
-- Plan Now session and no manual override, fire the edge function asynchronously.
CREATE OR REPLACE FUNCTION public.trigger_plan_now_auto_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_active boolean;
  _has_override boolean;
  _enabled boolean;
  _supabase_url text;
  _service_key text;
BEGIN
  -- Only react to private text messages from a real human (not auto-reply, not system)
  IF NEW.is_private IS NOT TRUE THEN RETURN NEW; END IF;
  IF NEW.recipient_id IS NULL OR NEW.sender_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_auto_reply, false) THEN RETURN NEW; END IF;
  IF NEW.message_type IS DISTINCT FROM 'text' THEN RETURN NEW; END IF;
  IF NEW.content IS NULL OR length(trim(NEW.content)) = 0 THEN RETURN NEW; END IF;

  -- Recipient must have an active plan-now session
  SELECT public.has_active_plan_now(NEW.recipient_id) INTO _has_active;
  IF NOT _has_active THEN RETURN NEW; END IF;

  -- Recipient must have enabled auto-replies
  SELECT COALESCE(enabled, true) INTO _enabled
  FROM public.plan_now_auto_replies WHERE user_id = NEW.recipient_id;
  IF _enabled IS NOT NULL AND NOT _enabled THEN RETURN NEW; END IF;

  -- No manual override for this conversation
  SELECT EXISTS (
    SELECT 1 FROM public.plan_now_manual_overrides
    WHERE user_id = NEW.recipient_id AND other_user_id = NEW.sender_id
  ) INTO _has_override;
  IF _has_override THEN RETURN NEW; END IF;

  -- Fire the edge function (best-effort, async)
  SELECT decrypted_secret INTO _supabase_url FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;
  SELECT decrypted_secret INTO _service_key FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1;

  IF _supabase_url IS NOT NULL AND _service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := _supabase_url || '/functions/v1/plan-now-auto-reply',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_key
      ),
      body := jsonb_build_object(
        'message_id', NEW.id::text,
        'sender_id', NEW.sender_id::text,
        'recipient_id', NEW.recipient_id::text,
        'content', NEW.content
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plan_now_auto_reply_trigger ON public.messages;
CREATE TRIGGER plan_now_auto_reply_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.trigger_plan_now_auto_reply();
