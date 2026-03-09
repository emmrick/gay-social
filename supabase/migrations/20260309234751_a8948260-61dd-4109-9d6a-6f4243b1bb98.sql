CREATE POLICY "Anyone can read own visitor session"
ON public.visitor_support_sessions
FOR SELECT
TO anon, authenticated
USING (true);