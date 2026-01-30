-- Create task types enum
CREATE TYPE public.moderator_task_type AS ENUM (
  'identity_verification',
  'report_response', 
  'user_suspension',
  'private_message_response'
);

-- Task rates configuration table
CREATE TABLE public.task_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type moderator_task_type UNIQUE NOT NULL,
  rate_cents integer NOT NULL, -- Rate in cents (e.g., 50 for €0.50)
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default rates
INSERT INTO public.task_rates (task_type, rate_cents, description) VALUES
  ('identity_verification', 50, 'Vérification d''identité d''un utilisateur'),
  ('report_response', 10, 'Réponse et investigation d''un signalement'),
  ('user_suspension', 15, 'Suspension ou blocage d''un utilisateur'),
  ('private_message_response', 2, 'Réponse à un message privé utilisateur');

-- Moderator wallets table
CREATE TABLE public.moderator_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance_cents integer DEFAULT 0 NOT NULL,
  total_earned_cents integer DEFAULT 0 NOT NULL,
  total_withdrawn_cents integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Earnings log - tracks each completed task
CREATE TABLE public.moderator_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_type moderator_task_type NOT NULL,
  amount_cents integer NOT NULL,
  target_user_id uuid, -- The user the action was performed on
  target_entity_id uuid, -- Report ID, verification ID, etc.
  description text,
  created_at timestamptz DEFAULT now()
);

-- Anti-abuse tracking
CREATE TABLE public.moderator_action_cooldowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_type moderator_task_type NOT NULL,
  target_user_id uuid NOT NULL,
  last_action_at timestamptz DEFAULT now(),
  action_count integer DEFAULT 1,
  UNIQUE(user_id, task_type, target_user_id)
);

-- Withdrawal requests
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  status withdrawal_status DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid,
  rejection_reason text,
  payment_reference text
);

-- Enable RLS
ALTER TABLE public.task_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_action_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_rates (read-only for all, admin can update)
CREATE POLICY "Anyone can view task rates"
ON public.task_rates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage task rates"
ON public.task_rates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for moderator_wallets
CREATE POLICY "Moderators can view their own wallet"
ON public.moderator_wallets FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "System can manage wallets"
ON public.moderator_wallets FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- RLS for moderator_earnings
CREATE POLICY "Moderators can view their own earnings"
ON public.moderator_earnings FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "System can insert earnings"
ON public.moderator_earnings FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- RLS for cooldowns
CREATE POLICY "Moderators can manage their own cooldowns"
ON public.moderator_action_cooldowns FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);

-- RLS for withdrawal_requests
CREATE POLICY "Users can view their own withdrawals"
ON public.withdrawal_requests FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can create withdrawal requests"
ON public.withdrawal_requests FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
);

