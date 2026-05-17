/**
 * usePhotoExchange — gestion d'un échange de photos vérifié entre 2 membres.
 *
 * Flow :
 *  pending → accepted → awaiting_review → completed | rejected | cancelled
 *  • Création par initiateur, acceptation par destinataire
 *  • Upload des 2 photos (bucket privé `photo-exchanges`)
 *  • Trigger SQL crée automatiquement la mission de modération
 *  • Une fois les 2 photos approuvées, les 2 membres voient la photo reçue (URL signée 1h)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type PhotoExchangeStatus =
  | 'pending'
  | 'accepted'
  | 'awaiting_review'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface PhotoExchange {
  id: string;
  conversation_id: string;
  initiator_id: string;
  recipient_id: string;
  status: PhotoExchangeStatus;
  created_at: string;
  updated_at: string;
}

export interface PhotoExchangePhoto {
  id: string;
  exchange_id: string;
  user_id: string;
  storage_path: string;
  review_status: 'pending' | 'approved' | 'rejected';
  review_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  retry_count: number;
  created_at: string;
}

const ACTIVE_STATUSES: PhotoExchangeStatus[] = [
  'pending',
  'accepted',
  'awaiting_review',
  'completed',
];

/** Cherche l'échange actif (le plus récent) sur une conversation. */
export const useActivePhotoExchange = (conversationId: string | null | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['photo-exchange', conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<{ exchange: PhotoExchange; photos: PhotoExchangePhoto[] } | null> => {
      if (!conversationId) return null;
      const { data: exchanges, error } = await supabase
        .from('photo_exchanges' as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .in('status', ACTIVE_STATUSES as any)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) { console.error('[photoExchange]', error); return null; }
      const exchange = (exchanges as any)?.[0] as PhotoExchange | undefined;
      if (!exchange) return null;

      // Masquer côté UI les demandes en attente depuis plus de 30 min
      // (le cron les annulera côté serveur dans les 5 min suivantes)
      if (exchange.status === 'pending') {
        const ageMs = Date.now() - new Date(exchange.created_at).getTime();
        if (ageMs > 30 * 60 * 1000) return null;
      }

      const { data: photos } = await supabase
        .from('photo_exchange_photos' as any)
        .select('*')
        .eq('exchange_id', exchange.id);

      return { exchange, photos: (photos as any) ?? [] };
    },
  });

  // Realtime: refresh on changes
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`photo-exchange-${conversationId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'photo_exchanges', filter: `conversation_id=eq.${conversationId}` },
        () => queryClient.invalidateQueries({ queryKey: ['photo-exchange', conversationId] }))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'photo_exchange_photos' },
        () => queryClient.invalidateQueries({ queryKey: ['photo-exchange', conversationId] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  return query;
};

export const usePhotoExchangeMutations = (conversationId: string | null | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['photo-exchange', conversationId] });

  const createExchange = useMutation({
    mutationFn: async (recipientId: string) => {
      if (!user || !conversationId) throw new Error('Not ready');
      const { data, error } = await supabase
        .from('photo_exchanges' as any)
        .insert({
          conversation_id: conversationId,
          initiator_id: user.id,
          recipient_id: recipientId,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;

      // Notification au destinataire
      const { data: profile } = await supabase
        .from('profiles').select('username').eq('user_id', user.id).maybeSingle();
      const username = profile?.username ?? 'Quelqu\'un';
      const actionUrl = `/chat/${recipientId}`;
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'photo_exchange_request',
        title: `📸 ${username} propose un échange de photos`,
        message: 'Acceptez pour échanger une photo vérifiée par la modération.',
        action_url: actionUrl,
      });
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: recipientId,
            title: `📸 ${username}`,
            body: 'Propose un échange de photos',
            url: actionUrl,
            notificationType: 'system',
          },
        });
      } catch (e) { console.warn('[photoExchange push]', e); }

      return data as unknown as PhotoExchange;
    },
    onSuccess: () => { toast.success('Demande d\'échange envoyée'); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? 'Erreur'),
  });

  const respondToExchange = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: exchange, error: fetchErr } = await supabase
        .from('photo_exchanges' as any)
        .select('initiator_id')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      const { error } = await supabase
        .from('photo_exchanges' as any)
        .update({ status: accept ? 'accepted' : 'cancelled' })
        .eq('id', id);
      if (error) throw error;

      // Notifier l'initiateur de la réponse
      const initiatorId = (exchange as any).initiator_id as string;
      const { data: profile } = await supabase
        .from('profiles').select('username').eq('user_id', user.id).maybeSingle();
      const username = profile?.username ?? 'Quelqu\'un';
      const actionUrl = `/chat/${initiatorId}`;
      await supabase.from('notifications').insert({
        user_id: initiatorId,
        type: 'photo_exchange_response',
        title: accept ? `✅ ${username} a accepté` : `❌ ${username} a refusé`,
        message: accept ? 'Vous pouvez maintenant envoyer votre photo.' : 'L\'échange a été refusé.',
        action_url: actionUrl,
      });
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: initiatorId,
            title: accept ? `✅ ${username} a accepté` : `❌ ${username} a refusé`,
            body: accept ? 'Envoyez votre photo' : 'Échange refusé',
            url: actionUrl,
            notificationType: 'system',
          },
        });
      } catch (e) { console.warn('[photoExchange push]', e); }
    },
    onSuccess: (_d, v) => { toast.success(v.accept ? 'Échange accepté' : 'Demande refusée'); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? 'Erreur'),
  });

  const cancelExchange = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('photo_exchanges' as any)
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Échange annulé'); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? 'Erreur'),
  });

  const uploadPhoto = useMutation({
    mutationFn: async ({ exchangeId, file }: { exchangeId: string; file: File }) => {
      if (!user) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/${exchangeId}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('photo-exchanges')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      // Insert or upsert (in case of retry, replace existing row)
      const { data: existing } = await supabase
        .from('photo_exchange_photos' as any)
        .select('id, retry_count, storage_path')
        .eq('exchange_id', exchangeId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Re-upload after rejection
        const { error } = await supabase
          .from('photo_exchange_photos' as any)
          .update({
            storage_path: path,
            review_status: 'pending',
            review_reason: null,
            retry_count: ((existing as any).retry_count ?? 0) + 1,
          })
          .eq('id', (existing as any).id);
        if (error) throw error;
        // Cleanup old file
        if ((existing as any).storage_path) {
          await supabase.storage.from('photo-exchanges').remove([(existing as any).storage_path]);
        }
      } else {
        const { error } = await supabase
          .from('photo_exchange_photos' as any)
          .insert({ exchange_id: exchangeId, user_id: user.id, storage_path: path });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('Photo envoyée — en attente de validation'); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? 'Erreur d\'upload'),
  });

  return { createExchange, respondToExchange, cancelExchange, uploadPhoto };
};

/** Récupère une URL signée pour une photo (vérifie les droits côté serveur). */
export const usePhotoExchangeSignedUrl = (photoId: string | null | undefined) => {
  return useQuery({
    queryKey: ['photo-exchange-url', photoId],
    enabled: !!photoId,
    staleTime: 50 * 60 * 1000, // 50 min (TTL 1h)
    queryFn: async (): Promise<string | null> => {
      if (!photoId) return null;
      const { data, error } = await supabase.rpc('get_photo_exchange_signed_url' as any, { _photo_id: photoId });
      if (error) { console.error('[photoExchange url]', error); return null; }
      return (data as string) ?? null;
    },
  });
};
