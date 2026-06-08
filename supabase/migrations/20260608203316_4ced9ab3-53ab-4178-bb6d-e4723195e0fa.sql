
-- Restrict email_send_log SELECT to admins only (not moderators).
-- Recipient emails are PII; only admins need to audit deliverability.
DROP POLICY IF EXISTS "Staff can read email send log" ON public.email_send_log;
CREATE POLICY "Admins can read email send log"
  ON public.email_send_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
