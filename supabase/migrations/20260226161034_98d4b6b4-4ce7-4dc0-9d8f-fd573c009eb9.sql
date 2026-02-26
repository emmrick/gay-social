-- Allow moderators to view credit_transactions
CREATE POLICY "Moderators can view all transactions"
  ON public.credit_transactions FOR SELECT
  USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to view user_credits
CREATE POLICY "Moderators can view all credits"
  ON public.user_credits FOR SELECT
  USING (has_role(auth.uid(), 'moderator'::app_role));