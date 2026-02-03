-- ===========================================
-- FIX 1: Profiles RLS - Require authentication
-- ===========================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create proper policy that requires authentication
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- ===========================================
-- FIX 2: Add authorization checks to credit functions
-- ===========================================

-- Fix add_credits function - only admins or system can add credits for other users
CREATE OR REPLACE FUNCTION public.add_credits(_user_id uuid, _amount numeric, _credit_type credit_type, _transaction_type text, _description text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: must be admin OR modifying own credits (for system/triggers)
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé');
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
  END IF;
  
  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, credit_type, transaction_type, description)
  VALUES (_user_id, _amount, _credit_type, _transaction_type, _description);
  
  RETURN json_build_object('success', true, 'amount_added', _amount, 'credit_type', _credit_type);
END;
$function$;

-- Fix deduct_credits function - users can only deduct their own credits
CREATE OR REPLACE FUNCTION public.deduct_credits(_user_id uuid, _amount numeric, _transaction_type text, _description text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  credits_record RECORD;
  remaining DECIMAL;
  deducted_daily DECIMAL := 0;
  deducted_bonus DECIMAL := 0;
  deducted_purchased DECIMAL := 0;
  max_daily CONSTANT DECIMAL := 5.0;
  today DATE := CURRENT_DATE;
BEGIN
  -- Authorization check: must be the user themselves OR admin OR system call (auth.uid() IS NULL for triggers)
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé');
  END IF;

  -- Get current credits
  SELECT * INTO credits_record FROM user_credits WHERE user_id = _user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Create new record with daily credits
    INSERT INTO user_credits (user_id, daily_credits, daily_credits_last_reset)
    VALUES (_user_id, max_daily, today);
    SELECT * INTO credits_record FROM user_credits WHERE user_id = _user_id FOR UPDATE;
  END IF;
  
  -- Auto-reset daily credits if it's a new day
  IF credits_record.daily_credits_last_reset IS NULL OR credits_record.daily_credits_last_reset < today THEN
    UPDATE user_credits 
    SET 
      daily_credits = max_daily,
      daily_credits_last_reset = today,
      updated_at = now()
    WHERE user_id = _user_id
    RETURNING * INTO credits_record;
  END IF;
  
  -- Check total balance
  IF (credits_record.daily_credits + credits_record.bonus_credits + credits_record.purchased_credits) < _amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits');
  END IF;
  
  remaining := _amount;
  
  -- 1. Deduct from daily credits first
  IF remaining > 0 AND credits_record.daily_credits > 0 THEN
    deducted_daily := LEAST(remaining, credits_record.daily_credits);
    remaining := remaining - deducted_daily;
  END IF;
  
  -- 2. Deduct from bonus credits
  IF remaining > 0 AND credits_record.bonus_credits > 0 THEN
    deducted_bonus := LEAST(remaining, credits_record.bonus_credits);
    remaining := remaining - deducted_bonus;
  END IF;
  
  -- 3. Deduct from purchased credits
  IF remaining > 0 AND credits_record.purchased_credits > 0 THEN
    deducted_purchased := LEAST(remaining, credits_record.purchased_credits);
    remaining := remaining - deducted_purchased;
  END IF;
  
  -- Update credits
  UPDATE user_credits
  SET 
    daily_credits = daily_credits - deducted_daily,
    bonus_credits = bonus_credits - deducted_bonus,
    purchased_credits = purchased_credits - deducted_purchased,
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Log transactions for each credit type used
  IF deducted_daily > 0 THEN
    INSERT INTO credit_transactions (user_id, amount, credit_type, transaction_type, description)
    VALUES (_user_id, -deducted_daily, 'daily', _transaction_type, _description);
  END IF;
  
  IF deducted_bonus > 0 THEN
    INSERT INTO credit_transactions (user_id, amount, credit_type, transaction_type, description)
    VALUES (_user_id, -deducted_bonus, 'bonus', _transaction_type, _description);
  END IF;
  
  IF deducted_purchased > 0 THEN
    INSERT INTO credit_transactions (user_id, amount, credit_type, transaction_type, description)
    VALUES (_user_id, -deducted_purchased, 'purchased', _transaction_type, _description);
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'deducted_daily', deducted_daily,
    'deducted_bonus', deducted_bonus,
    'deducted_purchased', deducted_purchased,
    'total_deducted', _amount
  );
END;
$function$;

-- Fix process_referral_credits - should only be called by system/triggers, not directly by users
CREATE OR REPLACE FUNCTION public.process_referral_credits(_referrer_id uuid, _referred_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- This function should only be called by triggers or admin
  -- Regular users cannot call this directly
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Cette fonction est réservée au système');
  END IF;

  -- Add 10 credits to referrer
  PERFORM add_credits(_referrer_id, 10.0, 'bonus', 'referral_bonus', 'Bonus parrainage - filleul vérifié');
  
  -- Add 10 credits to referred
  PERFORM add_credits(_referred_id, 10.0, 'bonus', 'referral_bonus', 'Bonus parrainage - inscription vérifiée');
  
  RETURN json_build_object('success', true, 'referrer_credits', 10.0, 'referred_credits', 10.0);
END;
$function$;

-- Fix get_user_credit_balance - users can only check their own balance
CREATE OR REPLACE FUNCTION public.get_user_credit_balance(_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  credits_record RECORD;
  max_daily CONSTANT DECIMAL := 5.0;
  today DATE := CURRENT_DATE;
BEGIN
  -- Authorization check: must be the user themselves OR admin
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé');
  END IF;

  -- Get or create credits record
  INSERT INTO user_credits (user_id, daily_credits, daily_credits_last_reset)
  VALUES (_user_id, max_daily, today)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO credits_record FROM user_credits WHERE user_id = _user_id FOR UPDATE;
  
  -- Auto-reset daily credits if it's a new day
  IF credits_record.daily_credits_last_reset IS NULL OR credits_record.daily_credits_last_reset < today THEN
    UPDATE user_credits 
    SET 
      daily_credits = max_daily,
      daily_credits_last_reset = today,
      updated_at = now()
    WHERE user_id = _user_id
    RETURNING * INTO credits_record;
  END IF;
  
  RETURN json_build_object(
    'user_id', _user_id,
    'daily_credits', credits_record.daily_credits,
    'bonus_credits', credits_record.bonus_credits,
    'purchased_credits', credits_record.purchased_credits,
    'total_credits', credits_record.daily_credits + credits_record.bonus_credits + credits_record.purchased_credits,
    'max_daily_credits', max_daily,
    'daily_credits_reset_date', credits_record.daily_credits_last_reset
  );
END;
$function$;

-- Fix check_sufficient_credits - users can only check their own credits
CREATE OR REPLACE FUNCTION public.check_sufficient_credits(_user_id uuid, _amount numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total DECIMAL;
BEGIN
  -- Authorization check: must be the user themselves OR admin OR system call
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN false;
  END IF;

  SELECT COALESCE(daily_credits, 0) + COALESCE(bonus_credits, 0) + COALESCE(purchased_credits, 0)
  INTO total
  FROM user_credits
  WHERE user_id = _user_id;
  
  RETURN COALESCE(total, 0) >= _amount;
END;
$function$;