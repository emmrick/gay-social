/**
 * Définition des 10 étapes du tour d'onboarding plein écran.
 * Chaque étape est autonome : icône, titre, description, astuce, CTA optionnel.
 *
 * ⚠️ N'inventer aucune fonctionnalité — tout est aligné sur ce qui existe
 * réellement dans l'app (HELP_FLOW, pages, hooks).
 */
import {
  Sparkles, Home, Heart, User as UserIcon, MessageCircle, Image as ImageIcon,
  Coins, Gift, Shield, Rocket,
} from 'lucide-react';

export type OnboardingCTA = {
  /** Texte du bouton */
  label: string;
  /** Route vers laquelle naviguer (la fermeture du tour est gérée à part) */
  to: string;
};

export interface OnboardingStep {
  /** ID stable (analytics + reprise) */
  id: string;
  /** Icône Lucide affichée dans le rond gradient */
  icon: typeof Sparkles;
  /** Emoji affiché à côté du titre (modération conseillée) */
  emoji: string;
  /** Titre court (≤ 40 caractères) */
  title: string;
  /** Sous-titre / pitch (1 phrase, ≤ 90 caractères) */
  subtitle: string;
  /** Description un peu plus longue, rendue sous forme de paragraphe */
  description: string;
  /** Astuce rapide affichée dans un encart 💡 */
  tip?: string;
  /** Liste de mini-points clés (puces) */
  bullets?: string[];
  /** Couleur du gradient & accent (token tailwind) */
  accent: 'primary' | 'rose' | 'violet' | 'sky' | 'emerald' | 'amber' | 'red' | 'cyan' | 'orange';
  /** CTA contextuel optionnel (ex: « Aller à mon profil ») */
  cta?: OnboardingCTA;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    icon: Sparkles,
    emoji: '🎉',
    title: 'Bienvenue sur Gay Social',
    subtitle: 'On t\'embarque pour un tour rapide et clair.',
    description:
      "En quelques écrans tu vas découvrir comment exploiter à fond la communauté : profil, rencontres, messagerie, crédits, sécurité…",
    bullets: [
      'Plateforme 100 % gay, vérifiée et bienveillante',
      'Réservée aux adultes (+18 ans)',
      'Tu pourras revoir ce guide à tout moment',
    ],
    accent: 'primary',
  },
  {
    id: 'home',
    icon: Home,
    emoji: '🏠',
    title: 'Page d\'accueil',
    subtitle: 'Tout commence ici : tes membres, tes favoris, tes interactions.',
    description:
      "L'accueil regroupe 4 onglets pour explorer la communauté autour de toi sans te perdre.",
    bullets: [
      '📍 Proximité — membres proches selon ton rayon',
      '⭐ Favoris — les profils que tu suis',
      '👀 Visites — qui a vu ton profil',
      '🔥 Réactions — qui a réagi à ton profil',
    ],
    tip: 'Active la géolocalisation pour profiter pleinement de l\'onglet Proximité.',
    accent: 'sky',
    cta: { label: 'Voir l\'accueil', to: '/' },
  },
  {
    id: 'swipe',
    icon: Heart,
    emoji: '🔥',
    title: 'Swipe & Découverte',
    subtitle: 'Glisse, like, matche — c\'est aussi simple que ça.',
    description:
      "Parcours les profils sous forme de cartes empilées. Un like mutuel ouvre directement la conversation.",
    bullets: [
      '➡️ Swipe à droite : like',
      '⬅️ Swipe à gauche : passer',
      '🎯 Match mutuel = chat ouvert immédiatement',
    ],
    tip: 'Boost ton profil 24h pour apparaître en priorité dans la pile (10 crédits).',
    accent: 'rose',
    cta: { label: 'Lancer un swipe', to: '/swipe' },
  },
  {
    id: 'profile',
    icon: UserIcon,
    emoji: '👤',
    title: 'Ton profil',
    subtitle: 'Une vitrine soignée = beaucoup plus de visites.',
    description:
      "Une photo de profil approuvée est obligatoire. Ajoute ensuite ta bio, des albums et personnalise ton profil pour te démarquer.",
    bullets: [
      '📸 Photo de profil obligatoire (modérée)',
      '✅ Vérification d\'identité = badge bleu et visibilité accrue',
      '🤖 Active ton ChatBot perso pour répondre quand tu es absent',
      '🚀 Boost ton profil pour 24h',
    ],
    tip: 'Modifier ton pseudo et ton âge est limité à 1 fois tous les 30 jours.',
    accent: 'cyan',
    cta: { label: 'Voir mon profil', to: '/profile' },
  },
  {
    id: 'messaging',
    icon: MessageCircle,
    emoji: '💬',
    title: 'Messagerie',
    subtitle: 'Privé, groupes régionaux, médias éphémères : tout y est.',
    description:
      "Discute en privé ou rejoins l\'un des 101 salons régionaux. Le premier message à un nouveau contact est gratuit.",
    bullets: [
      '✉️ 1ᵉʳ message privé gratuit',
      '🗺️ Salons par département + groupes personnalisés',
      '⚡ Selfies éphémères (vue unique, captures détectées)',
      '🎁 Cadeaux de crédits dans la conversation',
    ],
    tip: 'Active le filtre d\'âge dans Paramètres pour ne recevoir que les messages d\'une tranche choisie.',
    accent: 'violet',
    cta: { label: 'Ouvrir mes messages', to: '/messages' },
  },
  {
    id: 'albums',
    icon: ImageIcon,
    emoji: '📸',
    title: 'Albums & Selfies',
    subtitle: 'Partage ce que tu veux, à qui tu veux, comme tu veux.',
    description:
      "Range tes médias dans des albums Public ou Privé (aperçu flouté). Partage temporaire ou illimité, accès révocable à tout moment.",
    bullets: [
      '📂 Albums Public ou Privé verrouillés',
      '🔓 Demande d\'accès via le chat (2 crédits, remboursés si refus)',
      '⚡ Selfies éphémères protégés par filigrane',
      '⭐ Stories Tween 24h pour partager ton quotidien',
    ],
    accent: 'amber',
    cta: { label: 'Ouvrir le fil Tween', to: '/tween' },
  },
  {
    id: 'credits',
    icon: Coins,
    emoji: '💎',
    title: 'Crédits',
    subtitle: 'La monnaie de l\'app — tu peux en gagner gratuitement.',
    description:
      "Les crédits débloquent les fonctionnalités premium (boost, médias, accès album…). Aucun coût ne te surprendra : il s'affiche toujours avant action.",
    bullets: [
      '🎁 Connexion quotidienne, parrainage, codes promo',
      '💳 Achat sécurisé via PayPal',
      '📊 Historique complet et transparent',
      '🔥 Promotions ponctuelles avec compte à rebours',
    ],
    tip: 'Une promotion active s\'affiche en tête de la page Crédits avec un bandeau coloré.',
    accent: 'amber',
    cta: { label: 'Voir mes crédits', to: '/credits' },
  },
  {
    id: 'referral',
    icon: Gift,
    emoji: '🎁',
    title: 'Parrainage',
    subtitle: 'Invite des amis, gagnez 30 crédits chacun.',
    description:
      "Partage ton lien unique de parrainage. Dès qu'un filleul s'inscrit et complète son profil, vous recevez tous les deux 30 crédits.",
    bullets: [
      '🔗 Lien unique à partager (SMS, réseaux, IRL)',
      '🎁 +30 crédits pour toi ET pour ton filleul',
      '♾️ Aucun plafond sur le nombre de parrainages',
    ],
    tip: 'Suis tes parrainages en temps réel dans Paramètres → Parrainage.',
    accent: 'emerald',
    cta: { label: 'Ouvrir mes crédits', to: '/credits' },
  },
  {
    id: 'security',
    icon: Shield,
    emoji: '🔒',
    title: 'Sécurité & Confidentialité',
    subtitle: 'Tu gardes le contrôle, on protège tes données.',
    description:
      "Bloque, signale, masque ton statut, configure un PIN — tout est pensé pour que tu te sentes en sécurité.",
    bullets: [
      '🔐 PIN à 6 chiffres + biométrie à l\'ouverture',
      '🚫 Blocage et signalement en 2 touches',
      '📷 Détection automatique des captures d\'écran',
      '💧 Filigrane sur tous les médias',
    ],
    tip: 'Tu peux exporter toutes tes données (RGPD) depuis Paramètres → Compte.',
    accent: 'red',
    cta: { label: 'Ouvrir les règles', to: '/regles' },
  },
  {
    id: 'ready',
    icon: Rocket,
    emoji: '🚀',
    title: 'Tu es prêt !',
    subtitle: 'Profite à fond de la communauté Gay Social.',
    description:
      "Tu connais maintenant l\'essentiel. Tu peux relancer ce guide à tout moment depuis tes paramètres ou le chatbot d'aide.",
    bullets: [
      '⚙️ Paramètres → Aide & Support → « Revoir le guide »',
      '🤖 Chatbot d\'aide → « Revoir le guide »',
      '📖 Guide complet avec tous les détails dans /guide',
    ],
    accent: 'primary',
    cta: { label: 'Aller à l\'accueil', to: '/' },
  },
];

