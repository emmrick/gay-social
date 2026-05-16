CREATE TABLE IF NOT EXISTS public.cron_run_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success','error')),
  duration_ms INTEGER,
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_run_log_job_created
  ON public.cron_run_log (job_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_run_log_status_created
  ON public.cron_run_log (status, created_at DESC) WHERE status = 'error';

ALTER TABLE public.cron_run_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cron logs"
  ON public.cron_run_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-purge: keep 30 days
CREATE OR REPLACE FUNCTION public.purge_old_cron_run_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.cron_run_log WHERE created_at < now() - interval '30 days';
$$;

REVOKE ALL ON FUNCTION public.purge_old_cron_run_logs() FROM PUBLIC, anon, authenticated;