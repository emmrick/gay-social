/**
 * Help Chatbot Knowledge Engine
 * Rule-based, keyword-matching chatbot — NO AI.
 * Matches user queries against FAQ articles + static site knowledge.
 */

// ─── Synonyms / keyword expansion ────────────────────────────────────
const SYNONYM_MAP: Record<string, string[]> = {
  // Account
  compte: ['profil', 'inscription', 'connexion', 'login', 'parametres', 'parametre', 'inscrire', 'connecter', 'deconnecter', 'mot de passe', 'mdp', 'email', 'supprimer'],
  profil: ['compte', 'photo', 'avatar', 'bio', 'pseudo', 'nom', 'infos', 'modifier'],
  supprimer: ['effacer', 'retirer', 'enlever', 'desactiver', 'fermer', 'annuler'],
  inscription: ['inscrire', 'creer', 'nouveau', 'rejoindre', 'commencer'],
  connexion: ['connecter', 'login', 'entrer', 'ouvrir'],
  deconnexion: ['deconnecter', 'logout', 'sortir', 'quitter'],
  'mot de passe': ['mdp', 'password', 'oublie', 'reinitialiser', 'changer'],

  // Credits
  credit: ['credits', 'piece', 'pieces', 'monnaie', 'solde', 'acheter', 'payer', 'gratuit', 'recharge', 'quotidien', 'passif', 'bonus'],
  acheter: ['achat', 'payer', 'paypal', 'prix', 'tarif', 'cout'],
  gratuit: ['gratis', 'offert', 'cadeau', 'free', 'sans payer'],
  parrainage: ['parrain', 'filleul', 'code', 'referral', 'inviter', 'invitation', 'parrainer'],

  // Verification
  verification: ['verifier', 'verif', 'verifie', 'identite', 'carte', 'document', 'piece d\'identite', 'selfie', 'photo', 'approuve', 'badge'],
  identite: ['identite', 'cni', 'passeport', 'carte identite', 'piece identite'],

  // Messaging
  message: ['messages', 'msg', 'conversation', 'discuter', 'parler', 'ecrire', 'envoyer', 'mp', 'prive', 'dm'],
  chat: ['discussion', 'salon', 'tchat', 'groupe', 'departement', 'region'],
  ephemere: ['ephemeres', 'disparait', 'temporaire', 'snap', 'photo temporaire'],
  blocage: ['bloquer', 'bloque', 'debloquer', 'ignorer', 'signaler'],
  signalement: ['signaler', 'report', 'abusif', 'harcelement', 'insulte', 'spam'],

  // Features
  swipe: ['match', 'like', 'liker', 'matcher', 'rencontre', 'compatible'],
  favori: ['favoris', 'aimer', 'sauvegarder', 'enregistrer'],
  story: ['stories', 'histoire', 'publication', 'publier'],
  album: ['albums', 'galerie', 'photos', 'images', 'partager album'],
  notification: ['notifications', 'notif', 'alerte', 'push', 'son'],

  // Security
  securite: ['protection', 'confidentialite', 'prive', 'donnees', 'rgpd', 'capture', 'screenshot'],
  capture: ['screenshot', 'capture ecran', 'screener'],

  // Premium
  premium: ['abonnement', 'vip', 'abo', 'avantage', 'offre'],

  // Technical
  bug: ['probleme', 'erreur', 'marche pas', 'fonctionne pas', 'plante', 'crash', 'lent', 'charge'],
  application: ['app', 'appli', 'mobile', 'telephone', 'pwa', 'installer'],
};

// ─── Static site knowledge (always available, no DB needed) ───────────
export interface StaticKnowledge {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
}

