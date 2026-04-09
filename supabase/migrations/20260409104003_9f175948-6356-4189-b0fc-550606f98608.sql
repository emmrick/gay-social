
-- Drop the old admin-only policy
DROP POLICY IF EXISTS "Admins can manage credit offers" ON public.credit_offers;

-- Recreate with admin OR moderator with credits permission
CREATE POLICY "Admins and authorized moderators can manage credit offers"
ON public.credit_offers
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'moderator'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.moderator_permissions
      WHERE user_id = auth.uid() AND can_manage_credits = true
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'moderator'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.moderator_permissions
      WHERE user_id = auth.uid() AND can_manage_credits = true
    )
  )
);
