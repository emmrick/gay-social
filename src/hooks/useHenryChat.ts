import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { emitCreditDeduction } from '@/components/credits/CreditDeductionAnimation';

export interface HenryConversationRow {
  id: string;
  user_id: string;
  relationship_goal: string | null;
  age_min: number | null;
  age_max: number | null;
  region: string | null;
  tribes: string[];
  interests: string[];
  height_min: number | null;
  height_max: number | null;
  languages: string[];
  availability: string[];
  free_notes: Record<string, string>;
  current_step: string;
  pending_message_count: number;
  total_messages_sent: number;
  created_at: string;
  updated_at: string;
}

export interface HenryMessageRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'henry';
  content: string;
  payload: any | null;
  created_at: string;
}

export interface HenryProfileMatch {
  user_id: string;
  username: string;
  age: number | null;
  region: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_online: boolean;
  compatibility: number;
  shared_tribes: string[];
  reasons: string[];
}

/** Hook principal : gère conversation Henry + messages + matching. */
export const useHenryChat = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Get-or-create conversation
  const convQuery = useQuery({
    queryKey: ['henry-conversation', user?.id],
    queryFn: async (): Promise<HenryConversationRow | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc(
        'henry_get_or_create_conversation' as any,
      );
      if (error) throw error;
      return data as HenryConversationRow;
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  // Messages
  const messagesQuery = useQuery({
    queryKey: ['henry-messages', user?.id],
    queryFn: async (): Promise<HenryMessageRow[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('henry_messages' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as unknown as HenryMessageRow[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  // Realtime updates
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`henry-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'henry_messages',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['henry-messages', user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  // Send a USER message — debits 1 credit every 5 messages
  const sendUserMessage = useMutation({
    mutationFn: async ({
      content,
      payload,
    }: {
      content: string;
      payload?: any;
    }) => {
      const { data, error } = await supabase.rpc('henry_send_user_message' as any, {
        _content: content,
        _payload: payload ?? null,
      });
      if (error) throw error;
      const result = data as {
        success: boolean;
        error?: string;
        credit_deducted?: boolean;
        pending_count?: number;
      };
      if (!result.success) {
        throw new Error(result.error || 'SEND_FAILED');
      }
      return result;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['henry-messages', user?.id] });
      qc.invalidateQueries({ queryKey: ['henry-conversation', user?.id] });
      if (result.credit_deducted) {
        const amount = (result as any).credit_amount ?? 0.2;
        // Anime le débit comme partout ailleurs sur le site
        emitCreditDeduction(amount, 'Message à Henry');
        qc.invalidateQueries({ queryKey: ['user-credits'] });
      }
    },
  });

  // Save a HENRY (bot) message — free
  const saveBotMessage = useMutation({
    mutationFn: async ({ content, payload }: { content: string; payload?: any }) => {
      const { data, error } = await supabase.rpc('henry_save_bot_message' as any, {
        _content: content,
        _payload: payload ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['henry-messages', user?.id] });
    },
  });

  // Update collected criteria + step
  const updateCriteria = useMutation({
    mutationFn: async (params: {
      relationship_goal?: string | null;
      age_min?: number | null;
      age_max?: number | null;
      region?: string | null;
      tribes?: string[] | null;
      interests?: string[] | null;
      current_step?: string | null;
      height_min?: number | null;
      height_max?: number | null;
      languages?: string[] | null;
      availability?: string[] | null;
      free_note_step?: string | null;
      free_note_text?: string | null;
    }) => {
      const { data, error } = await supabase.rpc('henry_update_criteria' as any, {
        _relationship_goal: params.relationship_goal ?? null,
        _age_min: params.age_min ?? null,
        _age_max: params.age_max ?? null,
        _region: params.region ?? null,
        _tribes: params.tribes ?? null,
        _interests: params.interests ?? null,
        _current_step: params.current_step ?? null,
        _height_min: params.height_min ?? null,
        _height_max: params.height_max ?? null,
        _languages: params.languages ?? null,
        _availability: params.availability ?? null,
        _free_note_step: params.free_note_step ?? null,
        _free_note_text: params.free_note_text ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['henry-conversation', user?.id] });
    },
  });

  // Reset
  const resetConversation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc(
        'henry_reset_conversation' as any,
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['henry-conversation', user?.id] });
      qc.invalidateQueries({ queryKey: ['henry-messages', user?.id] });
    },
  });

  // Trigger matching via edge function
  const findMatches = useCallback(
    async (excludeIds: string[] = []): Promise<HenryProfileMatch[]> => {
      const { data, error } = await supabase.functions.invoke('henry-match', {
        body: { exclude_user_ids: excludeIds, limit: 5 },
      });
      if (error) {
        console.error('[henry-match]', error);
        toast.error('Henry n\'a pas pu chercher de profils. Réessaie.');
        return [];
      }
      return (data as { profiles: HenryProfileMatch[] }).profiles ?? [];
    },
    [],
  );

  return {
    conversation: convQuery.data,
    messages: messagesQuery.data ?? [],
    isLoading: convQuery.isLoading || messagesQuery.isLoading,
    sendUserMessage,
    saveBotMessage,
    updateCriteria,
    resetConversation,
    findMatches,
  };
};
