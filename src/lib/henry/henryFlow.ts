/**
 * Henry — flow décisionnel statique (sans IA générative).
 * Décrit la séquence de questions/boutons et les transitions de l'assistant
 * de mise en relation. Inspiré de l'ancien matchmaking.
 *
 * v2 : ajout de la saisie libre à chaque étape, plus d'options et
 * 3 nouvelles étapes (taille / langues / disponibilités).
 */

export type HenryStep =
  | 'greeting'
  | 'confirm'
  | 'goal'
  | 'age'
  | 'region'
  | 'tribes'
  | 'height'
  | 'languages'
  | 'availability'
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
  /**
   * Active une zone de saisie libre. Le placeholder décrit ce qu'on attend.
   * Si l'utilisateur tape du texte, il est sauvegardé dans `free_notes[step]`
   * et utilisé comme libellé du message côté chat.
   */
  freeText?: {
    placeholder: string;
    /** Libellé du bouton "envoyer" (par défaut : Envoyer) */
    submitLabel?: string;
  };
}

export const HENRY_GREETING =
  "Salut 👋 ! Moi c'est **Henry**, ton assistant de mise en relation. Je vais te poser quelques questions rapides pour te proposer des profils qui correspondent vraiment à ce que tu cherches. Tu peux **cliquer sur les boutons** ou **écrire ta propre réponse** quand tu veux préciser. On commence ?";

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
  { value: 'coloc', label: '🏠 Coloc / cohab' },
  { value: 'mentor', label: '🧭 Mentor / conseil' },
  { value: 'kink', label: '🖤 Kink / fétiche' },
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
  { value: 'tours', label: 'Tours' },
  { value: 'grenoble', label: 'Grenoble' },
  { value: 'dijon', label: 'Dijon' },
  { value: 'angers', label: 'Angers' },
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
  { value: 'skater', label: '🛹 Skater' },
  { value: 'punk', label: '🤘 Punk' },
  { value: 'metal', label: '🎸 Metal' },
  { value: 'classy', label: '👔 Classy' },
  { value: 'no_pref', label: 'Peu importe' },
];

export const HEIGHT_OPTIONS: HenryQuickReply[] = [
  { value: '150-165', label: '< 1m65' },
  { value: '165-175', label: '1m65 – 1m75' },
  { value: '175-185', label: '1m75 – 1m85' },
  { value: '185-200', label: '> 1m85' },
  { value: '__any__', label: 'Peu importe' },
];

export const LANGUAGE_OPTIONS: HenryQuickReply[] = [
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'en', label: '🇬🇧 Anglais' },
  { value: 'es', label: '🇪🇸 Espagnol' },
  { value: 'it', label: '🇮🇹 Italien' },
  { value: 'de', label: '🇩🇪 Allemand' },
  { value: 'pt', label: '🇵🇹 Portugais' },
  { value: 'ar', label: '🇸🇦 Arabe' },
  { value: '__any__', label: 'Peu importe' },
];

export const AVAILABILITY_OPTIONS: HenryQuickReply[] = [
  { value: 'morning', label: '🌅 Matin' },
  { value: 'afternoon', label: '☀️ Après-midi' },
  { value: 'evening', label: '🌙 Soir' },
  { value: 'night', label: '🌃 Nuit' },
  { value: 'weekend', label: '📅 Weekends' },
  { value: 'flexible', label: '🔀 Flexible' },
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
  { value: 'photo', label: '📸 Photo' },
  { value: 'danse', label: '💃 Danse' },
  { value: 'tech', label: '💻 Tech' },
  { value: 'spiritualite', label: '🧘 Spiritualité' },
];

