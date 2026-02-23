import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Headphones, ChevronDown, Hash, Send, Info } from 'lucide-react';
import CreditRequestMessage from '@/components/chat/CreditRequestMessage';
import { useSupportMessages, SupportTicket } from '@/hooks/useSupportTickets';
import { notifySupportAgentReply } from '@/services/pushNotificationService';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import SavedRepliesSheet from '@/components/support/SavedRepliesSheet';

interface SupportChatRoomProps {
  ticket: SupportTicket;
  onBack: () => void;
  isAgent?: boolean;
}

const formatDateLabel = (date: Date): string => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'd MMMM yyyy', { locale: fr });
};

const SupportChatRoom = ({ ticket, onBack, isAgent = false }: SupportChatRoomProps) => {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage } = useSupportMessages(ticket.id);
  const [inputValue, setInputValue] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isInitialLoad = useRef(true);
  const previousMessagesLength = useRef(0);

  // Fetch sender profiles for display
  const senderIds = [...new Set(messages.map(m => m.sender_id))];
  const { data: senderProfiles } = useQuery({
    queryKey: ['support-sender-profiles', senderIds.join(',')],
    queryFn: async () => {
      if (senderIds.length === 0) return {};
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', senderIds);
      const map: Record<string, { username: string; avatar_url: string | null }> = {};
      data?.forEach(p => { map[p.user_id] = p; });
      return map;
    },
    enabled: senderIds.length > 0,
  });

  const scrollToBottom = useCallback((instant = false) => {
    const c = messagesContainerRef.current;
    if (c) {
      if (instant) c.scrollTop = c.scrollHeight;
      else c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useLayoutEffect(() => {
    if (isLoading || messages.length === 0) return;
    if (isInitialLoad.current) {
      scrollToBottom(true);
      const t = setTimeout(() => { scrollToBottom(true); isInitialLoad.current = false; previousMessagesLength.current = messages.length; }, 100);
      return () => clearTimeout(t);
    }
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isLoading || isInitialLoad.current) return;
    if (messages.length > previousMessagesLength.current) {
      scrollToBottom(false);
      previousMessagesLength.current = messages.length;
    }
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    await sendMessage.mutateAsync({ content: text });

    // If agent is replying, notify the ticket owner
    if (isAgent && ticket.user_id !== user?.id) {
      const senderProfile = senderProfiles?.[user?.id || ''];
      const agentName = senderProfile?.username || 'Un agent';
      notifySupportAgentReply(ticket.user_id, agentName, ticket.ticket_number);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  }, []);

  const shouldShowDateSeparator = (index: number): boolean => {
    if (index === 0) return true;
    return !isSameDay(new Date(messages[index].created_at), new Date(messages[index - 1].created_at));
  };

  const isClosed = ticket.status === 'closed';

  const statusLabel = ticket.status === 'open' ? 'En attente' : ticket.status === 'assigned' ? 'En cours' : 'Fermé';
  const statusColor = ticket.status === 'open' ? 'bg-amber-500/20 text-amber-600' : ticket.status === 'assigned' ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground';

  return (
    <div className="flex flex-col h-full min-h-0 bg-background overflow-hidden">
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center gap-2 px-2 py-2 border-b border-border bg-card z-20"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
      >
        <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0 h-10 w-10">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Headphones className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-[15px] text-foreground truncate">Support</h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                <Hash className="w-3 h-3" />{ticket.ticket_number}
              </span>
              <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", statusColor)}>
                {statusLabel}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Ticket info banner */}
      <div className="px-4 py-2 bg-primary/5 border-b border-border">
        <p className="text-xs text-muted-foreground text-center">
          Ticket #{ticket.ticket_number} • {ticket.subject}
        </p>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain relative"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        <div className="px-3 py-2 space-y-0.5">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className="h-12 w-48 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Headphones className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm mb-2">
                Décrivez votre problème ci-dessous.
              </p>
              <p className="text-xs text-muted-foreground">
                Un agent prendra en charge votre demande dès que possible.
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.sender_id === user?.id;
              const showDate = shouldShowDateSeparator(index);
              const senderProfile = senderProfiles?.[message.sender_id];

              const nextMsg = messages[index + 1];
              const isLastInGroup = !nextMsg ||
                nextMsg.sender_id !== message.sender_id ||
                new Date(nextMsg.created_at).getTime() - new Date(message.created_at).getTime() > 120000;

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex justify-center py-3">
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted/80 px-3 py-1 rounded-full">
                        {formatDateLabel(new Date(message.created_at))}
                      </span>
                    </div>
                  )}

                  <div className={cn(
                    "flex",
                    isOwn ? "justify-end" : "justify-start",
                    isLastInGroup ? "mb-2" : "mb-0.5"
                  )}>
                    <div className={cn("max-w-[80%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                      {/* Agent label */}
                      {!isOwn && isLastInGroup && senderProfile && (
                        <span className="text-[11px] text-primary font-medium mb-0.5 px-1">
                          🛡️ {senderProfile.username}
                        </span>
                      )}

                      {message.message_type === 'credit_request' ? (
                        <CreditRequestMessage
                          messageId={message.id}
                          content={message.content}
                          senderId={message.sender_id}
                          isOwn={isOwn}
                          isSupportContext
                          ticketId={ticket.id}
                        />
                      ) : message.message_type === 'system' ? (
                        <div className="flex items-start gap-2 px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-2xl border border-border/50 italic max-w-full">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span style={{ wordBreak: 'break-word' }}>{message.content}</span>
                        </div>
                      ) : (
                        <div className={cn(
                          "px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                            : "bg-card border border-border text-foreground rounded-2xl rounded-bl-md",
                          "max-w-full"
                        )}
                        style={{ wordBreak: 'break-word' }}
                        >
                          {message.content}
                        </div>
                      )}

                      {isLastInGroup && (
                        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                          {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={() => scrollToBottom(false)}
            className="fixed bottom-24 right-4 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center z-10"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Input */}
      {isClosed ? (
        <div className="p-4 border-t border-border bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">Ce ticket est fermé.</p>
        </div>
      ) : (
        <div className="flex-shrink-0 border-t border-border bg-card p-2"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="flex items-end gap-2">
            {isAgent && (
              <SavedRepliesSheet onSelect={(content) => setInputValue(prev => prev ? prev + '\n' + content : content)} />
            )}
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAgent ? "Répondre au client..." : "Décrivez votre problème..."}
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
              rows={1}
            />
            <Button
              size="icon"
              className="h-10 w-10 flex-shrink-0 rounded-full"
              onClick={handleSend}
              disabled={!inputValue.trim() || sendMessage.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportChatRoom;
