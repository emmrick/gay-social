
CREATE OR REPLACE FUNCTION public.check_sufficient_credits(_user_id uuid, _amount numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total DECIMAL;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN false;
  END IF;

  SELECT COALESCE(daily_credits, 0) + COALESCE(passive_credits, 0) + COALESCE(bonus_credits, 0) + COALESCE(purchased_credits, 0)
  INTO total
  FROM user_credits
  WHERE user_id = _user_id;
  
  RETURN COALESCE(total, 0) >= _amount;
END;
$function$;
