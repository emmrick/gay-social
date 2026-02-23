import { supabase } from '@/integrations/supabase/client';

type NotificationType = 'private_message' | 'group_message' | 'favorite' | 'reaction' | 'album_share' | 'match' | 'mention' | 'credit' | 'verification' | 'system';

interface SendPushOptions {
  userId: string;
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  notificationType?: NotificationType;
  regionCode?: string;
}

export const sendPushNotification = async (options: SendPushOptions): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: options,
    });

    if (error) {
      console.error('Error sending push notification:', error);
      return false;
    }

    console.log('Push notification sent:', data);
    return data?.success || false;
  } catch (error) {
    console.error('Error calling push notification function:', error);
    return false;
  }
};

// Helper to create in-app notification + push notification
const createNotificationAndPush = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  actionUrl: string,
  pushOptions?: Partial<SendPushOptions>
) => {
  // Create in-app notification
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    action_url: actionUrl,
  });

  // Send push notification
  await sendPushNotification({
    userId,
    title,
    body: message,
    url: actionUrl,
    notificationType: 'system',
    ...pushOptions,
  });
};

// Helper to trigger notification for new private message
export const notifyNewPrivateMessage = async (
  recipientId: string,
  senderUsername: string,
  senderId: string,
  messagePreview?: string
) => {
  const preview = messagePreview 
    ? messagePreview.length > 50 
      ? messagePreview.substring(0, 50) + '...' 
      : messagePreview
    : 'Nouveau message';

  return sendPushNotification({
    userId: recipientId,
    title: `💬 ${senderUsername}`,
    body: preview,
    url: `/profile/${senderId}`,
    tag: `private-${recipientId}`,
    notificationType: 'private_message',
  });
};

// Helper to trigger notification for new group message
export const notifyNewGroupMessage = async (
  recipientId: string,
  roomName: string,
  senderUsername: string,
  messagePreview?: string,
  regionCode?: string
) => {
  const preview = messagePreview 
    ? messagePreview.length > 50 
      ? messagePreview.substring(0, 50) + '...' 
      : messagePreview
    : 'Nouveau message';

  return sendPushNotification({
    userId: recipientId,
    title: `📢 ${roomName}`,
    body: `${senderUsername}: ${preview}`,
    url: '/',
    tag: `group-${roomName}`,
    notificationType: 'group_message',
    regionCode,
  });
};

// Helper for favorite notifications
export const notifyNewFavorite = async (
  recipientId: string,
  fromUsername: string,
  fromUserId: string
) => {
  return sendPushNotification({
    userId: recipientId,
    title: '⭐ Nouveau favori',
    body: `${fromUsername} t'a ajouté en favori`,
    url: `/profile/${fromUserId}`,
    tag: 'favorite',
    notificationType: 'favorite',
  });
};

// Helper for reaction notifications
export const notifyNewReaction = async (
  recipientId: string,
  fromUsername: string,
  fromUserId: string,
  emoji: string
) => {
  return sendPushNotification({
    userId: recipientId,
    title: `${emoji} Nouvelle réaction`,
    body: `${fromUsername} a réagi à ton profil`,
    url: `/profile/${fromUserId}`,
    tag: 'reaction',
    notificationType: 'reaction',
  });
};

// Helper for album share notifications
export const notifyAlbumShare = async (
  recipientId: string,
  fromUsername: string,
  fromUserId: string,
  albumName: string
) => {
  return sendPushNotification({
    userId: recipientId,
    title: '📸 Album partagé',
    body: `${fromUsername} t'a partagé l'album "${albumName}"`,
    url: `/profile/${fromUserId}`,
    tag: 'album-share',
    notificationType: 'album_share',
  });
};

// === SYSTEM NOTIFICATIONS ===

// Notify user when their identity verification is submitted
export const notifyVerificationSubmitted = async (userId: string) => {
  await createNotificationAndPush(
    userId,
    'verification_submitted',
    '📋 Demande envoyée',
    'Votre demande de vérification d\'identité a été reçue. Un modérateur l\'examinera sous peu.',
    '/?tab=profile',
    { notificationType: 'verification' }
  );
};

