CREATE OR REPLACE FUNCTION public.add_credits(_user_id uuid, _amount numeric, _credit_type credit_type, _transaction_type text, _description text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: must be admin, moderator with credit permission, or system call
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      -- Check if moderator with credit management permission
      IF NOT EXISTS (
        SELECT 1 FROM public.moderator_permissions
        WHERE user_id = auth.uid()
          AND can_manage_credits = true
      ) THEN
        RETURN json_build_object('success', false, 'error', 'Non autorisé');
      END IF;
    END IF;
  END IF;

  -- Ensure user has credits record
  INSERT INTO user_credits (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Add credits based on type
  IF _credit_type = 'daily' THEN
    UPDATE user_credits SET daily_credits = daily_credits + _amount, updated_at = now() WHERE user_id = _user_id;
  ELSIF _credit_type = 'bonus' THEN
    UPDATE user_credits SET bonus_credits = bonus_credits + _amount, updated_at = now() WHERE user_id = _user_id;
  ELSIF _credit_type = 'purchased' THEN
    UPDATE user_credits SET purchased_credits = purchased_credits + _amount, updated_at = now() WHERE user_id = _user_id;
  ELSIF _credit_type = 'passive' THEN
    UPDATE user_credits SET passive_credits = COALESCE(passive_credits, 0) + _amount, updated_at = now() WHERE user_id = _user_id;
  END IF;
  
  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, credit_type, transaction_type, description)
  VALUES (_user_id, _amount, _credit_type, _transaction_type, _description);
  
  RETURN json_build_object('success', true, 'amount_added', _amount, 'credit_type', _credit_type);
END;
$function$;