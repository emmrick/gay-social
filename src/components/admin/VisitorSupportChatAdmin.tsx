import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Headset, Send, User, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VisitorSupportChatAdminProps {
  sessionId: string;
  visitorName: string;
  visitorEmail?: string;
  onBack: () => void;
  onComplete: () => void;
}

interface VisitorMessage {
  id: string;
  session_id: string;
  sender_type: string;
  sender_id: string | null;
  content: string;
  created_at: string;
}

const formatDateLabel = (date: Date): string => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'd MMMM yyyy', { locale: fr });
};

const VisitorSupportChatAdmin = ({ sessionId, visitorName, visitorEmail, onBack, onComplete }: VisitorSupportChatAdminProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const welcomeSentRef = useRef(false);

  // Fetch moderator profile
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

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['visitor-support-messages-admin', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitor_support_messages' as any)
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as VisitorMessage[];
    },
    enabled: !!sessionId,
  });

  // Send welcome message on mount
  useEffect(() => {
    if (!sessionId || !moderatorProfile?.username || welcomeSentRef.current) return;
    welcomeSentRef.current = true;

    const sendWelcome = async () => {
      await supabase
        .from('visitor_support_messages' as any)
        .insert({
          session_id: sessionId,
          sender_type: 'agent',
          sender_id: user?.id,
          content: `**${moderatorProfile.username}** a rejoint la conversation. Comment puis-je vous aider ? 🙏`,
        });
    };
    sendWelcome();
  }, [sessionId, moderatorProfile?.username, user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`visitor-support-admin-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'visitor_support_messages',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['visitor-support-messages-admin', sessionId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, queryClient]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [newMessage]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !sessionId || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      await supabase
        .from('visitor_support_messages' as any)
        .insert({
          session_id: sessionId,
          sender_type: 'agent',
          sender_id: user?.id,
          content,
        });
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  }, [newMessage, sessionId, sending, user?.id]);

  const handleClose = async () => {
    setClosing(true);
    try {
      await supabase
        .from('visitor_support_messages' as any)
        .insert({
          session_id: sessionId,
          sender_type: 'system',
          content: 'La conversation a été clôturée par le support. Merci de nous avoir contactés !',
        });

      await supabase
        .from('visitor_support_sessions' as any)
        .update({ status: 'closed', closed_at: new Date().toISOString() } as any)
        .eq('id', sessionId);

      toast.success('Session visiteur clôturée');
      onComplete();
    } catch (err) {
      console.error('Error closing session:', err);
      toast.error('Erreur lors de la clôture');
    } finally {
      setClosing(false);
    }
  };

  // Group messages by date
  let lastDateLabel = '';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground truncate">{visitorName}</p>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">Visiteur</Badge>
            </div>
            {visitorEmail && (
              <p className="text-[11px] text-muted-foreground truncate">{visitorEmail}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={closing}
            className="gap-1.5 text-xs"
          >
            {closing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Clôturer
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map((msg) => {
            const msgDate = new Date(msg.created_at);
            const dateLabel = formatDateLabel(msgDate);
            const showDateSeparator = dateLabel !== lastDateLabel;
            if (showDateSeparator) lastDateLabel = dateLabel;

            const isAgent = msg.sender_type === 'agent';
            const isSystem = msg.sender_type === 'system';

            return (
              <div key={msg.id}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center py-2">
                    <span className="text-[10px] text-muted-foreground bg-muted/50 px-3 py-0.5 rounded-full">
                      {dateLabel}
                    </span>
                  </div>
                )}
                <div className={cn('flex gap-2 mb-1', isAgent && 'justify-end')}>
                  {!isAgent && !isSystem && (
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                  )}
                  {isSystem && (
                    <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Headset className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
                    isAgent
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : isSystem
                      ? 'bg-secondary/70 text-foreground rounded-tl-sm border border-border/30 italic'
                      : 'bg-secondary/70 text-foreground rounded-tl-sm border border-border/30'
                  )}>
                    {msg.content.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                      part.startsWith('**') && part.endsWith('**')
                        ? <strong key={i}>{part.slice(2, -2)}</strong>
                        : part
                    )}
                    <div className={cn(
                      'text-[9px] mt-1',
                      isAgent ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'
                    )}>
                      {format(msgDate, 'HH:mm')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2 items-end"
        >
          <Textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Répondre au visiteur..."
            className="flex-1 text-[13px] min-h-[40px] max-h-[120px] resize-none rounded-xl"
            rows={1}
            maxLength={1000}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 rounded-xl flex-shrink-0"
            disabled={!newMessage.trim() || sending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default VisitorSupportChatAdmin;
