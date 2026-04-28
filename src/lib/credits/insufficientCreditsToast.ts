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

let lastShownAt = 0;

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
  if (now - lastShownAt < 4000) return;
  lastShownAt = now;

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
