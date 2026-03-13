
-- Add credit lock columns to user_credits
ALTER TABLE public.user_credits 
  ADD COLUMN IF NOT EXISTS lock_passive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lock_bonus boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lock_purchased boolean NOT NULL DEFAULT false;

-- Update deduct_credits to use new order: Quotidien -> Passif -> Bonus -> Achetés, with lock support
CREATE OR REPLACE FUNCTION public.deduct_credits(_user_id uuid, _amount numeric, _transaction_type text, _description text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_credits user_credits%ROWTYPE;
  v_remaining numeric := _amount;
  v_from_passive numeric := 0;
  v_from_daily numeric := 0;
  v_from_bonus numeric := 0;
  v_from_purchased numeric := 0;
  v_total numeric;
BEGIN
  SELECT * INTO v_credits FROM user_credits WHERE user_id = _user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User credits not found');
  END IF;

  v_total := COALESCE(v_credits.passive_credits, 0) + v_credits.daily_credits + v_credits.bonus_credits + v_credits.purchased_credits;
  
  IF v_total < _amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits');
  END IF;

  -- New deduction order: Quotidien -> Passif -> Bonus -> Achetés
  -- Skip locked types

  -- 1. Daily (never lockable)
  IF v_remaining > 0 AND v_credits.daily_credits > 0 THEN
    v_from_daily := LEAST(v_remaining, v_credits.daily_credits);
    v_remaining := v_remaining - v_from_daily;
  END IF;

  -- 2. Passive (skip if locked)
  IF v_remaining > 0 AND COALESCE(v_credits.passive_credits, 0) > 0 AND NOT COALESCE(v_credits.lock_passive, false) THEN
    v_from_passive := LEAST(v_remaining, COALESCE(v_credits.passive_credits, 0));
    v_remaining := v_remaining - v_from_passive;
  END IF;

  -- 3. Bonus (skip if locked)
  IF v_remaining > 0 AND v_credits.bonus_credits > 0 AND NOT COALESCE(v_credits.lock_bonus, false) THEN
    v_from_bonus := LEAST(v_remaining, v_credits.bonus_credits);
    v_remaining := v_remaining - v_from_bonus;
  END IF;

  -- 4. Purchased (skip if locked)
  IF v_remaining > 0 AND v_credits.purchased_credits > 0 AND NOT COALESCE(v_credits.lock_purchased, false) THEN
    v_from_purchased := LEAST(v_remaining, v_credits.purchased_credits);
    v_remaining := v_remaining - v_from_purchased;
  END IF;

  -- If still remaining after skipping locked types, we must use locked ones as fallback
  -- (otherwise the user can't spend credits at all)
  IF v_remaining > 0 THEN
    -- Try passive even if locked
    IF v_remaining > 0 AND COALESCE(v_credits.passive_credits, 0) - v_from_passive > 0 THEN
      v_from_passive := v_from_passive + LEAST(v_remaining, COALESCE(v_credits.passive_credits, 0) - v_from_passive);
      v_remaining := v_remaining - (LEAST(v_remaining, COALESCE(v_credits.passive_credits, 0) - v_from_passive));
    END IF;
    IF v_remaining > 0 AND v_credits.bonus_credits - v_from_bonus > 0 THEN
      v_from_bonus := v_from_bonus + LEAST(v_remaining, v_credits.bonus_credits - v_from_bonus);
      v_remaining := v_remaining - (LEAST(v_remaining, v_credits.bonus_credits - v_from_bonus));
    END IF;
    IF v_remaining > 0 AND v_credits.purchased_credits - v_from_purchased > 0 THEN
      v_from_purchased := v_from_purchased + LEAST(v_remaining, v_credits.purchased_credits - v_from_purchased);
      v_remaining := v_remaining - (LEAST(v_remaining, v_credits.purchased_credits - v_from_purchased));
    END IF;
  END IF;

  -- Update credits + reset passive timer if passive was used
  UPDATE user_credits
  SET passive_credits = COALESCE(passive_credits, 0) - v_from_passive,
      daily_credits = daily_credits - v_from_daily,
      bonus_credits = bonus_credits - v_from_bonus,
      purchased_credits = purchased_credits - v_from_purchased,
      last_passive_credit_at = CASE WHEN v_from_passive > 0 THEN now() ELSE last_passive_credit_at END,
      updated_at = now()
  WHERE user_id = _user_id;

  IF v_from_passive > 0 THEN
    INSERT INTO credit_transactions (user_id, amount, credit_type, transaction_type, description)
    VALUES (_user_id, -v_from_passive, 'passive', _transaction_type, _description);
  END IF;

  IF v_from_daily > 0 THEN
    INSERT INTO credit_transactions (user_id, amount, credit_type, transaction_type, description)
    VALUES (_user_id, -v_from_daily, 'daily', _transaction_type, _description);
  END IF;

  IF v_from_bonus > 0 THEN
    INSERT INTO credit_transactions (user_id, amount, credit_type, transaction_type, description)
    VALUES (_user_id, -v_from_bonus, 'bonus', _transaction_type, _description);
  END IF;

  IF v_from_purchased > 0 THEN
    INSERT INTO credit_transactions (user_id, amount, credit_type, transaction_type, description)
    VALUES (_user_id, -v_from_purchased, 'purchased', _transaction_type, _description);
  END IF;

  RETURN json_build_object('success', true);
END;
$function$;

-- Update get_user_credit_balance: 0.1 per 6h, cap 10.0
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
  v_actual_passive_added numeric;
BEGIN
  -- Get or create credits record
  INSERT INTO user_credits (user_id, daily_credits, bonus_credits, purchased_credits, passive_credits, last_passive_credit_at, daily_claims_used, monthly_daily_credits_given)
  VALUES (_user_id, v_max_daily, 0, 0, 0, now(), 1, 5)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_credits FROM user_credits WHERE user_id = _user_id;

  -- Calculate passive credits to add (0.1 per 6 hours, max 10.0)
  v_hours_passed := EXTRACT(EPOCH FROM (now() - COALESCE(v_credits.last_passive_credit_at, now()))) / 3600;
  v_passive_to_add := FLOOR(v_hours_passed / 6) * 0.1;
  
  IF v_passive_to_add > 0 THEN
    v_new_passive := LEAST(COALESCE(v_credits.passive_credits, 0) + v_passive_to_add, 10.0);
    v_actual_passive_added := v_new_passive - COALESCE(v_credits.passive_credits, 0);
    
    IF v_actual_passive_added > 0 THEN
      UPDATE user_credits 
      SET passive_credits = v_new_passive,
          last_passive_credit_at = now()
      WHERE user_id = _user_id;
      
      -- Log passive recharge transaction
      INSERT INTO credit_transactions (user_id, amount, credit_type, transaction_type, description)
      VALUES (_user_id, v_actual_passive_added, 'passive', 'passive_recharge', 'Recharge passive automatique (+'|| v_actual_passive_added ||')');
      
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
    
    IF COALESCE(v_credits.daily_claims_used, 0) < 7 THEN
      v_consumed := v_max_daily - v_credits.daily_credits;
      
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
        
        INSERT INTO credit_transactions (user_id, amount, credit_type, transaction_type, description)
        VALUES (_user_id, v_top_up, 'daily', 'daily_recharge', 'Recharge quotidienne automatique (+' || v_top_up || ')');
      ELSE
        UPDATE user_credits 
        SET daily_credits_last_reset = now(),
            daily_claims_used = COALESCE(daily_claims_used, 0) + 1
        WHERE user_id = _user_id;
        v_credits.daily_claims_used := COALESCE(v_credits.daily_claims_used, 0) + 1;
      END IF;
    ELSE
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
    'daily_claims_remaining', 7 - COALESCE(v_credits.daily_claims_used, 0),
    'lock_passive', COALESCE(v_credits.lock_passive, false),
    'lock_bonus', COALESCE(v_credits.lock_bonus, false),
    'lock_purchased', COALESCE(v_credits.lock_purchased, false)
  );
END;
$function$;
