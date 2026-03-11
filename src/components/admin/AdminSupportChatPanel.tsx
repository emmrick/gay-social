import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifySupportTicketAssigned } from '@/services/pushNotificationService';
import { useActiveTask } from '@/hooks/useModerationTaskQueue';
import SupportChatRoom from '@/components/support/SupportChatRoom';
import TaskQueuePopup from '@/components/admin/TaskQueuePopup';
import InfractionsSidebar from '@/components/admin/InfractionsSidebar';
import ClientDossierPanel from '@/components/admin/ClientDossierPanel';
import { SupportTicket } from '@/hooks/useSupportTickets';
import { useAuth } from '@/contexts/AuthContext';
import { Headphones, Loader2, User, Shield, FolderOpen } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminSupportChatPanelProps {
  onBack: () => void;
  onNavigateToSection?: (section: string) => void;
}

const AdminSupportChatPanel = ({ onBack, onNavigateToSection }: AdminSupportChatPanelProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { data: activeTask } = useActiveTask();
  const ticketId = (activeTask?.metadata as any)?.ticket_id as string | undefined;
  const autoMessageSentRef = useRef<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showInfractions, setShowInfractions] = useState(false);
  const [showDossier, setShowDossier] = useState(false);

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
  // Only send welcome message if ticket is freshly opened (not already assigned to this moderator)
  useEffect(() => {
    if (!ticket || !activeTask?.reserved_by || !moderatorProfile?.username) return;
    if (autoMessageSentRef.current === ticket.id) return;

    const assignAndNotify = async () => {
      // If already assigned to this moderator, skip (page refresh case)
      if (ticket.status === 'assigned' && ticket.assigned_to === activeTask.reserved_by) {
        autoMessageSentRef.current = ticket.id;
        return;
      }

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
          content: `**${moderatorProfile.username}** a rejoint la conversation et consulte votre demande. 🙏`,
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

  // Desktop: side-by-side layout (mission left, chat right)
  if (!isMobile) {
    return (
      <div className="flex gap-4 w-full max-w-7xl mx-auto">
        {/* Left: Mission panel */}
        <div className="w-[340px] shrink-0">
          <div className="sticky top-4">
            <TaskQueuePopup onNavigateToSection={onNavigateToSection || (() => {})} />
          </div>
        </div>

        {/* Center: Chat */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col h-[calc(100vh-160px)] rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
            {/* Client info header */}
            <div className="flex-shrink-0 bg-card border-b border-border">
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
                <Button
                  variant={showInfractions ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowInfractions(!showInfractions)}
                  className="gap-1.5"
                >
                  <Shield className="w-4 h-4" />
                  Infractions
                </Button>
                <Button
                  variant={showDossier ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setShowDossier(!showDossier);
                    if (!showDossier) setShowInfractions(false);
                  }}
                  className="gap-1.5"
                >
                  <FolderOpen className="w-4 h-4" />
                  Dossier
                </Button>
              </div>
            </div>

            {/* Main chat */}
            <div className="flex-1 min-h-0 flex flex-col">
              <SupportChatRoom ticket={ticket} onBack={onBack} isAgent hideHeader />
            </div>
          </div>
        </div>

        {/* Right: Infractions sidebar */}
        {showInfractions && ticket?.user_id && (
          <div className="w-[340px] shrink-0">
            <div className="h-[calc(100vh-160px)] rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
              <InfractionsSidebar
                userId={ticket.user_id}
                ticketId={ticket.id}
                onClose={() => setShowInfractions(false)}
              />
            </div>
          </div>
        )}

        {/* Right: Client Dossier sidebar */}
        {showDossier && ticket?.user_id && (
          <div className="w-[480px] shrink-0">
            <div className="h-[calc(100vh-160px)] rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
              <ScrollArea className="h-full">
                <ClientDossierPanel
                  userId={ticket.user_id}
                  ticketId={ticket.id}
                  onClose={() => setShowDossier(false)}
                />
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mobile: stacked layout (original)
  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="flex flex-col h-[min(600px,calc(100dvh-220px))] rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
        {/* Client info header */}
        <div className="flex-shrink-0 bg-card border-b border-border">
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
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowDossier(true)}
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main chat */}
        <div className="flex-1 min-h-0 flex flex-col">
          <SupportChatRoom ticket={ticket} onBack={onBack} isAgent hideHeader />
        </div>
      </div>

      {/* Mobile dossier sheet */}
      <Sheet open={showDossier} onOpenChange={setShowDossier}>
        <SheetContent side="bottom" className="h-[85dvh] p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle>Dossier client</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(85dvh-60px)]">
            {ticket?.user_id && (
              <ClientDossierPanel
                userId={ticket.user_id}
                ticketId={ticket.id}
                onClose={() => setShowDossier(false)}
              />
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminSupportChatPanel;
