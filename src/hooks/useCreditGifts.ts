import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useCreditGifts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const sendGift = useMutation({
    mutationFn: async ({ recipientId, amount, messageId }: {
      recipientId: string;
      amount: number;
      messageId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('send_credit_gift', {
        _sender_id: user.id,
        _recipient_id: recipientId,
        _amount: amount,
        _message_id: messageId || null,
      });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean; error?: string; gift_id?: string };
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'envoi');
      }

      return result;
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['user-credits', user.id] });
        queryClient.invalidateQueries({ queryKey: ['credit-transactions', user.id] });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return { sendGift };
};
