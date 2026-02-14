
CREATE TABLE public.credit_cost_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_cost_id UUID NOT NULL REFERENCES public.credit_costs(id) ON DELETE CASCADE,
  cost_key TEXT NOT NULL,
  old_value NUMERIC NOT NULL,
  new_value NUMERIC NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_cost_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
ON public.credit_cost_audit_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit log"
ON public.credit_cost_audit_log FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_credit_cost_audit_log_cost_id ON public.credit_cost_audit_log(credit_cost_id);
CREATE INDEX idx_credit_cost_audit_log_changed_at ON public.credit_cost_audit_log(changed_at DESC);