// Notify user when their identity verification is approved
export const notifyVerificationApproved = async (userId: string) => {
  await createNotificationAndPush(
    userId,
    'verification_approved',
    '✅ Vérification approuvée',
    'Félicitations ! Votre identité a été vérifiée. Vous avez maintenant accès à toutes les fonctionnalités.',
    '/?tab=profile',
    { notificationType: 'verification' }
  );
};

// Notify user when their identity verification is rejected
export const notifyVerificationRejected = async (userId: string, reason: string) => {
  await createNotificationAndPush(
    userId,
    'verification_rejected',
    '❌ Vérification refusée',
    `Votre demande de vérification a été refusée : ${reason}. Vous pouvez soumettre une nouvelle demande.`,
    '/?tab=profile',
    { notificationType: 'verification' }
  );
};

// Notify user when they are suspended
export const notifyUserSuspended = async (
  userId: string, 
  reason: string,
  duration?: string
) => {
  const durationText = duration ? ` pour ${duration}` : '';
  await createNotificationAndPush(
    userId,
    'account_suspended',
    '⚠️ Compte suspendu',
    `Votre compte a été suspendu${durationText}. Raison : ${reason}`,
    '/'
  );
};

// Notify user when they are banned (permanent)
export const notifyUserBanned = async (userId: string, reason: string) => {
  await createNotificationAndPush(
    userId,
    'account_banned',
    '🚫 Compte banni',
    `Votre compte a été définitivement banni. Raison : ${reason}`,
    '/'
  );
};

// Notify user when they are unblocked/unsuspended
export const notifyUserUnblocked = async (userId: string) => {
  await createNotificationAndPush(
    userId,
    'account_unblocked',
    '✅ Compte réactivé',
    'Votre compte a été réactivé. Vous pouvez à nouveau utiliser toutes les fonctionnalités.',
    '/'
  );
};

// Notify user when there's a report about them being investigated
export const notifyReportInvestigation = async (userId: string) => {
  await createNotificationAndPush(
    userId,
    'report_investigation',
    '🔍 Signalement en cours',
    'Un signalement vous concernant est en cours d\'examen. Votre compte est temporairement limité.',
    '/'
  );
};

// === NEW NOTIFICATIONS ===

// Notify user when they receive a private message (in-app notification)
export const notifyPrivateMessageInApp = async (
  recipientId: string,
  senderUsername: string,
  senderId: string,
  messagePreview?: string
) => {
  const preview = messagePreview
    ? messagePreview.length > 50
      ? messagePreview.substring(0, 50) + '...'
      : messagePreview
    : 'Nouveau message';

  await supabase.from('notifications').insert({
    user_id: recipientId,
    type: 'private_message',
    title: `💬 ${senderUsername}`,
    message: preview,
    action_url: `/profile/${senderId}`,
  });
};

// Notify both users when a swipe match occurs (mutual like)
export const notifySwipeMatch = async (
  userId: string,
  matchedUsername: string,
  matchedUserId: string
) => {
  await createNotificationAndPush(
    userId,
    'swipe_match',
    '💘 Nouveau match !',
    `${matchedUsername} t'a aussi liké ! Vous pouvez maintenant discuter.`,
    `/profile/${matchedUserId}`,
    { notificationType: 'match' }
  );
};

// Notify user when their credit purchase is approved
export const notifyCreditPurchaseApproved = async (
  userId: string,
  amount: number,
  priceEuros: number
) => {
  await createNotificationAndPush(
    userId,
    'credits_approved',
    '💰 Crédits ajoutés !',
    `Votre achat de ${amount} crédits (${priceEuros}€) a été validé. Bon tchat !`,
    '/?tab=premium',
    { notificationType: 'credit' }
  );
};

// Notify user when their credit purchase is rejected
export const notifyCreditPurchaseRejected = async (
  userId: string,
  reason?: string
) => {
  const reasonText = reason ? ` Raison : ${reason}` : '';
  await createNotificationAndPush(
    userId,
    'credits_rejected',
    '❌ Achat refusé',
    `Votre demande d'achat de crédits a été refusée.${reasonText}`,
    '/?tab=premium',
    { notificationType: 'credit' }
  );
};

