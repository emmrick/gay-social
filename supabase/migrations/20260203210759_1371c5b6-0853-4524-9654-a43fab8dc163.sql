-- Add passive credits column to user_credits table
ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS passive_credits numeric DEFAULT 0 CHECK (passive_credits >= 0 AND passive_credits <= 1.0),
ADD COLUMN IF NOT EXISTS last_passive_credit_at timestamp with time zone DEFAULT now();

-- Add 'passive' to credit_type enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'passive' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'credit_type')) THEN
    ALTER TYPE credit_type ADD VALUE 'passive';
  END IF;
END $$;

-- Update get_user_credit_balance function to include passive credits and auto-accumulate
CREATE OR REPLACE FUNCTION public.get_user_credit_balance(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits user_credits%ROWTYPE;
  v_hours_passed numeric;
  v_passive_to_add numeric;
  v_new_passive numeric;
  v_max_daily numeric := 5.0;
BEGIN
  -- Get or create credits record
  INSERT INTO user_credits (user_id, daily_credits, bonus_credits, purchased_credits, passive_credits, last_passive_credit_at)
  VALUES (_user_id, v_max_daily, 0, 0, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_credits FROM user_credits WHERE user_id = _user_id;

  -- Calculate passive credits to add (0.1 per 2 hours, max 1.0)
  v_hours_passed := EXTRACT(EPOCH FROM (now() - COALESCE(v_credits.last_passive_credit_at, now()))) / 3600;
  v_passive_to_add := FLOOR(v_hours_passed / 2) * 0.1;
  
  IF v_passive_to_add > 0 THEN
    v_new_passive := LEAST(COALESCE(v_credits.passive_credits, 0) + v_passive_to_add, 1.0);
    
    -- Only update if there's something to add
    IF v_new_passive > COALESCE(v_credits.passive_credits, 0) THEN
      UPDATE user_credits 
      SET passive_credits = v_new_passive,
          last_passive_credit_at = now()
      WHERE user_id = _user_id;
      
      v_credits.passive_credits := v_new_passive;
    END IF;
  END IF;

  -- Check and reset daily credits at midnight
  IF v_credits.daily_credits_last_reset IS NULL OR 
     v_credits.daily_credits_last_reset::date < CURRENT_DATE THEN
    UPDATE user_credits 
    SET daily_credits = v_max_daily,
        daily_credits_last_reset = now()
    WHERE user_id = _user_id;
    v_credits.daily_credits := v_max_daily;
  END IF;

  RETURN json_build_object(
    'user_id', v_credits.user_id,
    'passive_credits', COALESCE(v_credits.passive_credits, 0),
    'daily_credits', v_credits.daily_credits,
    'bonus_credits', v_credits.bonus_credits,
    'purchased_credits', v_credits.purchased_credits,
    'total_credits', COALESCE(v_credits.passive_credits, 0) + v_credits.daily_credits + v_credits.bonus_credits + v_credits.purchased_credits,
    'max_daily_credits', v_max_daily,
    'daily_credits_reset_date', v_credits.daily_credits_last_reset
  );
END;
$$;

-- Update deduct_credits function to use passive credits FIRST
CREATE OR REPLACE FUNCTION public.deduct_credits(
  _user_id uuid,
  _amount numeric,
  _transaction_type text,
  _description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits user_credits%ROWTYPE;
  v_remaining numeric := _amount;
  v_from_passive numeric := 0;
  v_from_daily numeric := 0;
  v_from_bonus numeric := 0;
  v_from_purchased numeric := 0;
  v_total numeric;
BEGIN
  -- Get current credits
  SELECT * INTO v_credits FROM user_credits WHERE user_id = _user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User credits not found');
  END IF;

  -- Calculate total available
  v_total := COALESCE(v_credits.passive_credits, 0) + v_credits.daily_credits + v_credits.bonus_credits + v_credits.purchased_credits;
  
  IF v_total < _amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits');
  END IF;

  -- Deduct in order: Passive -> Daily -> Bonus -> Purchased
  -- 1. Passive credits (FIRST)
  IF v_remaining > 0 AND COALESCE(v_credits.passive_credits, 0) > 0 THEN
    v_from_passive := LEAST(v_remaining, COALESCE(v_credits.passive_credits, 0));
    v_remaining := v_remaining - v_from_passive;
  END IF;

  -- 2. Daily credits
  IF v_remaining > 0 AND v_credits.daily_credits > 0 THEN
    v_from_daily := LEAST(v_remaining, v_credits.daily_credits);
    v_remaining := v_remaining - v_from_daily;
  END IF;

  -- 3. Bonus credits
  IF v_remaining > 0 AND v_credits.bonus_credits > 0 THEN
    v_from_bonus := LEAST(v_remaining, v_credits.bonus_credits);
    v_remaining := v_remaining - v_from_bonus;
  END IF;

  -- 4. Purchased credits
  IF v_remaining > 0 AND v_credits.purchased_credits > 0 THEN
    v_from_purchased := LEAST(v_remaining, v_credits.purchased_credits);
    v_remaining := v_remaining - v_from_purchased;
  END IF;

  -- Update credits
  UPDATE user_credits
  SET passive_credits = COALESCE(passive_credits, 0) - v_from_passive,
      daily_credits = daily_credits - v_from_daily,
      bonus_credits = bonus_credits - v_from_bonus,
      purchased_credits = purchased_credits - v_from_purchased,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Record transactions for each credit type used
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
$$;