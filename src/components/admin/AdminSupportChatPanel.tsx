import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifySupportTicketAssigned } from '@/services/pushNotificationService';
import { useActiveTask } from '@/hooks/useModerationTaskQueue';
import SupportChatRoom from '@/components/support/SupportChatRoom';
import { SupportTicket } from '@/hooks/useSupportTickets';
import { useAuth } from '@/contexts/AuthContext';
import { Headphones, Loader2, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminSupportChatPanelProps {
  onBack: () => void;
}

const AdminSupportChatPanel = ({ onBack }: AdminSupportChatPanelProps) => {
  const { user } = useAuth();
  const { data: activeTask } = useActiveTask();
  const ticketId = (activeTask?.metadata as any)?.ticket_id as string | undefined;
  const autoMessageSentRef = useRef<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

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
      if (ticket.status === 'open') {
        await supabase
          .from('support_tickets' as any)
          .update({ status: 'assigned', assigned_to: activeTask.reserved_by } as any)
          .eq('id', ticket.id);

        await notifySupportTicketAssigned(ticket.user_id, ticket.ticket_number);
      }

      autoMessageSentRef.current = ticket.id;
      await supabase
        .from('support_messages' as any)
        .insert({
          ticket_id: ticket.id,
          sender_id: activeTask.reserved_by,
          content: `${moderatorProfile.username} a rejoint la conversation et consulte votre demande. 🙏`,
          message_type: 'system',
        } as any);
    };

    assignAndNotify();
  }, [ticket?.id, ticket?.status, activeTask?.reserved_by, moderatorProfile?.username]);

  const chatbotHistory = (ticket?.chatbot_history || []) as Array<{ type: string; text: string }>;

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
    <div className="h-[calc(100dvh-200px)] sm:h-[calc(100vh-120px)] rounded-xl overflow-hidden border border-border bg-background flex flex-col">
      {/* Chatbot history collapsible */}
      {chatbotHistory.length > 0 && (
        <div className="border-b border-border bg-muted/30">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Historique chatbot ({chatbotHistory.length} messages)
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="px-4 pb-3 space-y-2 max-h-60 overflow-y-auto">
              {chatbotHistory.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    msg.type === 'user' ? "justify-end" : msg.type === 'system' ? "justify-center" : "justify-start"
                  )}
                >
                  {msg.type === 'system' ? (
                    <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">{msg.text}</span>
                  ) : (
                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-2 text-xs",
                      msg.type === 'user'
                        ? "bg-foreground text-background rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}>
                      {msg.text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main chat */}
      <div className="flex-1 min-h-0">
        <SupportChatRoom ticket={ticket} onBack={onBack} isAgent />
      </div>
    </div>
  );
};

export default AdminSupportChatPanel;
