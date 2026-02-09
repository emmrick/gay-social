import { useCallback } from 'react';
import { useCreditDialog } from '@/contexts/CreditDialogContext';
import { useCredits, CREDIT_COSTS, CreditActionType } from '@/hooks/useCredits';

/**
 * Hook for checking credits before performing an action
 * Shows the insufficient credits dialog if the user doesn't have enough credits
 */
export const useCreditCheck = () => {
  const { showInsufficientCreditsDialog } = useCreditDialog();
  const { totalCredits, hasEnoughCredits } = useCredits();

  const actionNames: Record<CreditActionType, string> = {
    private_message_text: 'Envoyer un message',
    private_message_media: 'Envoyer un média',
    group_message_text: 'Message de groupe',
    group_message_media: 'Média de groupe',
    ephemeral_media: 'Média éphémère',
    album_share: 'Partager un album',
    album_create: 'Créer un album',
    profile_reaction: 'Réaction profil',
    profile_view: 'Voir un profil',
    nearby_unlock_30: 'Débloquer 30 profils',
    nearby_unlock_130: 'Débloquer 130 profils',
    swipe_like: 'Aimer un profil',
    swipe_dislike: 'Passer un profil',
    swipe_hide: 'Masquer définitivement',
    swipe_start_conversation: 'Démarrer une conversation',
    join_extra_group: 'Rejoindre un groupe',
    chatbot_message: 'Message chatbot',
    chatbot_info: 'Info chatbot',
    chatbot_info_extra: 'Info chatbot (extra)',
  };

  /**
   * Check if the user has enough credits for an action
   * If not, shows the insufficient credits dialog
   * @returns true if the user has enough credits, false otherwise
   */
  const checkCredits = useCallback((action: CreditActionType): boolean => {
    const cost = CREDIT_COSTS[action];
    const hasEnough = hasEnoughCredits(cost);
    
    if (!hasEnough) {
      showInsufficientCreditsDialog(cost, actionNames[action]);
    }
    
    return hasEnough;
  }, [hasEnoughCredits, showInsufficientCreditsDialog]);

  /**
   * Check if the user has enough credits for a custom amount
   * If not, shows the insufficient credits dialog
   * @returns true if the user has enough credits, false otherwise
   */
  const checkCreditsAmount = useCallback((amount: number, actionName: string): boolean => {
    const hasEnough = hasEnoughCredits(amount);
    
    if (!hasEnough) {
      showInsufficientCreditsDialog(amount, actionName);
    }
    
    return hasEnough;
  }, [hasEnoughCredits, showInsufficientCreditsDialog]);

  return {
    checkCredits,
    checkCreditsAmount,
    totalCredits,
    hasEnoughCredits,
    showInsufficientCreditsDialog,
  };
};