CREATE POLICY "Admins can update withdrawal requests"
ON public.withdrawal_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to check if action is allowed (anti-abuse)
CREATE OR REPLACE FUNCTION public.can_earn_for_action(
  _user_id uuid,
  _task_type moderator_task_type,
  _target_user_id uuid,
  _cooldown_minutes integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last_action timestamptz;
  _action_count integer;
BEGIN
  -- Check last action on this target
  SELECT last_action_at, action_count 
  INTO _last_action, _action_count
  FROM public.moderator_action_cooldowns
  WHERE user_id = _user_id 
    AND task_type = _task_type 
    AND target_user_id = _target_user_id;
  
  -- If no previous action, allow
  IF _last_action IS NULL THEN
    RETURN true;
  END IF;
  
  -- If too many actions in short time (abuse detection)
  IF _action_count >= 3 AND _last_action > now() - interval '5 minutes' THEN
    RETURN false;
  END IF;
  
  -- If within cooldown period, don't allow
  IF _last_action > now() - (_cooldown_minutes || ' minutes')::interval THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to record earning
CREATE OR REPLACE FUNCTION public.record_moderator_earning(
  _user_id uuid,
  _task_type moderator_task_type,
  _target_user_id uuid DEFAULT NULL,
  _target_entity_id uuid DEFAULT NULL,
  _description text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rate_cents integer;
  _can_earn boolean;
BEGIN
  -- Check if user is admin or moderator
  IF NOT (public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'moderator')) THEN
    RETURN false;
  END IF;
  
  -- Get task rate
  SELECT rate_cents INTO _rate_cents
  FROM public.task_rates
  WHERE task_type = _task_type AND is_active = true;
  
  IF _rate_cents IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check anti-abuse if target user exists
  IF _target_user_id IS NOT NULL THEN
    _can_earn := public.can_earn_for_action(_user_id, _task_type, _target_user_id);
    IF NOT _can_earn THEN
      RETURN false;
    END IF;
    
    -- Update cooldown tracking
    INSERT INTO public.moderator_action_cooldowns (user_id, task_type, target_user_id, last_action_at, action_count)
    VALUES (_user_id, _task_type, _target_user_id, now(), 1)
    ON CONFLICT (user_id, task_type, target_user_id) 
    DO UPDATE SET 
      last_action_at = now(),
      action_count = CASE 
        WHEN moderator_action_cooldowns.last_action_at < now() - interval '1 hour' 
        THEN 1 
        ELSE moderator_action_cooldowns.action_count + 1 
      END;
  END IF;
  
  -- Record the earning
  INSERT INTO public.moderator_earnings (user_id, task_type, amount_cents, target_user_id, target_entity_id, description)
  VALUES (_user_id, _task_type, _rate_cents, _target_user_id, _target_entity_id, _description);
  
  -- Update wallet (create if not exists)
  INSERT INTO public.moderator_wallets (user_id, balance_cents, total_earned_cents)
  VALUES (_user_id, _rate_cents, _rate_cents)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance_cents = moderator_wallets.balance_cents + _rate_cents,
    total_earned_cents = moderator_wallets.total_earned_cents + _rate_cents,
    updated_at = now();
  
  RETURN true;
END;
$$;

-- Function to request withdrawal
CREATE OR REPLACE FUNCTION public.request_withdrawal(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _balance integer;
  _min_withdrawal integer := 5000; -- €50 in cents
  _request_id uuid;
BEGIN
  -- Get current balance
  SELECT balance_cents INTO _balance
  FROM public.moderator_wallets
  WHERE user_id = _user_id;
  
  IF _balance IS NULL OR _balance < _min_withdrawal THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Solde insuffisant. Minimum requis: 50€',
      'current_balance', COALESCE(_balance, 0)
    );
  END IF;
  
  -- Check for pending request
  IF EXISTS (
    SELECT 1 FROM public.withdrawal_requests 
    WHERE user_id = _user_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Une demande de retrait est déjà en cours'
    );
  END IF;
  
  -- Create withdrawal request
  INSERT INTO public.withdrawal_requests (user_id, amount_cents)
  VALUES (_user_id, _balance)
  RETURNING id INTO _request_id;
  
  -- Deduct from wallet
  UPDATE public.moderator_wallets
  SET 
    balance_cents = 0,
    total_withdrawn_cents = total_withdrawn_cents + _balance,
    updated_at = now()
  WHERE user_id = _user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'request_id', _request_id,
    'amount_cents', _balance
  );
END;
$$;

-- Indexes for performance
CREATE INDEX idx_moderator_earnings_user_id ON public.moderator_earnings(user_id);
CREATE INDEX idx_moderator_earnings_created_at ON public.moderator_earnings(created_at);
CREATE INDEX idx_moderator_action_cooldowns_lookup ON public.moderator_action_cooldowns(user_id, task_type, target_user_id);
CREATE INDEX idx_withdrawal_requests_user_status ON public.withdrawal_requests(user_id, status);

-- Trigger for updated_at
CREATE TRIGGER update_task_rates_updated_at
BEFORE UPDATE ON public.task_rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_moderator_wallets_updated_at
BEFORE UPDATE ON public.moderator_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();