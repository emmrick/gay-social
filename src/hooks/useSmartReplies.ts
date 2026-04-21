import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SmartRepliesArgs {
  messages: any[];
  otherUserId: string;
  enabled?: boolean;
}

/**
 * Génère 3 chips de réponses rapides basées localement sur le contenu du
 * dernier message reçu. Aucune IA, aucun appel réseau — 100% client-side.
 *
 * Règles :
 *  - Si le dernier message contient un point d'interrogation → réponses « oui / non / dis-m'en plus »
 *  - Si message court de salut (cc, salut, hello, coucou…) → salutations
 *  - Si remerciement (merci, thx, top…) → réponses chaleureuses
 *  - Si proposition (on se voit, dispo, ce soir…) → accepte / horaire / refuse poliment
 *  - Si message coquin / appréciation (photo, beau, mignon, sexy…) → compliment retour
 *  - Sinon → set neutre par défaut
 */
export const useSmartReplies = ({ messages, otherUserId: _otherUserId, enabled = true }: SmartRepliesArgs) => {
  const { user } = useAuth();
  const [dismissedForMessageId, setDismissedForMessageId] = useState<string | null>(null);

  const lastFromOther = useMemo(() => {
    if (!user || messages.length === 0) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.sender_id === user.id) return null; // dernier message est de moi → rien à suggérer
      const isText = !m.message_type || m.message_type === 'text';
      if (isText && m.content?.trim()) return m;
    }
    return null;
  }, [messages, user]);

  const suggestions = useMemo<string[]>(() => {
    if (!enabled || !lastFromOther) return [];
    if (dismissedForMessageId === lastFromOther.id) return [];
    return buildSuggestionsFromText(String(lastFromOther.content || ''));
  }, [enabled, lastFromOther, dismissedForMessageId]);

  // Reset le flag de dismiss si un nouveau message arrive
  useEffect(() => {
    if (lastFromOther && dismissedForMessageId && lastFromOther.id !== dismissedForMessageId) {
      setDismissedForMessageId(null);
    }
  }, [lastFromOther, dismissedForMessageId]);

  const dismiss = () => {
    if (lastFromOther) setDismissedForMessageId(lastFromOther.id);
  };

  return { suggestions, isLoading: false, dismiss };
};

/* --------------------- Logique de suggestion locale --------------------- */

function buildSuggestionsFromText(raw: string): string[] {
  const text = raw.trim().toLowerCase();
  if (!text) return [];

  const has = (...words: string[]) => words.some((w) => text.includes(w));
  const isQuestion = text.includes('?') || /^(qui|que|quoi|quel|quelle|comment|pourquoi|où|ou est|combien|quand|est-ce)/i.test(text);

  // Salutations courtes
  if (
    text.length <= 12 &&
    has('cc', 'salut', 'hello', 'coucou', 'hey', 'yo', 'bonjour', 'bonsoir', 'hi')
  ) {
    return ['Salut 👋', 'Hello, ça va ?', 'Coucou toi'];
  }

  // Comment ça va
  if (has('ça va', 'ca va', 'comment vas', 'comment tu vas', 'comment va')) {
    return ['Ça va et toi ?', 'Super, merci 😊', 'Ça pourrait aller mieux'];
  }

  // Remerciements
  if (has('merci', 'thx', 'thanks', 'top', 'génial', 'parfait')) {
    return ['Avec plaisir 😊', 'De rien !', 'Quand tu veux'];
  }

  // Compliments / attirance
  if (has('beau', 'mignon', 'sexy', 'canon', 'jolie', 'magnifique', 'bg', 'bogoss', 'charmant')) {
    return ['Merci 😊', 'Toi aussi 😏', 'Tu me flattes'];
  }

  // Propositions / rdv
  if (has('on se voit', 'dispo', 'ce soir', 'demain', 'rdv', 'rencontre', 'boire un verre', 'café', 'sortir', 'tu fais quoi')) {
    return ['Avec plaisir 😊', 'Quand ça t\'arrange ?', 'Désolé, pas dispo']; 
  }

  // Photos / médias
  if (has('photo', 'pic', 'image', 'selfie', 'snap')) {
    return ['Je t\'envoie ça', 'Plus tard 😉', 'Et toi ?'];
  }

  // Localisation
  if (has('où', 'tu habites', 'tu es de', 'ville', 'région', 'quartier')) {
    return ['Et toi ?', 'Pas très loin', 'Je préfère en privé'];
  }

  // Question générique
  if (isQuestion) {
    return ['Oui 😊', 'Non, désolé', 'Dis-m\'en plus'];
  }

  // Message d\'accord / validation
  if (has('ok', 'd\'accord', 'daccord', 'ça marche', 'ca marche', 'cool')) {
    return ['Top 👍', 'À toi 😊', 'On fait comme ça'];
  }

  // Default — set neutre
  return ['Ah ouais ?', 'Intéressant 😊', 'Raconte'];
}
