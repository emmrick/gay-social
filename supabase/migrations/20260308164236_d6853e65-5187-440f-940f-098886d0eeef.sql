
CREATE OR REPLACE FUNCTION public.process_referral_on_verification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ref_record RECORD;
  _reward_amount numeric;
BEGIN
  -- Seulement si le statut passe à 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Chercher un parrainage en attente pour cet utilisateur
    SELECT * INTO ref_record
    FROM public.referrals
    WHERE referred_user_id = NEW.user_id
      AND status = 'pending';
    
    IF FOUND THEN
      -- Récupérer le montant dynamique depuis credit_costs
      SELECT cost_value INTO _reward_amount
      FROM public.credit_costs
      WHERE cost_key = 'referral_reward';
      
      -- Fallback à 30 si non trouvé
      _reward_amount := COALESCE(_reward_amount, 30.0);
      
      -- Attribuer les crédits au parrain
      PERFORM public.add_credits(
        ref_record.referrer_user_id, 
        _reward_amount, 
        'bonus', 
        'referral_bonus', 
        'Bonus parrainage - filleul vérifié (' || _reward_amount || ' crédits)'
      );
      
      -- Attribuer les crédits au filleul
      PERFORM public.add_credits(
        NEW.user_id, 
        _reward_amount, 
        'bonus', 
        'referral_bonus', 
        'Bonus parrainage - inscription vérifiée (' || _reward_amount || ' crédits)'
      );
      
      -- Mettre à jour le statut du parrainage
      UPDATE public.referrals
      SET 
        status = 'completed',
        referrer_reward_applied = true,
        referrer_reward_applied_at = now(),
        referred_reward_applied = true,
        referred_reward_applied_at = now()
      WHERE id = ref_record.id;
      
      -- Incrémenter le compteur de parrainages réussis
      UPDATE public.referral_codes
      SET successful_referrals = successful_referrals + 1
      WHERE id = ref_record.referral_code_id;
      
      -- Notification au parrain
      INSERT INTO public.notifications (user_id, type, title, message, is_read)
      VALUES (
        ref_record.referrer_user_id,
        'referral_success',
        '🎉 Parrainage réussi !',
        'Ton filleul a été vérifié ! Tu as reçu ' || _reward_amount || ' crédits bonus.',
        false
      );
      
      -- Notification au filleul
      INSERT INTO public.notifications (user_id, type, title, message, is_read)
      VALUES (
        NEW.user_id,
        'referral_bonus',
        '🎁 Bonus de parrainage !',
        'Tu as reçu ' || _reward_amount || ' crédits bonus grâce à ton parrain !',
        false
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Also update process_referral_credits to use dynamic amount
CREATE OR REPLACE FUNCTION public.process_referral_credits(_referrer_id uuid, _referred_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _reward_amount numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Cette fonction est réservée au système');
  END IF;

  -- Récupérer le montant dynamique
  SELECT cost_value INTO _reward_amount
  FROM public.credit_costs
  WHERE cost_key = 'referral_reward';
  _reward_amount := COALESCE(_reward_amount, 30.0);

  PERFORM add_credits(_referrer_id, _reward_amount, 'bonus', 'referral_bonus', 'Bonus parrainage - filleul vérifié');
  PERFORM add_credits(_referred_id, _reward_amount, 'bonus', 'referral_bonus', 'Bonus parrainage - inscription vérifiée');
  
  RETURN json_build_object('success', true, 'referrer_credits', _reward_amount, 'referred_credits', _reward_amount);
END;
$function$;
