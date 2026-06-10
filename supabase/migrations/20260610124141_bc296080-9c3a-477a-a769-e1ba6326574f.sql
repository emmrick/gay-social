
CREATE OR REPLACE FUNCTION public.auto_cancel_stale_photo_exchanges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  -- 1) Pending > 30 min (proposition jamais acceptée)
  UPDATE public.photo_exchanges
  SET status = 'cancelled', updated_at = now()
  WHERE status = 'pending'
    AND created_at < now() - interval '30 minutes';

  -- 2) Bloqués > 24h en "accepted" (aucune photo) ou "awaiting_review" (modération qui ne traite pas)
  FOR r IN
    SELECT id, initiator_id, recipient_id, status
    FROM public.photo_exchanges
    WHERE status IN ('accepted','awaiting_review')
      AND updated_at < now() - interval '24 hours'
  LOOP
    UPDATE public.photo_exchanges
    SET status = 'cancelled', updated_at = now()
    WHERE id = r.id;

    -- Expirer les missions de modération encore en attente / claimed pour cet échange
    UPDATE public.moderation_tasks
    SET status = 'expired', updated_at = now()
    WHERE task_type = 'photo_exchange_review'
      AND target_entity_id = r.id
      AND status IN ('pending','claimed');

    -- Notifier les 2 participants (best-effort, ignore erreurs)
    BEGIN
      INSERT INTO public.notifications(user_id, type, title, message, is_read)
      VALUES
        (r.initiator_id, 'system', 'Échange de photos expiré',
         'Votre demande d''échange de photos a expiré faute de réponse ou de vérification dans les 24h.', false),
        (r.recipient_id, 'system', 'Échange de photos expiré',
         'Une demande d''échange de photos a expiré faute de réponse ou de vérification dans les 24h.', false);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END;
$$;
