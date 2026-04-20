import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Épingle de messages dans les conversations privées (1 à 1).
 * Utilise une table dédiée `private_pinned_messages` (clé : couple d'IDs triés).
 */
export const usePrivatePinnedMessages = (otherUserId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userA = user && otherUserId ? (user.id < otherUserId ? user.id : otherUserId) : null;
  const userB = user && otherUserId ? (user.id < otherUserId ? otherUserId : user.id) : null;
  const enabled = !!user && !!otherUserId && !!userA && !!userB;

  const { data: pinnedMessages, isLoading } = useQuery({
    queryKey: ['private-pinned', userA, userB],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('private_pinned_messages')
        .select('*, messages(id, content, sender_id, message_type, created_at)')
        .eq('user_a_id', userA!)
        .eq('user_b_id', userB!)
        .order('pinned_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled,
  });

  // Realtime
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`private-pinned-${userA}-${userB}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'private_pinned_messages',
        filter: `user_a_id=eq.${userA}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['private-pinned', userA, userB] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, userA, userB, queryClient]);

  const pinMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user || !userA || !userB) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('private_pinned_messages')
        .insert({
          message_id: messageId,
          user_a_id: userA,
          user_b_id: userB,
          pinned_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-pinned', userA, userB] });
      toast.success('Message épinglé');
    },
    onError: (e: any) => {
      console.error('[PrivatePin] insert error', e);
      toast.error("Impossible d'épingler ce message");
    },
  });

  const unpinMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!userA || !userB) throw new Error('Missing conversation');
      const { error } = await supabase
        .from('private_pinned_messages')
        .delete()
        .eq('message_id', messageId)
        .eq('user_a_id', userA)
        .eq('user_b_id', userB);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-pinned', userA, userB] });
      toast.success('Message désépinglé');
    },
    onError: () => toast.error('Erreur lors du désépinglage'),
  });

  const isMessagePinned = (messageId: string) =>
    !!pinnedMessages?.some((p: any) => p.message_id === messageId);

  return {
    pinnedMessages: pinnedMessages || [],
    isLoading,
    pinMessage,
    unpinMessage,
    isMessagePinned,
  };
};
