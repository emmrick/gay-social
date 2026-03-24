
-- 1. Add sms_notified flag to moderation_tasks
ALTER TABLE public.moderation_tasks ADD COLUMN IF NOT EXISTS sms_notified boolean NOT NULL DEFAULT false;

-- 2. Update the trigger to remove immediate SMS sending
CREATE OR REPLACE FUNCTION public.notify_moderators_new_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _mod RECORD;
BEGIN
  -- Send in-app notifications to all moderators/admins
  FOR _mod IN 
    SELECT DISTINCT ur.user_id 
    FROM public.user_roles ur 
    WHERE ur.role IN ('admin', 'moderator')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, action_url, is_read)
    VALUES (
      _mod.user_id,
      'system',
      '🔔 Nouvelle mission disponible',
      COALESCE(NEW.description, 'Une nouvelle mission de modération est en attente.'),
      '/admin',
      false
    );
  END LOOP;

  -- Send push notifications via pg_net
  PERFORM net.http_post(
    url := 'https://vxrsqftlaguiwprcqlbw.supabase.co/functions/v1/notify-mission-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4cnNxZnRsYWd1aXdwcmNxbGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MjQ1ODgsImV4cCI6MjA4NTIwMDU4OH0.Hcpc4GFLyV3zreSW3hfVzAHaHnMtA9fEivYf2C2MSHc',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4cnNxZnRsYWd1aXdwcmNxbGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MjQ1ODgsImV4cCI6MjA4NTIwMDU4OH0.Hcpc4GFLyV3zreSW3hfVzAHaHnMtA9fEivYf2C2MSHc'
    ),
    body := jsonb_build_object(
      'task_id', NEW.id::text,
      'task_type', NEW.task_type,
      'description', COALESCE(NEW.description, ''),
      'reward_cents', NEW.reward_cents
    )
  );

  -- SMS is NO LONGER sent immediately.
  -- A cron job checks every minute for tasks pending > 5 min with no online moderators.

  RETURN NEW;
END;
$function$;

-- 3. Create function to check for stale tasks and send SMS
CREATE OR REPLACE FUNCTION public.check_stale_tasks_send_sms()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _task RECORD;
  _online_mod_count integer;
  _supabase_url TEXT := 'https://vxrsqftlaguiwprcqlbw.supabase.co';
  _anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4cnNxZnRsYWd1aXdwcmNxbGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MjQ1ODgsImV4cCI6MjA4NTIwMDU4OH0.Hcpc4GFLyV3zreSW3hfVzAHaHnMtA9fEivYf2C2MSHc';
BEGIN
  -- Count online moderators/admins (active in last 5 minutes)
  SELECT COUNT(*) INTO _online_mod_count
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role IN ('admin', 'moderator')
    AND p.is_online = true
    AND p.last_seen > now() - interval '5 minutes';

  -- If moderators are online, no need to send SMS
  IF _online_mod_count > 0 THEN
    RETURN;
  END IF;

  -- Find tasks pending for more than 5 minutes without SMS sent
  FOR _task IN
    SELECT id, task_type, description, reward_cents
    FROM public.moderation_tasks
    WHERE status = 'pending'
      AND sms_notified = false
      AND created_at < now() - interval '5 minutes'
  LOOP
    -- Send SMS via edge function
    PERFORM net.http_post(
      url := _supabase_url || '/functions/v1/notify-mission-sms',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _anon_key,
        'apikey', _anon_key
      ),
      body := jsonb_build_object(
        'task_type', _task.task_type,
        'description', COALESCE(_task.description, ''),
        'reward_cents', _task.reward_cents
      )
    );

    -- Mark as notified
    UPDATE public.moderation_tasks
    SET sms_notified = true
    WHERE id = _task.id;
  END LOOP;
END;
$function$;
