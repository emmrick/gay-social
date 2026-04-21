-- Add a flag to track whether the user has already paid the one-time chatbot activation fee.
ALTER TABLE public.user_chatbot_config
  ADD COLUMN IF NOT EXISTS activation_paid boolean NOT NULL DEFAULT false;

-- Atomic RPC: activate chatbot, charging 10 credits ONLY the first time.
-- Subsequent re-activations are free.
CREATE OR REPLACE FUNCTION public.activate_chatbot(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_paid boolean;
  v_cost numeric := 10;
  v_deduct jsonb;
BEGIN
  IF _user_id IS NULL OR _user_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Ensure config row exists
  PERFORM public.ensure_chatbot_config(_user_id);

  SELECT activation_paid INTO v_already_paid
  FROM public.user_chatbot_config
  WHERE user_id = _user_id
  FOR UPDATE;

  IF v_already_paid THEN
    UPDATE public.user_chatbot_config
       SET is_active = true, updated_at = now()
     WHERE user_id = _user_id;
    RETURN jsonb_build_object('success', true, 'charged', false, 'cost', 0);
  END IF;

  -- First activation → charge 10 credits
  SELECT public.deduct_credits(
    _user_id := _user_id,
    _amount := v_cost,
    _transaction_type := 'chatbot_activation',
    _description := 'Activation du ChatBot Personnel (paiement unique)'
  ) INTO v_deduct;

  IF NOT (v_deduct->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_deduct->>'error', 'insufficient_credits'),
      'required', v_cost
    );
  END IF;

  UPDATE public.user_chatbot_config
     SET is_active = true,
         activation_paid = true,
         updated_at = now()
   WHERE user_id = _user_id;

  RETURN jsonb_build_object('success', true, 'charged', true, 'cost', v_cost);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_chatbot(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.activate_chatbot(uuid) TO authenticated;