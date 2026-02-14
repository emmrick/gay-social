
CREATE OR REPLACE FUNCTION public.get_user_credit_balance(_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_credits user_credits%ROWTYPE;
  v_hours_passed numeric;
  v_passive_to_add numeric;
  v_new_passive numeric;
  v_max_daily numeric := 5.0;
  v_consumed numeric;
  v_top_up numeric;
  v_current_month_start date;
BEGIN
  -- Get or create credits record
  INSERT INTO user_credits (user_id, daily_credits, bonus_credits, purchased_credits, passive_credits, last_passive_credit_at, daily_claims_used, monthly_daily_credits_given)
  VALUES (_user_id, v_max_daily, 0, 0, 0, now(), 1, 5)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_credits FROM user_credits WHERE user_id = _user_id;

  -- Calculate passive credits to add (0.1 per 2 hours, max 1.0)
  v_hours_passed := EXTRACT(EPOCH FROM (now() - COALESCE(v_credits.last_passive_credit_at, now()))) / 3600;
  v_passive_to_add := FLOOR(v_hours_passed / 2) * 0.1;
  
  IF v_passive_to_add > 0 THEN
    v_new_passive := LEAST(COALESCE(v_credits.passive_credits, 0) + v_passive_to_add, 1.0);
    
    IF v_new_passive > COALESCE(v_credits.passive_credits, 0) THEN
      UPDATE user_credits 
      SET passive_credits = v_new_passive,
          last_passive_credit_at = now()
      WHERE user_id = _user_id;
      
      v_credits.passive_credits := v_new_passive;
    END IF;
  END IF;

  -- Reset monthly counter if new month
  v_current_month_start := date_trunc('month', CURRENT_DATE)::date;
  IF v_credits.monthly_reset_date < v_current_month_start THEN
    UPDATE user_credits 
    SET daily_claims_used = 0,
        monthly_daily_credits_given = 0,
        monthly_reset_date = v_current_month_start
    WHERE user_id = _user_id;
    v_credits.daily_claims_used := 0;
    v_credits.monthly_daily_credits_given := 0;
  END IF;

  -- Daily top-up logic: complement to 5.0 max, limited to 7 days/month
  IF v_credits.daily_credits_last_reset IS NULL OR 
     v_credits.daily_credits_last_reset::date < CURRENT_DATE THEN
    
    -- Check if we still have recharge days left (max 7 per month)
    IF COALESCE(v_credits.daily_claims_used, 0) < 7 THEN
      -- Calculate how much was consumed (complement only what's missing)
      v_consumed := v_max_daily - v_credits.daily_credits;
      
      -- Only top up if something was consumed
      IF v_consumed > 0 THEN
        v_top_up := v_consumed;
        
        UPDATE user_credits 
        SET daily_credits = v_max_daily,
            daily_credits_last_reset = now(),
            daily_claims_used = COALESCE(daily_claims_used, 0) + 1,
            monthly_daily_credits_given = COALESCE(monthly_daily_credits_given, 0) + v_top_up
        WHERE user_id = _user_id;
        v_credits.daily_credits := v_max_daily;
        v_credits.daily_claims_used := COALESCE(v_credits.daily_claims_used, 0) + 1;
      ELSE
        -- Nothing consumed, still count the day but no credits added
        UPDATE user_credits 
        SET daily_credits_last_reset = now(),
            daily_claims_used = COALESCE(daily_claims_used, 0) + 1
        WHERE user_id = _user_id;
        v_credits.daily_claims_used := COALESCE(v_credits.daily_claims_used, 0) + 1;
      END IF;
    ELSE
      -- 7 days exhausted, just update the reset date (no more daily credits this month)
      UPDATE user_credits 
      SET daily_credits_last_reset = now()
      WHERE user_id = _user_id;
    END IF;
  END IF;

  RETURN json_build_object(
    'user_id', v_credits.user_id,
    'passive_credits', COALESCE(v_credits.passive_credits, 0),
    'daily_credits', v_credits.daily_credits,
    'bonus_credits', v_credits.bonus_credits,
    'purchased_credits', v_credits.purchased_credits,
    'total_credits', COALESCE(v_credits.passive_credits, 0) + v_credits.daily_credits + v_credits.bonus_credits + v_credits.purchased_credits,
    'max_daily_credits', v_max_daily,
    'daily_credits_reset_date', v_credits.daily_credits_last_reset,
    'daily_claims_used', COALESCE(v_credits.daily_claims_used, 0),
    'daily_claims_remaining', 7 - COALESCE(v_credits.daily_claims_used, 0)
  );
END;
$function$;
