/**
 * Helper centralisé : affiche un toast riche quand l'utilisateur n'a plus
 * de crédits disponibles, avec :
 *  - un lien pour acheter des crédits
 *  - un lien pour consulter la prochaine réinitialisation mensuelle (5 jours offerts / mois)
 *
 * Conçu pour être appelé depuis n'importe quel hook / mutation
 * sans avoir à dupliquer la logique de communication utilisateur.
 */
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Anti-spam : 1 toast global toutes les 8 s, ET 1 toast par "contexte" (action)
// toutes les 15 s, même si plusieurs requêtes échouent en parallèle.
const GLOBAL_COOLDOWN_MS = 8000;
const PER_CONTEXT_COOLDOWN_MS = 15000;
let lastShownAt = 0;
const lastShownByContext = new Map<string, number>();

/** Formate un nombre de jours/heures restantes en FR. */
const formatRemaining = (msUntilReset: number): string => {
  if (msUntilReset <= 0) return 'bientôt';
  const totalHours = Math.ceil(msUntilReset / 3_600_000);
  if (totalHours >= 48) {
    const days = Math.ceil(totalHours / 24);
    return `dans ${days} jour${days > 1 ? 's' : ''}`;
  }
  if (totalHours >= 1) return `dans ${totalHours} h`;
  const minutes = Math.max(1, Math.ceil(msUntilReset / 60_000));
  return `dans ${minutes} min`;
};

/** Calcule la prochaine réinitialisation mensuelle des crédits gratuits. */
const computeNextResetLabel = async (userId: string | null): Promise<string | null> => {
  if (!userId) return null;
  try {
    const { data } = await supabase.rpc('get_user_credit_balance', { _user_id: userId });
    const balance = data as any;
    // Le SQL renvoie monthly_reset_date OU weekly_reset_date (compat ascendante)
    const resetDateStr: string | null =
      balance?.monthly_reset_date ?? balance?.weekly_reset_date ?? null;
    if (!resetDateStr) return null;
    // La fenêtre est de 30 jours glissants à partir de cette date
    const reset = new Date(resetDateStr);
    reset.setDate(reset.getDate() + 30);
    const ms = reset.getTime() - Date.now();
    return formatRemaining(ms);
  } catch {
    return null;
  }
};

/**
 * Affiche le toast "Crédits insuffisants" — anti-spam (1 toast / 4 s max).
 * Async pour pouvoir récupérer la date de prochaine recharge mensuelle.
 */
export const notifyInsufficientCredits = async (
  context?: string,
): Promise<void> => {
  const now = Date.now();
  const ctxKey = (context || '__default__').toLowerCase();

  // 1) Cooldown global : pas plus d'un toast toutes les 8s, tous contextes confondus
  if (now - lastShownAt < GLOBAL_COOLDOWN_MS) return;
  // 2) Cooldown par contexte : pas plus d'un toast par action toutes les 15s
  const lastForCtx = lastShownByContext.get(ctxKey) ?? 0;
  if (now - lastForCtx < PER_CONTEXT_COOLDOWN_MS) return;

  lastShownAt = now;
  lastShownByContext.set(ctxKey, now);

  // GC léger : on retire les contextes anciens pour éviter une croissance infinie
  if (lastShownByContext.size > 50) {
    for (const [k, t] of lastShownByContext) {
      if (now - t > PER_CONTEXT_COOLDOWN_MS * 4) lastShownByContext.delete(k);
    }
  }

  // Récupère l'user courant (sans bloquer si non dispo)
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id ?? null;
  } catch {
    /* ignore */
  }

  const nextResetLabel = await computeNextResetLabel(userId);
  const description =
    nextResetLabel
      ? `Tes 5 crédits/jour gratuits reviennent ${nextResetLabel}. Tu peux aussi en acheter pour continuer.${
          context ? ` (${context})` : ''
        }`
      : `Achète des crédits ou attends la prochaine réinitialisation mensuelle.${
          context ? ` (${context})` : ''
        }`;

  toast.error('Crédits insuffisants', {
    id: `insufficient-credits:${ctxKey}`, // déduplication native sonner
    description,
    duration: 6000,
    action: {
      label: 'Voir mes crédits',
      onClick: () => {
        window.location.href = '/?tab=credits';
      },
    },
  });
};

/** Variante synchrone (fire-and-forget) pour les call-sites non-async. */
export const notifyInsufficientCreditsSync = (context?: string): void => {
  void notifyInsufficientCredits(context);
};
