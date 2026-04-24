/**
 * Henry — flow décisionnel statique (sans IA générative).
 * Décrit la séquence de questions/boutons et les transitions de l'assistant
 * de mise en relation. Inspiré de l'ancien matchmaking.
 */

export type HenryStep =
  | 'greeting'
  | 'goal'
  | 'age'
  | 'region'
  | 'tribes'
  | 'interests'
  | 'matching'
  | 'free';

export interface HenryQuickReply {
  /** Valeur stockée en base (looking_for / region / tribe / mot-clé) */
  value: string;
  /** Libellé affiché sur le bouton */
  label: string;
}

export interface HenryStepDef {
  id: HenryStep;
  /** Question posée par Henry */
  question: string;
  /** Sélection multiple ? (par défaut : non) */
  multi?: boolean;
  /** Étape suivante */
  next: HenryStep;
  /** Choix proposés (si applicable) */
  options?: HenryQuickReply[];
}

export const HENRY_GREETING =
  "Salut 👋 ! Moi c'est **Henry**, ton assistant de mise en relation. Je vais te poser quelques questions rapides pour te proposer des profils qui correspondent vraiment à ce que tu cherches. On commence ?";

export const GOAL_OPTIONS: HenryQuickReply[] = [
  { value: 'plan_cul', label: '🔥 Un plan' },
  { value: 'plan_regulier', label: '🔄 Un plan régulier' },
  { value: 'relation', label: '❤️ Une relation' },
  { value: 'amitie', label: '🤝 De l\'amitié' },
  { value: 'discussion', label: '💬 Discuter' },
  { value: 'webcam', label: '📹 Webcam' },
  { value: 'sortie', label: '🍻 Sortir / verre' },
  { value: 'voyage_buddy', label: '✈️ Voyage' },
  { value: 'sport_buddy', label: '🏋️ Partenaire sport' },
  { value: 'curieux', label: '🤔 Je découvre' },
];

export const AGE_OPTIONS: HenryQuickReply[] = [
  { value: '18-25', label: '18-25 ans' },
  { value: '25-35', label: '25-35 ans' },
  { value: '35-45', label: '35-45 ans' },
  { value: '45-60', label: '45-60 ans' },
  { value: '60-99', label: '60+ ans' },
  { value: '18-99', label: 'Peu importe' },
];

export const REGION_OPTIONS: HenryQuickReply[] = [
  { value: 'paris', label: 'Paris' },
  { value: 'lyon', label: 'Lyon' },
  { value: 'marseille', label: 'Marseille' },
  { value: 'toulouse', label: 'Toulouse' },
  { value: 'bordeaux', label: 'Bordeaux' },
  { value: 'lille', label: 'Lille' },
  { value: 'nice', label: 'Nice' },
  { value: 'nantes', label: 'Nantes' },
  { value: 'strasbourg', label: 'Strasbourg' },
  { value: 'rennes', label: 'Rennes' },
  { value: 'montpellier', label: 'Montpellier' },
  { value: 'reims', label: 'Reims' },
  { value: '__any__', label: '🌍 Partout en France' },
];

export const TRIBE_OPTIONS: HenryQuickReply[] = [
  { value: 'twink', label: '🌱 Twink' },
  { value: 'jock', label: '💪 Sportif' },
  { value: 'bear', label: '🐻 Bear' },
  { value: 'otter', label: '🦦 Otter' },
  { value: 'wolf', label: '🐺 Wolf' },
  { value: 'daddy', label: '🎩 Daddy' },
  { value: 'twink_otter', label: '✨ Twottter' },
  { value: 'leather', label: '🖤 Cuir' },
  { value: 'geek', label: '🎮 Geek' },
  { value: 'muscle', label: '🦾 Muscle' },
  { value: 'chubby', label: '🧸 Chubby' },
  { value: 'no_pref', label: 'Peu importe' },
];

export const INTEREST_OPTIONS: HenryQuickReply[] = [
  { value: 'cinema', label: '🎬 Cinéma' },
  { value: 'sport', label: '⚽ Sport' },
  { value: 'voyage', label: '✈️ Voyage' },
  { value: 'cuisine', label: '🍳 Cuisine' },
  { value: 'musique', label: '🎶 Musique' },
  { value: 'soiree', label: '🍸 Soirées' },
  { value: 'art', label: '🎨 Art' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'lecture', label: '📚 Lecture' },
  { value: 'nature', label: '🌿 Nature' },
  { value: 'mode', label: '👗 Mode' },
  { value: 'animaux', label: '🐾 Animaux' },
];