/** Map des classes tailwind par accent (palette du design system). */
export const ACCENT_CLASSES: Record<OnboardingStep['accent'], { from: string; to: string; ring: string; text: string; bg: string }> = {
  primary: { from: 'from-primary',           to: 'to-primary/60',         ring: 'ring-primary/30',         text: 'text-primary',           bg: 'bg-primary/10' },
  rose:    { from: 'from-pink-500',          to: 'to-rose-400',            ring: 'ring-pink-500/30',         text: 'text-pink-500',          bg: 'bg-pink-500/10' },
  violet:  { from: 'from-violet-500',        to: 'to-fuchsia-400',         ring: 'ring-violet-500/30',       text: 'text-violet-500',        bg: 'bg-violet-500/10' },
  sky:     { from: 'from-sky-500',           to: 'to-cyan-400',            ring: 'ring-sky-500/30',          text: 'text-sky-500',           bg: 'bg-sky-500/10' },
  emerald: { from: 'from-emerald-500',       to: 'to-teal-400',            ring: 'ring-emerald-500/30',      text: 'text-emerald-500',       bg: 'bg-emerald-500/10' },
  amber:   { from: 'from-amber-500',         to: 'to-orange-400',          ring: 'ring-amber-500/30',        text: 'text-amber-500',         bg: 'bg-amber-500/10' },
  red:     { from: 'from-red-500',           to: 'to-rose-500',            ring: 'ring-red-500/30',          text: 'text-red-500',           bg: 'bg-red-500/10' },
  cyan:    { from: 'from-cyan-500',          to: 'to-sky-400',             ring: 'ring-cyan-500/30',         text: 'text-cyan-500',          bg: 'bg-cyan-500/10' },
  orange:  { from: 'from-orange-500',        to: 'to-amber-400',           ring: 'ring-orange-500/30',       text: 'text-orange-500',        bg: 'bg-orange-500/10' },
};
