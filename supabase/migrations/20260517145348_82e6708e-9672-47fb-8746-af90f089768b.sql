CREATE OR REPLACE FUNCTION public.notify_moderators_new_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _mod RECORD;
  _title text;
  _body text;
BEGIN
  _title := CASE NEW.task_type
    WHEN 'photo_exchange_review' THEN '🖼️ Nouvel échange de photos à vérifier'
    WHEN 'identity_verification' THEN '🪪 Vérification d''identité en attente'
    WHEN 'report_review' THEN '🚨 Nouveau signalement'
    WHEN 'support_chat' THEN '🆘 Nouvelle demande de support'
    WHEN 'credit_management' THEN '💰 Demande de crédits'
    WHEN 'withdrawal_management' THEN '🏦 Demande de retrait'
    WHEN 'content_moderation' THEN '📸 Contenu à modérer'
    WHEN 'tween_review' THEN '🐦 Tween signalé'
    WHEN 'screenshot_investigation' THEN '🛡️ Capture d''écran à examiner'
    WHEN 'ad_review' THEN '📢 Annonce publicitaire à vérifier'
    WHEN 'promo_validation' THEN '🎟️ Code promo à valider'
    WHEN 'user_suspension' THEN '🔒 Suspension à traiter'
    ELSE '🔔 Nouvelle mission disponible'
  END;
  _body := COALESCE(NEW.description, 'Une nouvelle mission de modération est en attente.');

  FOR _mod IN 
    SELECT DISTINCT ur.user_id 
    FROM public.user_roles ur 
    WHERE ur.role IN ('admin', 'moderator')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, action_url, is_read)
    VALUES (
      _mod.user_id,
      'system',
      _title,
      _body,
      '/admin/missions?task=' || NEW.id::text,
      false
    );
  END LOOP;

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

  RETURN NEW;
END;
$function$;