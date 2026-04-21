-- 1. Opt-out table for weekly digest
CREATE TABLE IF NOT EXISTS public.weekly_digest_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_digest_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unsubscribe"
  ON public.weekly_digest_unsubscribes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unsubscribe"
  ON public.weekly_digest_unsubscribes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own unsubscribe"
  ON public.weekly_digest_unsubscribes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all unsubscribes"
  ON public.weekly_digest_unsubscribes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Schedule pg_cron job: every Monday at 9:00 Europe/Paris
-- (07:00 UTC in winter / 07:00 UTC = 09:00 Paris in winter, 06:00 UTC in summer).
-- We use 07:00 UTC as a fixed compromise (close to 9h all year).
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'weekly-digest-monday-9h';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'weekly-digest-monday-9h',
  '0 7 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://vxrsqftlaguiwprcqlbw.supabase.co/functions/v1/send-weekly-digest',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4cnNxZnRsYWd1aXdwcmNxbGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MjQ1ODgsImV4cCI6MjA4NTIwMDU4OH0.Hcpc4GFLyV3zreSW3hfVzAHaHnMtA9fEivYf2C2MSHc"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);