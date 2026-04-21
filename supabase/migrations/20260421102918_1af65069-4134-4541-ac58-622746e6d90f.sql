-- 1) Drop table résiduelle (déjà vide, plus référencée nulle part dans le code)
DROP TABLE IF EXISTS public.user_chatbot_nodes CASCADE;

-- 2) Drop colonne legacy chatbot_info (base de connaissances IA, plus utilisée)
ALTER TABLE public.user_chatbot_config DROP COLUMN IF EXISTS chatbot_info;

-- 3) Désactiver les anciens coûts crédits IA dans credit_costs (ne plus les afficher)
DELETE FROM public.credit_costs 
WHERE cost_key IN ('chatbot_message', 'chatbot_info', 'chatbot_info_extra', 'chatbot_activate');

-- 4) Fonction utilitaire pour s'assurer qu'un user a une config (appelée à l'ouverture)
CREATE OR REPLACE FUNCTION public.ensure_chatbot_config(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_chatbot_config (user_id, is_active, greeting_message)
  VALUES (
    _user_id,
    false,
    'Salut ! Je suis le chatbot de ce profil. Choisis un sujet ! 😊'
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;