export const STATIC_KNOWLEDGE: StaticKnowledge[] = [
  {
    id: 'static-what-is-gc',
    category: 'Général',
    question: "Qu'est-ce que Gay Social ?",
    answer: "**Gay Social** est un site de rencontre gay **100% français**, organisé par **101 départements**. L'inscription est **gratuite**, les profils sont **vérifiés par pièce d'identité**, et il n'y a **aucune publicité**. Le site est réservé aux **+18 ans**.",
    keywords: ['gaysocial', 'gay social', 'site', 'quoi', 'cest quoi', 'presentation', 'a propos'],
  },
  {
    id: 'static-features',
    category: 'Fonctionnalités',
    question: 'Quelles sont les fonctionnalités disponibles ?',
    answer: "Gay Social propose :\n\n• **Chat de groupe** par département (101 salons)\n• **Messages privés** entre membres\n• **Swipe / Match** pour trouver des profils compatibles\n• **Albums photos** privés avec partage sélectif\n• **Stories** éphémères\n• **Médias éphémères** (photos/vidéos qui disparaissent après consultation)\n• **Groupes thématiques** personnalisés\n• **Protection anti-capture d'écran**\n• **ChatBot personnel** configurable sur votre profil\n• **Vérification d'identité** pour plus de sécurité",
    keywords: ['fonctionnalites', 'features', 'options', 'quoi faire', 'possible', 'disponible'],
  },
  {
    id: 'static-credits-system',
    category: 'Crédits & Paiements',
    question: 'Comment fonctionne le système de crédits ?',
    answer: "Le système de crédits Gay Social comprend **4 types** :\n\n1. **Crédits quotidiens** : 5 crédits rechargés automatiquement chaque jour (max 7 jours/mois)\n2. **Crédits passifs** : +0.1 crédit toutes les 6h, jusqu'à 10 max\n3. **Crédits bonus** : obtenus via parrainage, vérification d'identité, codes promo\n4. **Crédits achetés** : via PayPal ou virement\n\nLes crédits sont utilisés pour : envoyer des messages privés, booster votre profil, utiliser le swipe, activer votre ChatBot, etc.\n\n💡 **Astuce** : Vous pouvez **verrouiller** certains types de crédits pour les protéger !",
    keywords: ['credit', 'credits', 'systeme', 'fonctionnement', 'types', 'quotidien', 'passif', 'bonus', 'achete'],
  },
  {
    id: 'static-free-credits',
    category: 'Crédits & Paiements',
    question: 'Comment obtenir des crédits gratuits ?',
    answer: "Plusieurs façons d'obtenir des crédits **gratuitement** :\n\n• **Crédits quotidiens** : 5 crédits par jour (automatique)\n• **Crédits passifs** : accumulation automatique (+0.1 / 6h)\n• **Vérification d'identité** : bonus de crédits à la validation\n• **Parrainage** : crédits offerts pour vous et votre filleul\n• **Codes promo** : disponibles lors d'événements spéciaux\n\n💰 Vous n'avez **jamais besoin de payer** pour utiliser les fonctions de base !",
    keywords: ['gratuit', 'free', 'obtenir', 'gagner', 'comment avoir', 'sans payer'],
  },
  {
    id: 'static-ephemeral',
    category: 'Messagerie',
    question: 'Comment fonctionnent les médias éphémères ?',
    answer: "Les **médias éphémères** sont des photos ou vidéos qui **disparaissent après consultation** :\n\n• Envoyez une photo/vidéo en mode éphémère dans un message privé\n• Le destinataire peut la visualiser **une seule fois**\n• Le média est **automatiquement supprimé** après visionnage\n• La **protection anti-capture d'écran** est activée pendant la visualisation\n• Si une capture est détectée, l'expéditeur est **alerté immédiatement**\n\n🔒 Vos contenus restent **privés et protégés**.",
    keywords: ['ephemere', 'ephemeres', 'disparait', 'temporaire', 'snap', 'photo temporaire', 'supprime apres'],
  },
  {
    id: 'static-verification',
    category: 'Vérification',
    question: "Comment vérifier mon identité ?",
    answer: "La vérification d'identité se fait en **3 étapes** :\n\n1. **Photo du recto** de votre pièce d'identité (CNI, passeport, permis)\n2. **Photo du verso** (si applicable)\n3. **Selfie** pour confirmer votre identité\n\n📋 **Processus** :\n• Soumettez vos documents depuis votre profil\n• Un modérateur vérifie sous **quelques heures**\n• Vous recevez une **notification** du résultat\n• En cas d'approbation : badge vérifié ✅ + crédits bonus 🎁\n\n🔐 Vos documents sont **supprimés** après vérification pour votre sécurité.",
    keywords: ['verification', 'verifier', 'identite', 'cni', 'passeport', 'selfie', 'badge', 'document'],
  },
  {
    id: 'static-screenshot-protection',
    category: 'Sécurité',
    question: "Comment fonctionne la protection anti-capture ?",
    answer: "Gay Social intègre une **protection anti-capture d'écran** :\n\n• Les médias éphémères sont **protégés** contre les captures\n• Si une capture est détectée, l'expéditeur est **alerté**\n• Les récidivistes peuvent recevoir des **sanctions** (avertissement, suspension)\n• Un filigrane invisible est ajouté sur certains contenus\n\n⚠️ **Attention** : les captures d'écran de contenu protégé sont interdites et peuvent entraîner la **suspension** de votre compte.",
    keywords: ['capture', 'screenshot', 'protection', 'anti', 'ecran', 'filigrane', 'watermark', 'detecte'],
  },
  {
    id: 'static-groups',
    category: 'Messagerie',
    question: 'Comment fonctionnent les groupes de discussion ?',
    answer: "Gay Social propose **deux types de groupes** :\n\n**1. Salons départementaux (101)**\n• Un salon par département français\n• Rejoignez les salons de votre région\n• Discutez avec les membres proches de vous\n\n**2. Groupes thématiques**\n• Créez ou rejoignez des groupes sur des thèmes spécifiques\n• Chaque groupe a un administrateur\n• Partagez des événements dans vos groupes\n\n💡 Vous pouvez **couper les notifications** d'un groupe sans le quitter.",
    keywords: ['groupe', 'groupes', 'salon', 'departement', 'region', 'thematique', 'rejoindre', 'creer groupe'],
  },
  {
    id: 'static-swipe',
    category: 'Fonctionnalités',
    question: 'Comment fonctionne le système de Swipe / Match ?',
    answer: "Le **swipe** fonctionne comme une application de rencontre classique :\n\n• **Swipez à droite** (❤️) pour liker un profil\n• **Swipez à gauche** (✖️) pour passer\n• Si la personne vous like aussi → **Match** 🎉\n• Vous pouvez alors démarrer une **conversation privée**\n\n💡 Le swipe nécessite des **crédits** pour chaque action.\n💡 Avec l'offre **Premium**, vous obtenez des swipes illimités !",
    keywords: ['swipe', 'match', 'like', 'liker', 'rencontre', 'compatible', 'droite', 'gauche'],
  },
  {
    id: 'static-albums',
    category: 'Fonctionnalités',
    question: 'Comment fonctionnent les albums photos ?',
    answer: "Les **albums privés** vous permettent de :\n\n• **Créer** plusieurs albums thématiques\n• **Télécharger** des photos et vidéos\n• **Partager** sélectivement avec certains membres\n• **Révoquer** l'accès à tout moment\n• Définir une **date d'expiration** pour le partage\n\n🔒 Seules les personnes à qui vous partagez peuvent voir vos albums.\n📬 Le destinataire reçoit une **notification** quand vous partagez.",
    keywords: ['album', 'albums', 'photo', 'photos', 'galerie', 'partager', 'prive'],
  },
  {
    id: 'static-privacy',
    category: 'Sécurité',
    question: 'Comment protéger ma vie privée ?',
    answer: "Gay Social offre de nombreuses options de **confidentialité** :\n\n• **Verrouillage PIN** : protégez l'accès à l'app avec un code\n• **Blocage** : bloquez tout utilisateur indésirable\n• **Signalement** : signalez les comportements abusifs\n• **Médias éphémères** : envoyez du contenu auto-destructible\n• **Protection anti-capture** : détection des screenshots\n• **Suppression de compte** : avec effacement complet des données\n\n⚠️ **Important** : Ne partagez jamais vos informations personnelles (téléphone, réseaux sociaux) avec d'autres membres.",
    keywords: ['confidentialite', 'prive', 'donnees', 'rgpd', 'vie privee', 'protection', 'pin', 'verrouillage'],
  },
  {
    id: 'static-premium',
    category: 'Fonctionnalités',
    question: "Quels sont les avantages Premium ?",
    answer: "L'abonnement **Premium** offre :\n\n• **Swipes illimités**\n• **Aucune publicité** (déjà sans pub, mais badge exclusif)\n• **Badge Premium** visible sur votre profil\n• **Boost de profil** offert\n• **Accès prioritaire** aux nouvelles fonctionnalités\n\n👑 Contactez un agent pour activer votre Premium !",
    keywords: ['premium', 'vip', 'abonnement', 'avantage', 'offre', 'souscrire'],
  },
  {
    id: 'static-rules',
    category: 'Sécurité',
    question: 'Quelles sont les règles de la communauté ?',
    answer: "Les **règles principales** de Gay Social :\n\n✅ **Respectez** tous les membres\n✅ **Vérifiez** votre identité\n✅ Utilisez un **langage correct**\n\n❌ Pas de **spam** ni publicité\n❌ Pas de contenu **illégal**\n❌ Pas de **faux profils**\n❌ Pas de **harcèlement**\n❌ Pas de partage d'**informations personnelles** d'autrui\n\n⚠️ Le non-respect des règles entraîne un **avertissement**, une **suspension temporaire** ou un **bannissement définitif**.\n\n📖 Consultez les règles complètes dans la section **Règles** de l'application.",
    keywords: ['regles', 'reglement', 'interdit', 'autorise', 'sanction', 'ban', 'suspension', 'avertissement'],
  },
  {
    id: 'static-delete-account',
    category: 'Compte & Profil',
    question: 'Comment supprimer mon compte ?',
    answer: "Pour **supprimer votre compte** :\n\n1. Allez dans **Paramètres** de votre profil\n2. Cliquez sur **Supprimer mon compte**\n3. Confirmez votre choix\n4. Un délai de **7 jours** est appliqué avant suppression définitive\n\n⚠️ **Important** :\n• Toutes vos données seront **définitivement supprimées**\n• Vos messages, photos et albums seront effacés\n• Si vous vous reconnectez pendant le délai de 7 jours, la suppression est **automatiquement annulée**",
    keywords: ['supprimer', 'effacer', 'compte', 'desinscrire', 'fermer', 'annuler compte', 'quitter'],
  },
  {
    id: 'static-chatbot-personal',
    category: 'Fonctionnalités',
    question: 'Comment configurer mon ChatBot personnel ?',
    answer: "Le **ChatBot personnel** permet aux visiteurs de votre profil de discuter avec un bot que vous configurez :\n\n1. Allez dans les **Paramètres** de votre profil\n2. Section **ChatBot**\n3. **Activez** le ChatBot (coûte des crédits)\n4. Personnalisez le **message d'accueil**\n5. Ajoutez des **informations** que le bot peut partager\n\n💬 Les visiteurs peuvent interagir gratuitement avec votre bot !",
    keywords: ['chatbot', 'bot', 'automatique', 'configurer', 'personnel', 'robot'],
  },
  {
    id: 'static-nearby',
    category: 'Fonctionnalités',
    question: 'Comment voir les membres proches de moi ?',
    answer: "La fonctionnalité **À proximité** vous montre les membres géographiquement proches :\n\n• Activez la **géolocalisation** dans votre navigateur\n• Consultez la section **À proximité** depuis l'accueil\n• Le déblocage nécessite des **crédits**\n• Les distances sont calculées en **kilomètres**\n\n📍 Votre position exacte n'est **jamais partagée** avec les autres membres.",
    keywords: ['proximite', 'proche', 'pres', 'geolocalisation', 'localisation', 'distance', 'km', 'autour'],
  },
];

