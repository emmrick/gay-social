-- Update the welcome notification function with comprehensive message
CREATE OR REPLACE FUNCTION public.send_welcome_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert welcome notification for the new user
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    is_read
  ) VALUES (
    NEW.user_id,
    'welcome',
    '🎉 Bienvenue sur GayConnect !',
    E'Nous sommes ravis de t''accueillir dans notre communauté ! 🏳️‍🌈\n\n' ||
    E'📱 **Comment ça fonctionne ?**\n' ||
    E'• Rejoins les groupes de ta région pour discuter avec les membres proches de toi\n' ||
    E'• Envoie des messages privés pour des conversations plus intimes\n' ||
    E'• Explore les profils et ajoute tes favoris\n' ||
    E'• Partage tes albums photos avec qui tu veux\n' ||
    E'• Complète ton profil pour être plus visible\n\n' ||
    E'📋 **Règles à respecter :**\n' ||
    E'• Sois respectueux envers tous les membres\n' ||
    E'• Pas de spam ni de publicité\n' ||
    E'• Pas de contenu illégal\n' ||
    E'• Respecte la vie privée des autres\n' ||
    E'• Les faux profils seront bannis\n\n' ||
    E'🔒 **Sécurité renforcée :**\n' ||
    E'Pour ta sécurité, nous te recommandons fortement de NE PAS échanger d''informations personnelles (téléphone, Snapchat, Facebook, Instagram, ou tout autre réseau) avec les autres membres.\n\n' ||
    E'Notre site dispose de toutes les fonctionnalités nécessaires pour communiquer en toute sécurité. Si tu rencontres un conflit avec un membre, nous pouvons intervenir et prendre des mesures.\n\n' ||
    E'⚠️ En revanche, si un problème survient en dehors de notre plateforme, nous ne pourrons être tenus responsables et ne serons pas en mesure de t''aider.\n\n' ||
    E'Amuse-toi bien et fais de belles rencontres ! 💜',
    false
  );

  RETURN NEW;
END;
$$;