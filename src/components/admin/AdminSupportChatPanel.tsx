import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifySupportTicketAssigned } from '@/services/pushNotificationService';
import { useActiveTask } from '@/hooks/useModerationTaskQueue';
import SupportChatRoom from '@/components/support/SupportChatRoom';
import { SupportTicket } from '@/hooks/useSupportTickets';
import { useAuth } from '@/contexts/AuthContext';
import { Headphones, Loader2, Bot, ChevronDown, ChevronUp, User, MessageSquare } from 'lucide-react';
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

  // Fetch client profile for display
  const { data: clientProfile } = useQuery({
    queryKey: ['support-client-profile', ticket?.user_id],
    queryFn: async () => {
      if (!ticket?.user_id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', ticket.user_id)
        .single();
      return data;
    },
    enabled: !!ticket?.user_id,
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
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Headphones className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Aucun ticket actif</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Acceptez une mission de support pour ouvrir une conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="flex flex-col h-[min(600px,calc(100dvh-220px))] sm:h-[min(650px,calc(100vh-160px))] rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
        {/* Client info + chatbot history header */}
        <div className="flex-shrink-0 bg-card border-b border-border">
          {/* Client summary bar */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {clientProfile?.avatar_url ? (
                <img src={clientProfile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {clientProfile?.username || 'Client'}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                #{ticket.ticket_number} · {ticket.subject || 'Support'}
              </p>
            </div>
          </div>

          {/* Chatbot history toggle */}
          {chatbotHistory.length > 0 && (
            <>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t border-border/50"
              >
                <span className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5" />
                  Historique chatbot · {chatbotHistory.length} msg
                </span>
                {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showHistory && (
                <div className="px-4 pb-3 space-y-1.5 max-h-48 overflow-y-auto border-t border-border/30 bg-muted/20">
                  <div className="pt-2" />
                  {chatbotHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex",
                        msg.type === 'user' ? "justify-end" : msg.type === 'system' ? "justify-center" : "justify-start"
                      )}
                    >
                      {msg.type === 'system' ? (
                        <span className="text-[10px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">{msg.text}</span>
                      ) : (
                        <div className={cn(
                          "max-w-[75%] rounded-2xl px-3 py-1.5 text-[11px] leading-relaxed",
                          msg.type === 'user'
                            ? "bg-primary/10 text-primary rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Main chat */}
        <div className="flex-1 min-h-0 flex flex-col">
          <SupportChatRoom ticket={ticket} onBack={onBack} isAgent hideHeader />
        </div>
      </div>
    </div>
  );
};

export default AdminSupportChatPanel;
