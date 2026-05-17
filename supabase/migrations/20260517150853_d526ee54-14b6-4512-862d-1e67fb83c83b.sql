-- 1) Trigger BEFORE UPDATE/INSERT : empêche toute transition d'un pending expiré
CREATE OR REPLACE FUNCTION public.enforce_photo_exchange_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sur UPDATE d'une demande pending > 30 min : forcer le statut à cancelled
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'pending'
     AND OLD.created_at < now() - interval '30 minutes' THEN
    NEW.status := 'cancelled';
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_photo_exchange_expiry ON public.photo_exchanges;
CREATE TRIGGER trg_enforce_photo_exchange_expiry
BEFORE UPDATE ON public.photo_exchanges
FOR EACH ROW
EXECUTE FUNCTION public.enforce_photo_exchange_expiry();

-- 2) Trigger BEFORE INSERT sur photo_exchange_photos : refuse l'upload si exchange expiré
CREATE OR REPLACE FUNCTION public.block_upload_on_expired_exchange()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ex public.photo_exchanges%ROWTYPE;
BEGIN
  SELECT * INTO ex FROM public.photo_exchanges WHERE id = NEW.exchange_id;
  IF ex.status = 'cancelled'
     OR ex.status = 'rejected'
     OR (ex.status = 'pending' AND ex.created_at < now() - interval '30 minutes') THEN
    RAISE EXCEPTION 'Cette demande d''échange est expirée ou annulée.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_upload_on_expired_exchange ON public.photo_exchange_photos;
CREATE TRIGGER trg_block_upload_on_expired_exchange
BEFORE INSERT ON public.photo_exchange_photos
FOR EACH ROW
EXECUTE FUNCTION public.block_upload_on_expired_exchange();

-- 3) RLS SELECT renforcée : les participants ne voient plus les pending expirés
DROP POLICY IF EXISTS "Participants and staff can view exchanges" ON public.photo_exchanges;
CREATE POLICY "Participants and staff can view exchanges"
ON public.photo_exchanges
FOR SELECT
TO authenticated
USING (
  public.is_photo_exchange_staff(auth.uid())
  OR (
    (auth.uid() = initiator_id OR auth.uid() = recipient_id)
    AND NOT (status = 'pending' AND created_at < now() - interval '30 minutes')
  )
);