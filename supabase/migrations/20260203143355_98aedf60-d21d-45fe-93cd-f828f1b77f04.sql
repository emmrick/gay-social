
-- Update claim_daily_credits to top-up to 5 instead of resetting to 5
-- Also track total credits given per month for the 35 limit

-- Add a column to track total daily credits given this month
ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS monthly_daily_credits_given DECIMAL(10,2) DEFAULT 0;

-- Recreate the claim_daily_credits function with new logic
CREATE OR REPLACE FUNCTION public.claim_daily_credits(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  credits_record RECORD;
  credits_to_add DECIMAL;
  max_daily_credits CONSTANT DECIMAL := 5.0;
  max_monthly_credits CONSTANT DECIMAL := 35.0;
  max_claims CONSTANT INTEGER := 7;
  credits_remaining_this_month DECIMAL;
BEGIN
  -- Get or create credits record
  INSERT INTO user_credits (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO credits_record FROM user_credits WHERE user_id = _user_id FOR UPDATE;
  
  -- Check and reset monthly data if needed (new month)
  IF credits_record.monthly_reset_date < date_trunc('month', now()) THEN
    UPDATE user_credits 
    SET daily_claims_used = 0, 
        monthly_reset_date = date_trunc('month', now()),
        monthly_daily_credits_given = 0
    WHERE user_id = _user_id
    RETURNING * INTO credits_record;
  END IF;
  
  -- Check if max 7 claims per month reached
  IF credits_record.daily_claims_used >= max_claims THEN
    RETURN json_build_object('success', false, 'error', 'Maximum 7 claims per month reached');
  END IF;
  
  -- Check if already claimed today (24h cooldown)
  IF credits_record.last_daily_claim IS NOT NULL AND credits_record.last_daily_claim > now() - interval '24 hours' THEN
    RETURN json_build_object('success', false, 'error', 'Already claimed today', 'next_claim_at', credits_record.last_daily_claim + interval '24 hours');
  END IF;
  
  -- Calculate how many credits remaining in monthly allowance
  credits_remaining_this_month := max_monthly_credits - COALESCE(credits_record.monthly_daily_credits_given, 0);
  
  -- If no credits remaining this month, deny
  IF credits_remaining_this_month <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Monthly credit limit reached');
  END IF;
  
  -- Calculate credits to add: top-up to 5, but capped by monthly allowance
  -- Only add what's needed to reach 5 daily credits
  credits_to_add := max_daily_credits - credits_record.daily_credits;
  
  -- Cap by what's remaining in monthly allowance
  credits_to_add := LEAST(credits_to_add, credits_remaining_this_month);
  
  -- Don't add if already at or above 5
  IF credits_to_add <= 0 THEN
    -- User hasn't used their daily credits, no need to top up
    -- But we still count it as a claim day
    UPDATE user_credits
    SET 
      daily_claims_used = daily_claims_used + 1,
      last_daily_claim = now(),
      updated_at = now()
    WHERE user_id = _user_id;
    
    RETURN json_build_object(
      'success', true, 
      'credits_claimed', 0, 
      'claims_remaining', max_claims - credits_record.daily_claims_used - 1,
      'message', 'Crédits quotidiens déjà au maximum'
    );
  END IF;
  
  -- Update credits: add to daily_credits (not reset to 5)
  UPDATE user_credits
  SET 
    daily_credits = daily_credits + credits_to_add,
    daily_claims_used = daily_claims_used + 1,
    monthly_daily_credits_given = COALESCE(monthly_daily_credits_given, 0) + credits_to_add,
    last_daily_claim = now(),
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, credit_type, transaction_type, description)
  VALUES (_user_id, credits_to_add, 'daily', 'daily_claim', 'Réclamation quotidienne de crédits');
  
  RETURN json_build_object(
    'success', true, 
    'credits_claimed', credits_to_add, 
    'claims_remaining', max_claims - credits_record.daily_claims_used - 1,
    'monthly_credits_given', COALESCE(credits_record.monthly_daily_credits_given, 0) + credits_to_add
  );
END;
$$;

-- Update get_user_credit_balance to include monthly info
CREATE OR REPLACE FUNCTION public.get_user_credit_balance(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  credits_record RECORD;
  can_claim BOOLEAN;
  max_daily CONSTANT DECIMAL := 5.0;
  max_monthly CONSTANT DECIMAL := 35.0;
BEGIN
  -- Get or create credits record
  INSERT INTO user_credits (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO credits_record FROM user_credits WHERE user_id = _user_id;
  
  -- Check and reset monthly data if needed (new month)
  IF credits_record.monthly_reset_date < date_trunc('month', now()) THEN
    UPDATE user_credits 
    SET daily_claims_used = 0, 
        monthly_reset_date = date_trunc('month', now()),
        monthly_daily_credits_given = 0
    WHERE user_id = _user_id
    RETURNING * INTO credits_record;
  END IF;
  
  -- Determine if user can claim daily credits
  can_claim := (
    credits_record.daily_claims_used < 7 AND
    (credits_record.last_daily_claim IS NULL OR credits_record.last_daily_claim < now() - interval '24 hours') AND
    (COALESCE(credits_record.monthly_daily_credits_given, 0) < max_monthly)
  );
  
  RETURN json_build_object(
    'user_id', _user_id,
    'daily_credits', credits_record.daily_credits,
    'bonus_credits', credits_record.bonus_credits,
    'purchased_credits', credits_record.purchased_credits,
    'total_credits', credits_record.daily_credits + credits_record.bonus_credits + credits_record.purchased_credits,
    'daily_claims_used', credits_record.daily_claims_used,
    'can_claim_daily', can_claim,
    'last_daily_claim', credits_record.last_daily_claim,
    'monthly_reset_date', credits_record.monthly_reset_date,
    'max_daily_credits', max_daily,
    'monthly_daily_credits_given', COALESCE(credits_record.monthly_daily_credits_given, 0),
    'monthly_daily_credits_max', max_monthly
  );
END;
$$;
