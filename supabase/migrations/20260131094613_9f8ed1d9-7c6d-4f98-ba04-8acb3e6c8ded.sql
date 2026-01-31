-- Create a function to send notification when album share is stopped
CREATE OR REPLACE FUNCTION public.send_album_share_stopped_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _album_name text;
  _owner_username text;
BEGIN
  -- Only trigger when is_active changes from true to false
  IF OLD.is_active = true AND NEW.is_active = false THEN
    -- Get album name
    SELECT name INTO _album_name
    FROM public.user_albums
    WHERE id = NEW.album_id;
    
    -- Get owner username
    SELECT username INTO _owner_username
    FROM public.profiles
    WHERE user_id = NEW.shared_by_user_id;
    
    -- Send notification to recipient
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      action_url,
      is_read
    ) VALUES (
      NEW.shared_with_user_id,
      'album_share_stopped',
      '🔒 Accès album révoqué',
      COALESCE(_owner_username, 'Un utilisateur') || ' a arrêté le partage de son album "' || COALESCE(_album_name, 'Album privé') || '".',
      '/',
      false
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger on album_shares table
DROP TRIGGER IF EXISTS on_album_share_stopped ON public.album_shares;

CREATE TRIGGER on_album_share_stopped
  AFTER UPDATE OF is_active ON public.album_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.send_album_share_stopped_notification();