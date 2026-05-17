-- Fonction pour annuler auto les demandes d'échange en pending > 30min
CREATE OR REPLACE FUNCTION public.auto_cancel_stale_photo_exchanges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.photo_exchanges
  SET status = 'cancelled',
      updated_at = now()
  WHERE status = 'pending'
    AND created_at < now() - interval '30 minutes';
END;
$$;

-- Extensions cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprimer l'ancien job s'il existe
DO $$
BEGIN
  PERFORM cron.unschedule('auto-cancel-stale-photo-exchanges');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Planifier toutes les 5 minutes
SELECT cron.schedule(
  'auto-cancel-stale-photo-exchanges',
  '*/5 * * * *',
  $$ SELECT public.auto_cancel_stale_photo_exchanges(); $$
);