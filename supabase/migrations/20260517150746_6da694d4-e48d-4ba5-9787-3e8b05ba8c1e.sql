CREATE TABLE public.photo_exchange_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id uuid NOT NULL REFERENCES public.photo_exchanges(id) ON DELETE CASCADE,
  photo_id uuid REFERENCES public.photo_exchange_photos(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'approved' | 'rejected'
  reviewer_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pe_audit_exchange ON public.photo_exchange_audit_logs(exchange_id);
CREATE INDEX idx_pe_audit_reviewer ON public.photo_exchange_audit_logs(reviewer_id);
CREATE INDEX idx_pe_audit_created ON public.photo_exchange_audit_logs(created_at DESC);

ALTER TABLE public.photo_exchange_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read audit logs"
ON public.photo_exchange_audit_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

-- Trigger : enregistre chaque changement de review_status
CREATE OR REPLACE FUNCTION public.log_photo_exchange_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.review_status IS DISTINCT FROM OLD.review_status
     AND NEW.review_status IN ('approved', 'rejected') THEN
    INSERT INTO public.photo_exchange_audit_logs (
      exchange_id, photo_id, action, reviewer_id, reason
    ) VALUES (
      NEW.exchange_id,
      NEW.id,
      NEW.review_status,
      COALESCE(NEW.reviewed_by, auth.uid()),
      NEW.review_reason
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_photo_exchange_review ON public.photo_exchange_photos;
CREATE TRIGGER trg_log_photo_exchange_review
AFTER UPDATE ON public.photo_exchange_photos
FOR EACH ROW
EXECUTE FUNCTION public.log_photo_exchange_review();