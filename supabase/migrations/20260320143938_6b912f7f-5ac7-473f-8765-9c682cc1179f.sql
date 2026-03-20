INSERT INTO public.credit_costs (cost_key, cost_value, label, category) VALUES
  ('mission_identity_verification', 30.0, 'Mission: Vérifier identité', 'missions'),
  ('mission_add_photos', 2.0, 'Mission: Ajouter 3+ photos', 'missions'),
  ('mission_complete_profile', 3.0, 'Mission: Compléter profil', 'missions'),
  ('mission_send_messages', 1.0, 'Mission: Envoyer 10 messages', 'missions')
ON CONFLICT (cost_key) DO NOTHING;