
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can update credit costs" ON public.credit_costs;
DROP POLICY IF EXISTS "Admins can insert credit costs" ON public.credit_costs;
DROP POLICY IF EXISTS "Admins can insert audit log" ON public.credit_cost_audit_log;
DROP POLICY IF EXISTS "Admins can read audit log" ON public.credit_cost_audit_log;

-- Create a helper function to check moderator credit permissions
CREATE OR REPLACE FUNCTION public.can_manage_credits(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::app_role
  )
  OR EXISTS (
    SELECT 1 FROM public.moderator_permissions WHERE user_id = _user_id AND can_manage_credits = true
  )
$$;

-- credit_costs: allow admins and moderators with can_manage_credits
CREATE POLICY "Authorized users can update credit costs"
ON public.credit_costs FOR UPDATE TO authenticated
USING (public.can_manage_credits(auth.uid()));

CREATE POLICY "Authorized users can insert credit costs"
ON public.credit_costs FOR INSERT TO authenticated
WITH CHECK (public.can_manage_credits(auth.uid()));

-- credit_cost_audit_log: allow admins and moderators with can_manage_credits
CREATE POLICY "Authorized users can insert audit log"
ON public.credit_cost_audit_log FOR INSERT TO authenticated
WITH CHECK (public.can_manage_credits(auth.uid()));

CREATE POLICY "Authorized users can read audit log"
ON public.credit_cost_audit_log FOR SELECT TO authenticated
USING (public.can_manage_credits(auth.uid()));
