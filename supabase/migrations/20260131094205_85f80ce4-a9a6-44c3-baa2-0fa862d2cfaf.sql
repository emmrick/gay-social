-- Create a function to send verification status notification
CREATE OR REPLACE FUNCTION public.send_verification_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger on status change to approved or rejected
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      action_url,
      is_read
    ) VALUES (
      NEW.user_id,
      'verification_approved',
      '✅ Identité vérifiée !',
      'Félicitations ! Ton identité a été vérifiée avec succès. Tu as maintenant accès à toutes les fonctionnalités de GayConnect.',
      '/',
      false
    );
  ELSIF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      action_url,
      is_read
    ) VALUES (
      NEW.user_id,
      'verification_rejected',
      '❌ Vérification refusée',
      COALESCE('Ta demande de vérification a été refusée : ' || NEW.rejection_reason, 'Ta demande de vérification a été refusée. Tu peux soumettre une nouvelle demande.'),
      '/',
      false
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger on identity_verifications table
DROP TRIGGER IF EXISTS on_verification_status_change ON public.identity_verifications;

CREATE TRIGGER on_verification_status_change
  AFTER UPDATE OF status ON public.identity_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_verification_notification();