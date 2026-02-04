import { supabase } from '@/integrations/supabase/client';

type NotificationType = 'private_message' | 'group_message' | 'favorite' | 'reaction' | 'album_share' | 'system';

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
    '/?tab=profile'
  );
};

// Notify user when their identity verification is approved
export const notifyVerificationApproved = async (userId: string) => {
  await createNotificationAndPush(
    userId,
    'verification_approved',
    '✅ Vérification approuvée',
    'Félicitations ! Votre identité a été vérifiée. Vous avez maintenant accès à toutes les fonctionnalités.',
    '/?tab=profile'
  );
};

// Notify user when their identity verification is rejected
export const notifyVerificationRejected = async (userId: string, reason: string) => {
  await createNotificationAndPush(
    userId,
    'verification_rejected',
    '❌ Vérification refusée',
    `Votre demande de vérification a été refusée : ${reason}. Vous pouvez soumettre une nouvelle demande.`,
    '/?tab=profile'
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
