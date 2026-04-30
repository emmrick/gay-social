
ALTER TABLE public.email_send_log
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_email_send_log_resend_id
  ON public.email_send_log ((metadata->>'resend_id'));

CREATE INDEX IF NOT EXISTS idx_email_send_log_last_event
  ON public.email_send_log (last_event_at DESC NULLS LAST);

-- Lecture pour staff (admin OU moderator)
DROP POLICY IF EXISTS "Staff can read email send log" ON public.email_send_log;
CREATE POLICY "Staff can read email send log"
  ON public.email_send_log
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );
