import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifySupportTicketAssigned } from '@/services/pushNotificationService';
import { useActiveTask } from '@/hooks/useModerationTaskQueue';
import SupportChatRoom from '@/components/support/SupportChatRoom';
import { SupportTicket, useSupportMessages } from '@/hooks/useSupportTickets';
import { useAuth } from '@/contexts/AuthContext';
import { Headphones, Loader2 } from 'lucide-react';

interface AdminSupportChatPanelProps {
  onBack: () => void;
}

const AdminSupportChatPanel = ({ onBack }: AdminSupportChatPanelProps) => {
  const { user } = useAuth();
  const { data: activeTask } = useActiveTask();
  const ticketId = (activeTask?.metadata as any)?.ticket_id as string | undefined;
  const autoMessageSentRef = useRef<string | null>(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['support-ticket-detail', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data, error } = await supabase
        .from('support_tickets' as any)
        .select('*')
        .eq('id', ticketId)
        .single();
      if (error) throw error;
      return data as unknown as SupportTicket;
    },
    enabled: !!ticketId,
  });

  // Fetch moderator profile for auto-message
  const { data: moderatorProfile } = useQuery({
    queryKey: ['moderator-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Auto-assign ticket + send welcome message when moderator opens it
  useEffect(() => {
    if (!ticket || !activeTask?.reserved_by || !moderatorProfile?.username) return;
    if (autoMessageSentRef.current === ticket.id) return;

    const assignAndNotify = async () => {
      // Assign ticket
      if (ticket.status === 'open') {
        await supabase
          .from('support_tickets' as any)
          .update({ status: 'assigned', assigned_to: activeTask.reserved_by } as any)
          .eq('id', ticket.id);

        // Send push + in-app notification to user
        await notifySupportTicketAssigned(ticket.user_id, ticket.ticket_number);
      }

      // Send automatic greeting message
      autoMessageSentRef.current = ticket.id;
      await supabase
        .from('support_messages' as any)
        .insert({
          ticket_id: ticket.id,
          sender_id: activeTask.reserved_by,
          content: `Votre conseiller ${moderatorProfile.username} est actuellement en train de regarder le motif de votre demande. Merci de patienter quelques instants, il va vous répondre dans quelques minutes. 🙏`,
          message_type: 'system',
        } as any);
    };

    assignAndNotify();
  }, [ticket?.id, ticket?.status, activeTask?.reserved_by, moderatorProfile?.username]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Headphones className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-1">Aucun ticket de support actif</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Acceptez une mission de support depuis la file d'attente pour ouvrir une conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-180px)] sm:h-[calc(100vh-100px)] -mx-4 -mt-2 sm:-m-6 rounded-xl overflow-hidden border border-border bg-background">
      <SupportChatRoom ticket={ticket} onBack={onBack} isAgent />
    </div>
  );
};

export default AdminSupportChatPanel;
