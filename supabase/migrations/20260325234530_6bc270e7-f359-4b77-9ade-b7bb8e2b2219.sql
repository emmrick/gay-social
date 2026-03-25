
-- Add new permission columns for moderators
ALTER TABLE public.moderator_permissions 
  ADD COLUMN IF NOT EXISTS can_manage_faq boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_popups boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_logs boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_flyers boolean DEFAULT false;

-- Update the promote_to_moderator function to handle the new permissions
CREATE OR REPLACE FUNCTION public.promote_to_moderator(_target_user_id uuid, _permissions jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _admin_id UUID := auth.uid();
BEGIN
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non autorisé');
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, 'moderator')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.moderator_permissions (
    user_id, assigned_by,
    can_manage_reports, can_manage_users, can_manage_credits,
    can_verify_identity, can_manage_content, can_view_stats,
    can_manage_blocked, can_view_history, can_manage_promo,
    can_broadcast, can_ai_moderation, can_screenshot_sanctions,
    can_manage_faq, can_manage_popups, can_view_logs, can_manage_flyers
  ) VALUES (
    _target_user_id, _admin_id,
    COALESCE((_permissions->>'can_manage_reports')::boolean, false),
    COALESCE((_permissions->>'can_manage_users')::boolean, false),
    COALESCE((_permissions->>'can_manage_credits')::boolean, false),
    COALESCE((_permissions->>'can_verify_identity')::boolean, false),
    COALESCE((_permissions->>'can_manage_content')::boolean, false),
    COALESCE((_permissions->>'can_view_stats')::boolean, false),
    COALESCE((_permissions->>'can_manage_blocked')::boolean, false),
    COALESCE((_permissions->>'can_view_history')::boolean, false),
    COALESCE((_permissions->>'can_manage_promo')::boolean, false),
    COALESCE((_permissions->>'can_broadcast')::boolean, false),
    COALESCE((_permissions->>'can_ai_moderation')::boolean, false),
    COALESCE((_permissions->>'can_screenshot_sanctions')::boolean, false),
    COALESCE((_permissions->>'can_manage_faq')::boolean, false),
    COALESCE((_permissions->>'can_manage_popups')::boolean, false),
    COALESCE((_permissions->>'can_view_logs')::boolean, false),
    COALESCE((_permissions->>'can_manage_flyers')::boolean, false)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    can_manage_reports = COALESCE((_permissions->>'can_manage_reports')::boolean, moderator_permissions.can_manage_reports),
    can_manage_users = COALESCE((_permissions->>'can_manage_users')::boolean, moderator_permissions.can_manage_users),
    can_manage_credits = COALESCE((_permissions->>'can_manage_credits')::boolean, moderator_permissions.can_manage_credits),
    can_verify_identity = COALESCE((_permissions->>'can_verify_identity')::boolean, moderator_permissions.can_verify_identity),
    can_manage_content = COALESCE((_permissions->>'can_manage_content')::boolean, moderator_permissions.can_manage_content),
    can_view_stats = COALESCE((_permissions->>'can_view_stats')::boolean, moderator_permissions.can_view_stats),
    can_manage_blocked = COALESCE((_permissions->>'can_manage_blocked')::boolean, moderator_permissions.can_manage_blocked),
    can_view_history = COALESCE((_permissions->>'can_view_history')::boolean, moderator_permissions.can_view_history),
    can_manage_promo = COALESCE((_permissions->>'can_manage_promo')::boolean, moderator_permissions.can_manage_promo),
    can_broadcast = COALESCE((_permissions->>'can_broadcast')::boolean, moderator_permissions.can_broadcast),
    can_ai_moderation = COALESCE((_permissions->>'can_ai_moderation')::boolean, moderator_permissions.can_ai_moderation),
    can_screenshot_sanctions = COALESCE((_permissions->>'can_screenshot_sanctions')::boolean, moderator_permissions.can_screenshot_sanctions),
    can_manage_faq = COALESCE((_permissions->>'can_manage_faq')::boolean, moderator_permissions.can_manage_faq),
    can_manage_popups = COALESCE((_permissions->>'can_manage_popups')::boolean, moderator_permissions.can_manage_popups),
    can_view_logs = COALESCE((_permissions->>'can_view_logs')::boolean, moderator_permissions.can_view_logs),
    can_manage_flyers = COALESCE((_permissions->>'can_manage_flyers')::boolean, moderator_permissions.can_manage_flyers),
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$function$;
