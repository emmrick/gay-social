
CREATE OR REPLACE FUNCTION public.create_user_notification(
  _user_id uuid,
  _type text,
  _title text,
  _message text DEFAULT NULL,
  _data jsonb DEFAULT NULL,
  _action_url text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _allowed_types text[] := ARRAY[
    'system','new_favorite','photo_exchange_request','photo_exchange_response',
    'private_message','group_mention','group_invite','album_access_request',
    'album_access_granted','album_access_refused','album_share',
    'screenshot_attempt','story_new','story_view','new_story',
    'tween_new_post','tween_like','tween_comment','verification_request',
    'verification_required','suggestion_decision','profile_visit',
    'profile_reaction','match_new','plan_now_nearby','account_restored',
    'system_external_warning','admin_credit','credit_request'
  ];
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF NOT (_type = ANY(_allowed_types)) THEN
    RAISE EXCEPTION 'Invalid notification type: %', _type USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(_title, '')) > 200 THEN RAISE EXCEPTION 'Title too long'; END IF;
  IF length(coalesce(_message, '')) > 2000 THEN RAISE EXCEPTION 'Message too long'; END IF;

  INSERT INTO public.notifications(user_id, type, title, message, data, action_url, is_read)
  VALUES (_user_id, _type, _title, _message, _data, _action_url, false)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_user_notification(uuid, text, text, text, jsonb, text) TO authenticated;
