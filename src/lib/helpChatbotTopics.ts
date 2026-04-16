/**
 * Topic tree for the Help chatbot.
 * Each main topic maps to a primary entry ID + curated sub-topics
 * shown as clickable blocks for fast navigation.
 *
 * IDs prefixed with `static-` resolve against STATIC_KNOWLEDGE
 * (see helpChatbotEngine.ts). FAQ DB articles can also be referenced
 * by their UUID if needed in the future.
 */

export interface TopicSubAction {
  /** Display label on the button */
  label: string;
  /** Optional emoji prefix for visual scanning */
  emoji?: string;
  /** Knowledge entry id to open (static-* or FAQ uuid) */
  entryId: string;
}

export interface ChatbotTopic {
  /** Stable id (used to navigate back to a topic menu) */
  id: string;
  /** Sidebar/grid label */
  label: string;
  /** Lucide icon name (rendered in Help.tsx) */
  icon: 'home' | 'message' | 'heart' | 'credit' | 'verify' | 'image' | 'lock' | 'bug' | 'profile' | 'bell' | 'tween' | 'group' | 'ephemeral' | 'settings' | 'couple' | 'rocket';
  /** Primary entry shown as the headline answer when topic is opened */
  primaryEntryId: string;
  /** Curated clickable follow-ups */
  subActions: TopicSubAction[];
}