/** Raisons proposées quand l'utilisateur ne veut pas du profil affiché */
export const REJECT_REASONS: HenryQuickReply[] = [
  { value: 'not_my_type', label: '😶 Pas mon type' },
  { value: 'too_far', label: '📍 Trop loin' },
  { value: 'age_off', label: '🎂 Âge ne correspond pas' },
  { value: 'no_photo', label: '📷 Photo peu claire' },
  { value: 'no_bio', label: '📝 Profil vide' },
  { value: 'wrong_tribe', label: '✨ Pas le bon style' },
  { value: 'wrong_goal', label: '🎯 Pas le même but' },
  { value: 'no_chemistry', label: '💔 Pas d\'alchimie' },
  { value: 'other', label: '🤷 Autre raison' },
];

export const HENRY_FLOW: Record<HenryStep, HenryStepDef> = {
  greeting: {
    id: 'greeting',
    question: HENRY_GREETING,
    next: 'goal',
    options: [{ value: '__start__', label: '🚀 C\'est parti' }],
  },
  confirm: {
    id: 'confirm',
    question:
      "J'ai jeté un œil à ton profil 👀 Voici ce que je vais utiliser pour ta recherche :",
    next: 'matching',
    options: [
      { value: '__confirm__', label: '🎯 Trouver mon match' },
      { value: '__edit__', label: '✏️ Modifier mes critères' },
    ],
  },
  goal: {
    id: 'goal',
    question: '👀 Que cherches-tu en priorité en ce moment ?',
    next: 'age',
    options: GOAL_OPTIONS,
    freeText: {
      placeholder: 'Précise ce que tu cherches (ex: un plan tantra, un partenaire de rando…)',
      submitLabel: 'Envoyer ma précision',
    },
  },
  age: {
    id: 'age',
    question: '🎂 Quelle tranche d\'âge t\'intéresse ?',
    next: 'region',
    options: AGE_OPTIONS,
    freeText: {
      placeholder: 'Indique une tranche personnalisée (ex: 28-34 ans)',
    },
  },
  region: {
    id: 'region',
    question: '📍 Tu préfères quelqu\'un proche de chez toi ? Choisis une ville ou laisse libre.',
    next: 'tribes',
    options: REGION_OPTIONS,
    freeText: {
      placeholder: 'Tape ta ville ou ton département (ex: Brest, 29, Île-de-France)',
    },
  },
  tribes: {
    id: 'tribes',
    question: '✨ Et niveau style, qu\'est-ce qui te plaît ? *(tu peux en choisir plusieurs)*',
    multi: true,
    next: 'height',
    options: TRIBE_OPTIONS,
    freeText: {
      placeholder: 'Décris le style qui te plaît avec tes mots',
    },
  },
  height: {
    id: 'height',
    question: '📏 Une préférence de taille ?',
    next: 'languages',
    options: HEIGHT_OPTIONS,
    freeText: {
      placeholder: 'Précise (ex: minimum 1m80, ou peu importe)',
    },
  },
  languages: {
    id: 'languages',
    question: '🗣️ Quelles langues parles-tu (ou veux-tu que ton match parle) ? *(plusieurs choix possibles)*',
    multi: true,
    next: 'availability',
    options: LANGUAGE_OPTIONS,
    freeText: {
      placeholder: 'Autres langues (ex: russe, japonais…)',
    },
  },
  availability: {
    id: 'availability',
    question: '🕒 Quand es-tu généralement dispo ? *(plusieurs choix possibles)*',
    multi: true,
    next: 'interests',
    options: AVAILABILITY_OPTIONS,
    freeText: {
      placeholder: 'Précise tes créneaux (ex: lundi-mercredi soirs uniquement)',
    },
  },
  interests: {
    id: 'interests',
    question:
      '🎯 Dernière étape : quels sont tes centres d\'intérêt ? Je m\'en sers pour trouver des points communs. *(plusieurs choix possibles)*',
    multi: true,
    next: 'matching',
    options: INTEREST_OPTIONS,
    freeText: {
      placeholder: 'Ajoute tes propres passions (ex: bricolage, escalade, jeux de société…)',
    },
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
    freeText: {
      placeholder: 'Demande quelque chose à Henry (ex: change de ville, montre que des bears…)',
    },
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