// ─── Normalisation ───────────────────────────────────────────────────
export const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// ─── Expand query with synonyms ──────────────────────────────────────
const expandWithSynonyms = (words: string[]): string[] => {
  const expanded = new Set(words);
  for (const word of words) {
    // Check if the word is a synonym key
    if (SYNONYM_MAP[word]) {
      SYNONYM_MAP[word].forEach(s => expanded.add(s));
    }
    // Check if word appears as a value in any synonym group
    for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
      if (synonyms.includes(word)) {
        expanded.add(key);
        synonyms.forEach(s => expanded.add(s));
      }
    }
  }
  return Array.from(expanded);
};

// ─── Scoring ─────────────────────────────────────────────────────────
export interface ScoredResult {
  id: string;
  category: string;
  question: string;
  answer: string;
  score: number;
  isStatic: boolean;
}

interface FAQArticle {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export const searchKnowledgeBase = (
  query: string,
  faqArticles: FAQArticle[]
): ScoredResult[] => {
  const normalizedQuery = normalize(query);
  const baseWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
  if (baseWords.length === 0) return [];

  const expandedWords = expandWithSynonyms(baseWords);

  const scoreEntry = (
    entry: { id: string; category: string; question: string; answer: string; keywords?: string[] },
    isStatic: boolean
  ): ScoredResult | null => {
    const nq = normalize(entry.question);
    const na = normalize(entry.answer);
    const nc = normalize(entry.category);
    const nk = entry.keywords ? entry.keywords.map(normalize).join(' ') : '';

    let score = 0;

    // Exact phrase match in question — strongest signal
    if (nq.includes(normalizedQuery)) score += 15;

    for (const word of expandedWords) {
      // Title match (high weight)
      if (nq.includes(word)) score += 4;
      // Category match
      if (nc.includes(word)) score += 2;
      // Answer match
      if (na.includes(word)) score += 1;
      // Keyword match (static entries)
      if (nk.includes(word)) score += 5;
    }

    // Bonus for matching multiple base words (not expanded)
    const baseMatches = baseWords.filter(w => nq.includes(w) || nk.includes(w)).length;
    if (baseMatches >= 2) score += baseMatches * 3;

    if (score === 0) return null;
    return {
      id: entry.id,
      category: entry.category,
      question: entry.question,
      answer: entry.answer,
      score,
      isStatic,
    };
  };

  const results: ScoredResult[] = [];

  // Score static knowledge
  for (const entry of STATIC_KNOWLEDGE) {
    const r = scoreEntry(entry, true);
    if (r) results.push(r);
  }

  // Score FAQ articles
  for (const article of faqArticles) {
    const r = scoreEntry(article, false);
    if (r) results.push(r);
  }

  // Deduplicate: if a static entry and FAQ entry are very similar, keep higher score
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};

// ─── Post-answer options builder ─────────────────────────────────────
export const buildPostAnswerOptions = (
  articleId: string,
  category: string,
  allArticles: FAQArticle[],
  staticKnowledge: StaticKnowledge[]
) => {
  // Find related items (same category, different id)
  const relatedFaq = allArticles
    .filter(a => a.category === category && a.id !== articleId)
    .slice(0, 2);
  const relatedStatic = staticKnowledge
    .filter(s => s.category === category && s.id !== articleId)
    .slice(0, 2 - relatedFaq.length);

  const options: { label: string; value: string }[] = [];

  // Related suggestions
  for (const r of [...relatedFaq, ...relatedStatic]) {
    options.push({ label: `📄 ${r.question}`, value: `faq:${r.id}` });
  }

  // Standard navigation options
  options.push({ label: '🔍 Problème non résolu', value: 'not_resolved' });
  options.push({ label: '📋 Choisir un autre sujet', value: 'change_category' });
  options.push({ label: '👤 Contacter un agent', value: 'contact_agent' });

  return options;
};

// ─── Disambiguation message builder ──────────────────────────────────
export const buildDisambiguationMessage = (results: ScoredResult[]) => {
  if (results.length <= 1) return null;

  // If top result is way ahead, no need to disambiguate
  if (results[0].score > results[1].score * 2) return null;

  return {
    text: `Votre demande pourrait concerner **${results.length} sujets**. Lequel correspond le mieux ? 👇`,
    options: results.slice(0, 4).map(r => ({
      label: r.question,
      value: `faq:${r.id}`,
    })),
  };
};
