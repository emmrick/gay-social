import { useState, useRef, useEffect } from 'react';
import { isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Headphones, Loader2, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useSupportTickets, useSupportMessages } from '@/hooks/useSupportTickets';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import EstimatedWaitBanner from '@/components/support/EstimatedWaitBanner';

const formatDateLabel = (date: Date): string => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'd MMMM yyyy', { locale: fr });
};

const BlockedUserSupportChat = () => {
  const { user } = useAuth();
  const { tickets, isLoading: ticketsLoading, createTicket } = useSupportTickets();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Find or use existing open ticket about suspension
  useEffect(() => {
    if (tickets.length > 0 && !activeTicketId) {
      const openTicket = tickets.find(t => t.status === 'open' || t.status === 'waiting_client');
      if (openTicket) {
        setActiveTicketId(openTicket.id);
      }
    }
  }, [tickets, activeTicketId]);

  const { messages, isLoading: messagesLoading, sendMessage } = useSupportMessages(activeTicketId);

  // Fetch sender profiles
  const senderIds = [...new Set(messages.map(m => m.sender_id))];
  const { data: senderProfiles } = useQuery({
    queryKey: ['blocked-support-profiles', senderIds.join(',')],
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

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
    }
  }, [inputValue]);

  const handleStartChat = async () => {
    if (activeTicketId) {
      setIsOpen(true);
      return;
    }
    try {
      const ticket = await createTicket.mutateAsync('Demande de déblocage de compte');
      setActiveTicketId(ticket.id);
      // Send automatic first message
      setTimeout(async () => {
        await supabase.from('support_messages' as any).insert({
          ticket_id: ticket.id,
          sender_id: user?.id,
          content: 'Bonjour, mon compte a été suspendu/bloqué et je souhaite obtenir des explications ou demander un déblocage.',
          message_type: 'text',
        } as any);
      }, 500);
      setIsOpen(true);
    } catch {
      // error handled by hook
    }
  };

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || !activeTicketId) return;
    setInputValue('');
    try {
      await sendMessage.mutateAsync({ content });
    } catch {
      // error handled
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isAgentMessage = (senderId: string) => senderId !== user?.id;

  return (
    <>
      {/* Chat button */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={handleStartChat}
            disabled={createTicket.isPending}
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            size="icon"
          >
            {createTicket.isPending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <MessageCircle className="w-6 h-6" />
            )}
          </Button>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full animate-pulse" />
        </motion.div>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-4 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[520px] z-50 flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5" />
                <div>
                  <p className="text-sm font-semibold">Service client</p>
                  <p className="text-[10px] opacity-80">Assistance compte suspendu</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Wait time banner */}
            {activeTicketId && (
              <EstimatedWaitBanner entityId={activeTicketId} />
            )}

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {/* Welcome message */}
              {messages.length === 0 && !messagesLoading && (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Headphones className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Bienvenue au support</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Un agent va prendre en charge votre demande. Veuillez patienter.
                    </p>
                  </div>
                </div>
              )}

              {messagesLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {messages.map((msg, index) => {
                const isAgent = isAgentMessage(msg.sender_id);
                const senderProfile = senderProfiles?.[msg.sender_id];
                const showDate = index === 0 || 
                  !isSameDay(new Date(messages[index - 1].created_at), new Date(msg.created_at));

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-2">
                        <span className="text-[10px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                          {formatDateLabel(new Date(msg.created_at))}
                        </span>
                      </div>
                    )}
                    
                    {msg.message_type === 'system' ? (
                      <div className="flex justify-center">
                        <span className="text-[10px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full italic">
                          {msg.content}
                        </span>
                      </div>
                    ) : (
                      <div className={cn("flex gap-2", isAgent ? "justify-start" : "justify-end")}>
                        {isAgent && (
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                            <Headphones className="w-3.5 h-3.5 text-primary" />
                          </div>
                        )}
                        <div className={cn(
                          "max-w-[75%] px-3 py-2 rounded-2xl text-sm",
                          isAgent
                            ? "bg-secondary text-secondary-foreground rounded-bl-md"
                            : "bg-primary text-primary-foreground rounded-br-md"
                        )}>
                          {isAgent && senderProfile && (
                            <p className="text-[10px] font-medium text-primary mb-0.5">
                              {senderProfile.username}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={cn(
                            "text-[9px] mt-1",
                            isAgent ? "text-muted-foreground" : "text-primary-foreground/60"
                          )}>
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrivez votre message..."
                  className="min-h-[40px] max-h-[100px] resize-none text-sm rounded-xl"
                  rows={1}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-xl flex-shrink-0"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sendMessage.isPending}
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BlockedUserSupportChat;
