import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export const usePinnedMessages = (roomId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pinnedMessages, isLoading } = useQuery({
    queryKey: ['pinned-messages', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pinned_messages')
        .select('*, messages(content, sender_id)')
        .eq('chat_room_id', roomId)
        .order('pinned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!roomId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`pinned-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pinned_messages',
        filter: `chat_room_id=eq.${roomId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['pinned-messages', roomId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, queryClient]);

  const pinMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('pinned_messages')
        .insert({ chat_room_id: roomId, message_id: messageId, pinned_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-messages', roomId] });
      toast.success('Message épinglé !');
    },
    onError: () => toast.error("Erreur lors de l'épinglage"),
  });

  const unpinMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('pinned_messages')
        .delete()
        .eq('chat_room_id', roomId)
        .eq('message_id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-messages', roomId] });
      toast.success('Message désépinglé');
    },
    onError: () => toast.error('Erreur lors du désépinglage'),
  });

  const isMessagePinned = (messageId: string) =>
    pinnedMessages?.some((p: any) => p.message_id === messageId) || false;

  return {
    pinnedMessages: pinnedMessages || [],
    isLoading,
    pinMessage,
    unpinMessage,
    isMessagePinned,
  };
};
