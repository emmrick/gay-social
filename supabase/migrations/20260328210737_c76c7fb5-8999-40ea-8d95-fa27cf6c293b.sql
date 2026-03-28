-- Create a SECURITY DEFINER function to check if a user is viewing a specific conversation
-- This replaces client-side reads of other users' active conversation state
CREATE OR REPLACE FUNCTION public.is_user_viewing_conversation(
  _target_user_id uuid,
  _private_user_id uuid DEFAULT NULL,
  _chat_room_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _record RECORD;
BEGIN
  SELECT active_private_user_id, active_chat_room_id, updated_at
  INTO _record
  FROM public.user_active_conversations
  WHERE user_id = _target_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check staleness (2 minutes)
  IF _record.updated_at < now() - interval '2 minutes' THEN
    RETURN false;
  END IF;

  IF _private_user_id IS NOT NULL THEN
    RETURN _record.active_private_user_id = _private_user_id;
  END IF;

  IF _chat_room_id IS NOT NULL THEN
    RETURN _record.active_chat_room_id = _chat_room_id;
  END IF;

  RETURN false;
END;
$$;