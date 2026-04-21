CREATE OR REPLACE FUNCTION public.purchase_chatbot_node(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  current_cost INTEGER;
  next_cost INTEGER;
  delta INTEGER;
  v_deduct jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.personal_chatbot_nodes
  WHERE user_id = _user_id;

  current_cost := public.compute_chatbot_node_cost(current_count);
  next_cost := public.compute_chatbot_node_cost(current_count + 1);
  delta := next_cost - current_cost;

  IF delta <= 0 THEN
    RETURN jsonb_build_object('success', true, 'cost', 0, 'message', 'free');
  END IF;

  -- Use the proper multi-bucket credit system (passive/daily/bonus/purchased)
  SELECT public.deduct_credits(
    _user_id := _user_id,
    _amount := delta::numeric,
    _transaction_type := 'chatbot_node',
    _description := 'Bloc chatbot personnel #' || (current_count + 1)
  ) INTO v_deduct;

  IF NOT COALESCE((v_deduct->>'success')::boolean, false) THEN
    -- Compute available credits for clearer error
    DECLARE
      v_available numeric := 0;
    BEGIN
      SELECT COALESCE(passive_credits, 0) + COALESCE(daily_credits, 0)
           + COALESCE(bonus_credits, 0) + COALESCE(purchased_credits, 0)
      INTO v_available
      FROM public.user_credits
      WHERE user_id = _user_id;

      RETURN jsonb_build_object(
        'success', false,
        'error', 'insufficient_credits',
        'required', delta,
        'available', COALESCE(v_available, 0)
      );
    END;
  END IF;

  RETURN jsonb_build_object('success', true, 'cost', delta, 'new_total_nodes', current_count + 1);
END;
$function$;