// === SUPPORT NOTIFICATIONS ===

// Notify user when an agent replies to their support ticket
export const notifySupportAgentReply = async (
  userId: string,
  agentUsername: string,
  ticketNumber: string
) => {
  await createNotificationAndPush(
    userId,
    'support_reply',
    '🎧 Réponse du support',
    `${agentUsername} a répondu à votre ticket #${ticketNumber}.`,
    '/?tab=support',
    { notificationType: 'system', tag: `support-${ticketNumber}` }
  );
};

// Notify user when their support ticket is closed
export const notifySupportTicketClosed = async (
  userId: string,
  ticketNumber: string
) => {
  await createNotificationAndPush(
    userId,
    'support_closed',
    '✅ Ticket résolu',
    `Votre ticket de support #${ticketNumber} a été clôturé. Merci pour votre patience !`,
    '/?tab=support',
    { notificationType: 'system' }
  );
};

// Notify user when their support ticket is assigned to an agent
export const notifySupportTicketAssigned = async (
  userId: string,
  ticketNumber: string
) => {
  await createNotificationAndPush(
    userId,
    'support_assigned',
    '🎧 Agent assigné',
    `Un agent a pris en charge votre ticket #${ticketNumber}. Vous recevrez une réponse sous peu.`,
    '/?tab=support',
    { notificationType: 'system' }
  );
};

// === WITHDRAWAL NOTIFICATIONS ===

// Notify moderator when their withdrawal is approved
export const notifyWithdrawalApproved = async (
  userId: string,
  amountCents: number
) => {
  const amountEuros = (amountCents / 100).toFixed(2);
  await createNotificationAndPush(
    userId,
    'withdrawal_approved',
    '✅ Retrait approuvé',
    `Votre demande de retrait de ${amountEuros}€ a été approuvée. Le paiement sera effectué prochainement.`,
    '/admin',
    { notificationType: 'system' }
  );
};

// Notify moderator when their withdrawal is rejected
export const notifyWithdrawalRejected = async (
  userId: string,
  amountCents: number,
  reason?: string
) => {
  const amountEuros = (amountCents / 100).toFixed(2);
  const reasonText = reason ? ` Raison : ${reason}` : '';
  await createNotificationAndPush(
    userId,
    'withdrawal_rejected',
    '❌ Retrait refusé',
    `Votre demande de retrait de ${amountEuros}€ a été refusée.${reasonText} Le montant a été recrédité.`,
    '/admin',
    { notificationType: 'system' }
  );
};

// Notify moderator when their withdrawal is completed (paid)
export const notifyWithdrawalCompleted = async (
  userId: string,
  amountCents: number
) => {
  const amountEuros = (amountCents / 100).toFixed(2);
  await createNotificationAndPush(
    userId,
    'withdrawal_completed',
    '💸 Paiement effectué',
    `Votre retrait de ${amountEuros}€ a été payé avec succès !`,
    '/admin',
    { notificationType: 'system' }
  );
};

// === SCREENSHOT SANCTION NOTIFICATIONS ===

// Notify user when they receive a screenshot sanction
export const notifyScreenshotSanction = async (
  userId: string,
  violationCount: number,
  suspendedUntil?: string
) => {
  const message = suspendedUntil
    ? `Vous avez été sanctionné pour capture d'écran (${violationCount} violation${violationCount > 1 ? 's' : ''}). Votre compte est temporairement suspendu.`
    : `Attention : capture d'écran détectée (${violationCount} violation${violationCount > 1 ? 's' : ''}). Des sanctions peuvent s'appliquer.`;
  
  await createNotificationAndPush(
    userId,
    'screenshot_sanction',
    '📸 Sanction capture d\'écran',
    message,
    '/',
    { notificationType: 'system' }
  );
};

// Notify user when their screenshot sanction is lifted
export const notifyScreenshotSanctionLifted = async (userId: string) => {
  await createNotificationAndPush(
    userId,
    'screenshot_sanction_lifted',
    '✅ Sanction levée',
    'Votre sanction pour capture d\'écran a été levée. Veuillez respecter la vie privée des autres membres.',
    '/',
    { notificationType: 'system' }
  );
};
