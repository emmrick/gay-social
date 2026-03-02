import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  assigned_to: string | null;
  status: string;
  subject: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  read_at: string | null;
}

export const useSupportTickets = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('support_tickets' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SupportTicket[];
    },
    enabled: !!user?.id,
  });

  const createTicket = useMutation({
    mutationFn: async (subject?: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('support_tickets' as any)
        .insert({
          user_id: user.id,
          ticket_number: '',
          subject: subject || "Demande d'assistance",
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SupportTicket;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success(`Ticket #${data.ticket_number} créé`, {
        description: 'Un agent va prendre en charge votre demande.',
      });
    },
    onError: () => {
      toast.error('Erreur lors de la création du ticket');
    },
  });

  // Realtime subscription for ticket updates
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('support-tickets-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_tickets',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  return { tickets, isLoading, createTicket };
};

export const useSupportMessages = (ticketId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['support-messages', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from('support_messages' as any)
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as SupportMessage[];
    },
    enabled: !!ticketId,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ content, messageType = 'text' }: { content: string; messageType?: string }) => {
      if (!user?.id || !ticketId) throw new Error('Missing data');
      const { data, error } = await supabase
        .from('support_messages' as any)
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          content,
          message_type: messageType,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-messages', ticketId] });
    },
  });

  // Realtime for new messages
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`support-messages-${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${ticketId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['support-messages', ticketId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, queryClient]);

  return { messages, isLoading, sendMessage };
};