export const CHATBOT_TOPICS: ChatbotTopic[] = [
  {
    id: 'home',
    label: "Page d'accueil",
    icon: 'home',
    primaryEntryId: 'static-home-page',
    subActions: [
      { emoji: '📍', label: 'Membres à proximité', entryId: 'static-nearby' },
      { emoji: '⭐', label: 'Mes favoris', entryId: 'static-favorites' },
      { emoji: '👁️', label: 'Visites de profil', entryId: 'static-visits' },
      { emoji: '💜', label: 'Réactions reçues', entryId: 'static-reactions' },
    ],
  },
  {
    id: 'messages',
    label: 'Messagerie',
    icon: 'message',
    primaryEntryId: 'static-messages-page',
    subActions: [
      { emoji: '⚡', label: 'Médias éphémères', entryId: 'static-ephemeral' },
      { emoji: '👥', label: 'Groupes de discussion', entryId: 'static-groups' },
      { emoji: '📦', label: 'Archiver une conversation', entryId: 'static-archives' },
      { emoji: '🔕', label: 'Mettre en sourdine', entryId: 'static-notifications-mute' },
      { emoji: '🚫', label: 'Bloquer un utilisateur', entryId: 'static-blocked-users' },
    ],
  },
  {
    id: 'swipe',
    label: 'Swipe & Match',
    icon: 'heart',
    primaryEntryId: 'static-swipe',
    subActions: [
      { emoji: '🎉', label: "Qu'est-ce qu'un match ?", entryId: 'static-swipe-match' },
      { emoji: '💳', label: 'Coût des actions', entryId: 'static-credits-system' },
      { emoji: '🚀', label: 'Booster mon profil', entryId: 'static-boost' },
    ],
  },
  {
    id: 'credits',
    label: 'Crédits',
    icon: 'credit',
    primaryEntryId: 'static-credits-system',
    subActions: [
      { emoji: '🎁', label: 'Crédits gratuits', entryId: 'static-free-credits' },
      { emoji: '🤝', label: 'Parrainage (+30 crédits)', entryId: 'static-referral' },
      { emoji: '🏷️', label: 'Tarifs dynamiques', entryId: 'static-dynamic-pricing' },
      { emoji: '🔥', label: 'Promo recharge passive', entryId: 'static-passive-promo' },
      { emoji: '🚫', label: 'Naviguer sans pub', entryId: 'static-ad-free' },
    ],
  },
  {
    id: 'verification',
    label: 'Vérification',
    icon: 'verify',
    primaryEntryId: 'static-verification',
    subActions: [
      { emoji: '📸', label: 'Photo de profil obligatoire', entryId: 'static-profile-photo' },
      { emoji: '🛡️', label: 'Mes données sont-elles protégées ?', entryId: 'static-privacy' },
      { emoji: '🎁', label: 'Bonus crédits à la validation', entryId: 'static-free-credits' },
    ],
  },
  {
    id: 'albums',
    label: 'Albums photos',
    icon: 'image',
    primaryEntryId: 'static-albums',
    subActions: [
      { emoji: '📸', label: 'Photo de profil', entryId: 'static-profile-photo' },
      { emoji: '🖼️', label: 'Mes photos sont-elles privées ?', entryId: 'static-avatar-security' },
      { emoji: '🛡️', label: 'Protection anti-capture', entryId: 'static-screenshot-protection' },
    ],
  },
  {
    id: 'security',
    label: 'Sécurité',
    icon: 'lock',
    primaryEntryId: 'static-privacy',
    subActions: [
      { emoji: '🔑', label: 'Code PIN / Empreinte', entryId: 'static-pin-lock' },
      { emoji: '🔐', label: 'Changer mon mot de passe', entryId: 'static-password-change' },
      { emoji: '🚫', label: 'Utilisateurs bloqués', entryId: 'static-blocked-users' },
      { emoji: '🎯', label: 'Filtre d\'âge des contacts', entryId: 'static-contact-age-filter' },
      { emoji: '🛡️', label: 'Protection anti-capture', entryId: 'static-screenshot-protection' },
      { emoji: '🖼️', label: 'Photos protégées', entryId: 'static-avatar-security' },
      { emoji: '💰', label: 'Crédits sécurisés', entryId: 'static-credit-security' },
      { emoji: '📥', label: 'Export RGPD', entryId: 'static-data-export' },
    ],
  },
  {
    id: 'profile',
    label: 'Mon profil',
    icon: 'profile',
    primaryEntryId: 'static-profile-page',
    subActions: [
      { emoji: '✏️', label: 'Modifier mon profil', entryId: 'static-edit-profile' },
      { emoji: '⚙️', label: 'Paramètres du compte', entryId: 'static-settings' },
      { emoji: '📸', label: 'Photo de profil', entryId: 'static-profile-photo' },
      { emoji: '🖼️', label: 'Albums photos', entryId: 'static-albums' },
      { emoji: '🤖', label: 'ChatBot personnel', entryId: 'static-chatbot-personal' },
      { emoji: '🚀', label: 'Booster mon profil', entryId: 'static-boost' },
      { emoji: '🗑️', label: 'Supprimer mon compte', entryId: 'static-delete-account' },
      { emoji: '📥', label: 'Exporter mes données', entryId: 'static-data-export' },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'bell',
    primaryEntryId: 'static-notifications',
    subActions: [
      { emoji: '🔕', label: 'Mettre en sourdine', entryId: 'static-notifications-mute' },
      { emoji: '⚙️', label: 'Paramètres du compte', entryId: 'static-settings' },
    ],
  },
  {
    id: 'tween',
    label: 'Page Tween',
    icon: 'tween',
    primaryEntryId: 'static-tween',
    subActions: [
      { emoji: '✏️', label: 'Publier un Tween', entryId: 'static-tween-create' },
      { emoji: '📢', label: 'Publicités sur Tween', entryId: 'static-ads' },
    ],
  },
  {
    id: 'groups',
    label: 'Groupes',
    icon: 'group',
    primaryEntryId: 'static-groups',
    subActions: [
      { emoji: '💬', label: 'Page Messages', entryId: 'static-messages-page' },
      { emoji: '⚡', label: 'Médias éphémères', entryId: 'static-ephemeral' },
      { emoji: '🔕', label: 'Mettre en sourdine', entryId: 'static-notifications-mute' },
      { emoji: '💳', label: 'Coût des messages', entryId: 'static-credits-system' },
    ],
  },
  {
    id: 'ephemeral',
    label: 'Médias éphémères',
    icon: 'ephemeral',
    primaryEntryId: 'static-ephemeral',
    subActions: [
      { emoji: '🛡️', label: 'Anti-capture d’écran', entryId: 'static-screenshot-protection' },
      { emoji: '🚨', label: 'Signaler un abus', entryId: 'static-report' },
    ],
  },
  {
    id: 'moderation',
    label: 'Modération',
    icon: 'lock',
    primaryEntryId: 'static-moderation',
    subActions: [
      { emoji: '🚨', label: 'Signaler un profil', entryId: 'static-report' },
      { emoji: '📜', label: 'Règles de la communauté', entryId: 'static-rules' },
      { emoji: '🚫', label: 'Bloquer un utilisateur', entryId: 'static-blocked-users' },
    ],
  },
  {
    id: 'couple',
    label: 'Compte couple',
    icon: 'couple',
    primaryEntryId: 'static-couple-account',
    subActions: [
      { emoji: '⚙️', label: 'Paramètres du compte', entryId: 'static-settings' },
      { emoji: '🤝', label: 'Parrainer un ami', entryId: 'static-referral' },
    ],
  },
  {
    id: 'tech',
    label: 'Aide technique',
    icon: 'bug',
    primaryEntryId: 'static-tech-issue',
    subActions: [
      { emoji: '🔐', label: 'Problème de connexion', entryId: 'static-login-issue' },
      { emoji: '🛠️', label: 'Mode maintenance', entryId: 'static-maintenance' },
      { emoji: '🔑', label: 'Changer mot de passe', entryId: 'static-password-change' },
      { emoji: '👤', label: 'Contacter un agent', entryId: 'static-contact-agent' },
    ],
  },
  {
    id: 'help-center',
    label: "Centre d'aide",
    icon: 'home',
    primaryEntryId: 'static-help-center',
    subActions: [
      { emoji: '✨', label: 'Toutes les fonctionnalités', entryId: 'static-features' },
      { emoji: 'ℹ️', label: "Qu'est-ce que Gay Social ?", entryId: 'static-what-is-gc' },
      { emoji: '👤', label: 'Contacter un agent', entryId: 'static-contact-agent' },
    ],
  },
];

/** Lookup helper */
export const getTopicById = (id: string): ChatbotTopic | undefined =>
  CHATBOT_TOPICS.find(t => t.id === id);

/**
 * Topics shown as the main grid in the welcome screen.
 * Order matters — most-asked first.
 */
export const MAIN_TOPIC_IDS = [
  'home',
  'messages',
  'swipe',
  'credits',
  'verification',
  'albums',
  'security',
  'profile',
];

/** Secondary chips shown under the main grid */
export const QUICK_TOPIC_IDS = [
  'notifications',
  'tween',
  'groups',
  'ephemeral',
  'moderation',
  'couple',
  'tech',
  'help-center',
];
