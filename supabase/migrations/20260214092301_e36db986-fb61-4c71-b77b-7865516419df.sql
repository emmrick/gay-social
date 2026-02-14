
-- Table for dynamic credit costs manageable by admins
CREATE TABLE public.credit_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cost_key TEXT NOT NULL UNIQUE,
  cost_value NUMERIC NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_costs ENABLE ROW LEVEL SECURITY;

-- Everyone can read costs (needed for frontend pricing display)
CREATE POLICY "Anyone can read credit costs"
ON public.credit_costs FOR SELECT
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update credit costs"
ON public.credit_costs FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert
CREATE POLICY "Admins can insert credit costs"
ON public.credit_costs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed with current values
INSERT INTO public.credit_costs (cost_key, cost_value, label, category) VALUES
  ('private_message_text', 0.1, 'Message privé (texte)', 'messages'),
  ('private_message_media', 0.2, 'Message privé (média)', 'messages'),
  ('group_message_text', 0.1, 'Message groupe (texte)', 'messages'),
  ('group_message_media', 0.2, 'Message groupe (média)', 'messages'),
  ('ephemeral_media', 0.5, 'Média éphémère', 'messages'),
  ('album_share', 1.0, 'Partage d''album', 'albums'),
  ('album_create', 10.0, 'Création d''album (2e+)', 'albums'),
  ('profile_reaction', 0.3, 'Réaction profil', 'profil'),
  ('profile_view', 0.1, 'Vue profil', 'profil'),
  ('nearby_unlock_30', 5.0, 'Débloquer à proximité (30km)', 'proximité'),
  ('nearby_unlock_130', 10.0, 'Débloquer à proximité (130km)', 'proximité'),
  ('swipe_like', 0.5, 'Swipe Like', 'swipe'),
  ('swipe_dislike', 0.2, 'Swipe Dislike', 'swipe'),
  ('swipe_hide', 0.1, 'Swipe Masquer', 'swipe'),
  ('swipe_start_conversation', 0.2, 'Démarrer conversation (swipe)', 'swipe'),
  ('join_extra_group', 5.0, 'Rejoindre groupe hors département', 'groupes'),
  ('chatbot_message', 0.5, 'Message chatbot', 'chatbot'),
  ('chatbot_info', 2.5, 'Info chatbot (1-10)', 'chatbot'),
  ('chatbot_info_extra', 20.0, 'Info chatbot (11+)', 'chatbot'),
  ('chatbot_activate', 10.0, 'Activation chatbot', 'chatbot');

-- Trigger for updated_at
CREATE TRIGGER update_credit_costs_updated_at
BEFORE UPDATE ON public.credit_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
