import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ChatbotConfig {
  id: string;
  user_id: string;
  is_active: boolean;
  greeting_message: string;
  chatbot_info: string[];
  created_at: string;
  updated_at: string;
}

export const useChatbotConfig = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['chatbot-config', targetUserId],
    queryFn: async (): Promise<ChatbotConfig | null> => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('user_chatbot_config' as any)
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching chatbot config:', error);
        return null;
      }
      return data as any;
    },
    enabled: !!targetUserId,
  });
};

export const useUpdateChatbotConfig = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: {
      is_active?: boolean;
      greeting_message?: string;
      chatbot_info?: string[];
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if config exists
      const { data: existing } = await supabase
        .from('user_chatbot_config' as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_chatbot_config' as any)
          .update(config as any)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_chatbot_config' as any)
          .insert({ user_id: user.id, ...config } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-config', user?.id] });
      toast.success('ChatBot mis à jour');
    },
    onError: (error) => {
      console.error('Error updating chatbot config:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
};

export const useChatbotConversation = (profileUserId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['chatbot-conversation', user?.id, profileUserId],
    queryFn: async () => {
      if (!user?.id || !profileUserId) return [];

      const { data, error } = await supabase
        .from('chatbot_conversations' as any)
        .select('*')
        .eq('visitor_user_id', user.id)
        .eq('profile_user_id', profileUserId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching chatbot conversation:', error);
        return [];
      }
      return (data || []) as any[];
    },
    enabled: !!user?.id && !!profileUserId,
  });
};

export const useSendChatbotMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileUserId, message, conversationHistory }: {
      profileUserId: string;
      message: string;
      conversationHistory: { role: string; content: string }[];
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;

      if (!accessToken) throw new Error('No access token');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot-reply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            profile_user_id: profileUserId,
            message,
            conversation_history: conversationHistory,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chatbot error');
      }

      const data = await response.json();
      return data.reply as string;
    },
    onSuccess: (reply, { profileUserId }) => {
      // Don't invalidate - we manage local state to avoid duplicates
    },
  });
};
