-- ============================================================
-- 1. SECURITY DEFINER hardening
-- ============================================================
DO $$
DECLARE
  fn record;
  sig text;
  allow_anon boolean;
  is_trigger boolean;
  is_cron boolean;

  anon_allow text[] := ARRAY[
    'get_public_profiles',
    'get_community_public_stats',
    'request_advertiser_magic_link',
    'consume_advertiser_magic_link',
    'get_advertiser_wallet',
    'apply_advertiser_promo',
    'get_visitor_support_messages',
    'validate_referral_code'
  ];

  trigger_only text[] := ARRAY[
    'auto_create_advertiser_wallet',
    'auto_reopen_ticket_on_client_message',
    'auto_set_avatar_on_photo_insert',
    'cancel_deletion_on_login',
    'check_photo_limit',
    'create_ad_review_task',
    'create_credit_purchase_task',
    'create_photo_moderation_task',
    'create_report_task',
    'create_support_task',
    'create_support_task_on_reopen',
    'create_tween_review_mission',
    'create_verification_task',
    'create_visitor_support_task',
    'generate_referral_code',
    'generate_ticket_number',
    'set_ticket_number',
    'set_first_verified_at',
    'notify_moderators_new_task',
    'notify_suggestion_decision',
    'notify_tween_followers',
    'process_referral_on_verification',
    'revoke_dossier_access_on_ticket_change',
    'send_album_share_stopped_notification',
    'send_album_shared_notification',
    'send_verification_notification',
    'send_welcome_notification',
    'update_highest_balance',
    'update_successful_referrals',
    'update_tween_comments_count',
    'update_tween_likes_count',
    'update_updated_at_column'
  ];

  cron_only text[] := ARRAY[
    'cleanup_expired_suspensions',
    'cleanup_stale_online_profiles',
    'expire_stale_moderation_tasks',
    'recycle_fully_refused_tasks',
    'check_stale_tasks_send_sms',
    'get_stale_tasks_for_resms',
    'purge_old_unread_ephemeral_media',
    'backfill_welcome_emails',
    'enqueue_email',
    'read_email_batch',
    'delete_email',
    'move_to_dlq'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    sig := format('public.%I(%s)', fn.proname, fn.args);
    is_trigger := fn.proname = ANY(trigger_only);
    is_cron    := fn.proname = ANY(cron_only);
    allow_anon := fn.proname = ANY(anon_allow);

    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', sig);

    IF NOT (is_trigger OR is_cron) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', sig);
      IF allow_anon THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', sig);
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 2. Harden the 6 "USING (true)" policies (visitor/anon insert flows)
-- ============================================================

-- 2a. advertiser_deposits
DROP POLICY IF EXISTS "Anon can create deposits" ON public.advertiser_deposits;
DROP POLICY IF EXISTS "Authenticated can create deposits" ON public.advertiser_deposits;

CREATE POLICY "Anon can create deposits"
ON public.advertiser_deposits
FOR INSERT
TO anon
WITH CHECK (
  wallet_id IS NOT NULL
  AND amount_cents > 0
  AND amount_cents <= 1000000
  AND status IN ('pending', 'created')
);

CREATE POLICY "Authenticated can create deposits"
ON public.advertiser_deposits
FOR INSERT
TO authenticated
WITH CHECK (
  wallet_id IS NOT NULL
  AND amount_cents > 0
  AND amount_cents <= 1000000
  AND status IN ('pending', 'created')
);

-- 2b. advertiser_promo_redemptions
DROP POLICY IF EXISTS "Anyone can insert redemptions" ON public.advertiser_promo_redemptions;

CREATE POLICY "Anyone can insert redemptions"
ON public.advertiser_promo_redemptions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  code_id IS NOT NULL
  AND advertiser_email IS NOT NULL
  AND length(advertiser_email) BETWEEN 3 AND 320
  AND EXISTS (
    SELECT 1 FROM public.advertiser_promo_codes c
    WHERE c.id = code_id
      AND c.is_active = true
      AND (c.expires_at IS NULL OR c.expires_at > now())
  )
);

-- 2c. security_events
DROP POLICY IF EXISTS "Anyone can insert security events" ON public.security_events;

CREATE POLICY "Anyone can insert security events"
ON public.security_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_type IS NOT NULL
  AND length(event_type) <= 64
  AND length(description) <= 1000
  AND (payload IS NULL OR length(payload) <= 4000)
);

-- 2d. visitor_support_messages
DROP POLICY IF EXISTS "Anyone can insert visitor messages" ON public.visitor_support_messages;

CREATE POLICY "Anyone can insert visitor messages"
ON public.visitor_support_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  session_id IS NOT NULL
  AND content IS NOT NULL
  AND length(content) BETWEEN 1 AND 4000
  AND sender_type IN ('visitor', 'agent', 'bot', 'system')
  AND EXISTS (
    SELECT 1 FROM public.visitor_support_sessions s
    WHERE s.id = session_id
      AND s.closed_at IS NULL
  )
);

-- 2e. visitor_support_sessions
DROP POLICY IF EXISTS "Anyone can create visitor sessions" ON public.visitor_support_sessions;

CREATE POLICY "Anyone can create visitor sessions"
ON public.visitor_support_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  first_name IS NOT NULL
  AND last_name IS NOT NULL
  AND length(first_name) BETWEEN 1 AND 64
  AND length(last_name) BETWEEN 1 AND 64
  AND (email IS NULL OR length(email) BETWEEN 3 AND 320)
  AND (phone_number IS NULL OR length(phone_number) BETWEEN 4 AND 32)
);
