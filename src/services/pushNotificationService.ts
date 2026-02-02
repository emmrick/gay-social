import { supabase } from '@/integrations/supabase/client';

type NotificationType = 'private_message' | 'group_message' | 'favorite' | 'reaction' | 'album_share';

interface SendPushOptions {
  userId: string;
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  notificationType?: NotificationType;
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
  messagePreview?: string
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