/** Raisons proposées quand l'utilisateur ne veut pas du profil affiché */
export const REJECT_REASONS: HenryQuickReply[] = [
  { value: 'not_my_type', label: '😶 Pas mon type' },
  { value: 'too_far', label: '📍 Trop loin' },
  { value: 'age_off', label: '🎂 Âge ne correspond pas' },
  { value: 'no_photo', label: '📷 Photo peu claire' },
  { value: 'no_bio', label: '📝 Profil vide' },
  { value: 'other', label: '🤷 Autre raison' },
];

export const HENRY_FLOW: Record<HenryStep, HenryStepDef> = {
  greeting: {
    id: 'greeting',
    question: HENRY_GREETING,
    next: 'goal',
    options: [{ value: '__start__', label: '🚀 C\'est parti' }],
  },
  goal: {
    id: 'goal',
    question: '👀 Que cherches-tu en priorité en ce moment ?',
    next: 'age',
    options: GOAL_OPTIONS,
  },
  age: {
    id: 'age',
    question: '🎂 Quelle tranche d\'âge t\'intéresse ?',
    next: 'region',
    options: AGE_OPTIONS,
  },
  region: {
    id: 'region',
    question: '📍 Tu préfères quelqu\'un proche de chez toi ? Choisis une ville ou laisse libre.',
    next: 'tribes',
    options: REGION_OPTIONS,
  },
  tribes: {
    id: 'tribes',
    question: '✨ Et niveau style, qu\'est-ce qui te plaît ? *(tu peux en choisir plusieurs)*',
    multi: true,
    next: 'interests',
    options: TRIBE_OPTIONS,
  },
  interests: {
    id: 'interests',
    question:
      '🎯 Dernière étape : quels sont tes centres d\'intérêt ? Je m\'en sers pour trouver des points communs. *(plusieurs choix possibles)*',
    multi: true,
    next: 'matching',
    options: INTEREST_OPTIONS,
  },
  matching: {
    id: 'matching',
    question: '✅ Parfait, je cherche les meilleurs profils pour toi…',
    next: 'free',
  },
  free: {
    id: 'free',
    question:
      'Tu veux que je te propose **d\'autres profils** ou **affiner ta recherche** ?',
    next: 'free',
    options: [
      { value: '__more__', label: '🔄 Autres profils' },
      { value: '__refine__', label: '⚙️ Affiner' },
      { value: '__reset__', label: '🆕 Recommencer' },
    ],
  },
};

/**
 * Suggestions de messages d'introduction personnalisés.
 * `interests` correspond aux centres d'intérêt sélectionnés par l'utilisateur,
 * `shared` aux tribus communes avec le profil cible.
 */
export const buildIntroSuggestions = (
  username: string,
  shared: string[],
  interests: string[],
): string[] => {
  const suggestions: string[] = [];
  const name = username || 'toi';

  if (shared.length > 0) {
    suggestions.push(
      `Hey ${name} ! On a l'air d'avoir le même style 😉 Tu fais quoi de beau en ce moment ?`,
    );
  }
  if (interests.includes('cinema')) {
    suggestions.push(
      `Salut ${name}, j'ai vu qu'on aime tous les deux le cinéma 🎬 Quel est ton dernier coup de cœur ?`,
    );
  }
  if (interests.includes('voyage')) {
    suggestions.push(
      `Coucou ${name} ✈️ T'es plutôt soleil ou montagne pour ton prochain voyage ?`,
    );
  }
  if (interests.includes('sport')) {
    suggestions.push(
      `Hey ${name} 💪 On dirait qu'on partage la passion du sport. Tu pratiques quoi ?`,
    );
  }
  // Defaults
  suggestions.push(
    `Salut ${name} 👋 Ton profil m'a tapé dans l'œil, tu cherches quoi de ton côté ?`,
  );
  suggestions.push(
    `Hello ${name} 😊 Henry m'a dit qu'on pourrait bien s'entendre, dis-m'en plus !`,
  );

  // Dedup + max 4
  return [...new Set(suggestions)].slice(0, 4);
};
