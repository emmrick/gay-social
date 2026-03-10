import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Headphones, ChevronDown, Hash, Send, Info, Coins, Loader2, XCircle, PauseCircle, Bot } from 'lucide-react';
import CreditRequestMessage from '@/components/chat/CreditRequestMessage';
import { useSupportMessages, SupportTicket } from '@/hooks/useSupportTickets';
import { useSupportTypingIndicator } from '@/hooks/useSupportTypingIndicator';
import { notifySupportAgentReply } from '@/services/pushNotificationService';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import SavedRepliesSheet from '@/components/support/SavedRepliesSheet';
import FAQSearchPanel from '@/components/support/FAQSearchPanel';
import EstimatedWaitBanner from '@/components/support/EstimatedWaitBanner';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface SupportChatRoomProps {
  ticket: SupportTicket;
  onBack: () => void;
  isAgent?: boolean;
  hideHeader?: boolean;
}

const formatDateLabel = (date: Date): string => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'd MMMM yyyy', { locale: fr });
};

const formatBoldText = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const SupportChatRoom = ({ ticket: initialTicket, onBack, isAgent = false, hideHeader = false }: SupportChatRoomProps) => {
  const { user } = useAuth();
  
  // Live ticket status to detect closure in real-time
  const { data: liveTicketData } = useQuery({
    queryKey: ['live-support-ticket', initialTicket.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('support_tickets' as any)
        .select('*')
        .eq('id', initialTicket.id)
        .single();
      return data as unknown as SupportTicket;
    },
    refetchInterval: 3000,
  });
  const ticket = liveTicketData || initialTicket;

  const { messages, isLoading, sendMessage } = useSupportMessages(ticket.id);
  const { typingUsers, handleTyping, sendStopTyping } = useSupportTypingIndicator(ticket.id);
  const [inputValue, setInputValue] = useState('');

  // Fetch own profile for typing indicator username
  const { data: ownProfile } = useQuery({
    queryKey: ['own-profile-support', user?.id],
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isInitialLoad = useRef(true);
  const previousMessagesLength = useRef(0);
  const [showManualCreditDialog, setShowManualCreditDialog] = useState(false);
  const [manualCreditAmount, setManualCreditAmount] = useState('');
  const [manualCreditType, setManualCreditType] = useState<'purchased' | 'daily' | 'bonus' | 'passive'>('purchased');
  const [isGrantingCredits, setIsGrantingCredits] = useState(false);
  const [isClosingTicket, setIsClosingTicket] = useState(false);
  const [isHoldingTicket, setIsHoldingTicket] = useState(false);
  const [ratingEmoji, setRatingEmoji] = useState<string | null>(null);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(!!initialTicket.rated_at);
  const globalQueryClient = useQueryClient();
  // Auto-resize input textarea
  useEffect(() => {
    if (inputTextareaRef.current) {
      inputTextareaRef.current.style.height = 'auto';
      const scrollHeight = inputTextareaRef.current.scrollHeight;
      inputTextareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [inputValue]);

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

  // Scroll to bottom when mobile keyboard opens (visualViewport resize)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let prevHeight = vv.height;
    const onResize = () => {
      const newHeight = vv.height;
      // Keyboard opened (viewport shrank)
      if (newHeight < prevHeight - 50) {
        setTimeout(() => scrollToBottom(true), 80);
      }
      prevHeight = newHeight;
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [scrollToBottom]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    sendStopTyping();

    // If client replies to a waiting_client ticket, auto-reopen it
    // The DB trigger trg_create_support_task_on_reopen will auto-create a new mission
    if (!isAgent && ticket.status === 'waiting_client') {
      try {
        // Send system message first
        await supabase
          .from('support_messages' as any)
          .insert({
            ticket_id: ticket.id,
            sender_id: user?.id,
            content: '🔄 Nous vous mettons en relation avec un agent. Merci de patienter...',
            message_type: 'system',
          } as any);

        // Reopen the ticket — the DB trigger handles creating the moderation task
        await supabase
          .from('support_tickets' as any)
          .update({ status: 'open', assigned_to: null } as any)
          .eq('id', ticket.id);

        globalQueryClient.invalidateQueries({ queryKey: ['support-tickets'] });
        globalQueryClient.invalidateQueries({ queryKey: ['live-support-ticket', ticket.id] });
      } catch (err) {
        console.error('Error reopening ticket:', err);
      }
    }

    await sendMessage.mutateAsync({ content: text });

    // If agent is replying, notify the ticket owner
    if (isAgent && ticket.user_id !== user?.id) {
      const senderProfile = senderProfiles?.[user?.id || ''];
      const agentName = senderProfile?.username || 'Un agent';
      notifySupportAgentReply(ticket.user_id, agentName, ticket.ticket_number);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (!isMobile) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  }, []);

  const handleManualCreditGrant = async () => {
    const amount = parseInt(manualCreditAmount, 10);
    if (!amount || amount < 1 || amount > 10000) {
      toast.error('Montant invalide (1 - 10 000)');
      return;
    }
    setIsGrantingCredits(true);
    try {
      const creditTypeLabels: Record<string, string> = {
        purchased: 'Achetés', daily: 'Quotidiens', bonus: 'Bonus', passive: 'Passifs'
      };
      const { error } = await supabase.rpc('add_credits', {
        _user_id: ticket.user_id,
        _amount: amount,
        _credit_type: manualCreditType,
        _transaction_type: 'admin_credit',
        _description: `Attribution manuelle via support - ${amount} crédits (${creditTypeLabels[manualCreditType]})`,
      });
      if (error) throw error;

      // Send confirmation message in the chat
      await sendMessage.mutateAsync({
        content: `✅ ${amount} crédits (${creditTypeLabels[manualCreditType]}) ont été attribués à votre compte.`,
      });

      toast.success(`${amount} crédits attribués !`);
      setShowManualCreditDialog(false);
      setManualCreditAmount('');
      setManualCreditType('purchased');
      globalQueryClient.invalidateQueries({ queryKey: ['user-credits'] });
    } catch (error) {
      console.error('Error granting credits:', error);
      toast.error("Erreur lors de l'attribution des crédits");
    } finally {
      setIsGrantingCredits(false);
    }
  };

  const shouldShowDateSeparator = (index: number): boolean => {
    if (index === 0) return true;
    return !isSameDay(new Date(messages[index].created_at), new Date(messages[index - 1].created_at));
  };

  const handleCloseTicket = async () => {
    setIsClosingTicket(true);
    try {
      await sendMessage.mutateAsync({
        content: '🔒 La conversation a été clôturée par le support.',
        messageType: 'system',
      });
      await supabase
        .from('support_tickets' as any)
        .update({ status: 'closed', closed_at: new Date().toISOString() } as any)
        .eq('id', ticket.id);
      globalQueryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Ticket clôturé');
    } catch {
      toast.error('Erreur lors de la clôture');
    } finally {
      setIsClosingTicket(false);
    }
  };

  const handleHoldTicket = async () => {
    setIsHoldingTicket(true);
    try {
      // Send system message to client
      await sendMessage.mutateAsync({
        content: '⏸️ Votre conversation est en attente. Un agent reprendra votre demande dès que vous répondrez.',
        messageType: 'system',
      });

      // Update ticket status to waiting_client
      await supabase
        .from('support_tickets' as any)
        .update({ status: 'waiting_client', assigned_to: null } as any)
        .eq('id', ticket.id);

      // Get the active task for this agent to complete with half reward
      const { data: activeTask } = await supabase
        .from('moderation_tasks')
        .select('*')
        .eq('reserved_by', user?.id)
        .eq('status', 'reserved')
        .eq('task_type', 'support_chat')
        .maybeSingle();

      if (activeTask) {
        // Complete task with half payment using hold_support_task RPC
        const { data: holdResult } = await supabase.rpc('hold_support_task', {
          _task_id: activeTask.id,
          _user_id: user?.id,
        });

        const result = holdResult as any;
        if (result?.success && result.reward_cents > 0) {
          // Record half earning manually
          const halfCents = result.reward_cents;
          await supabase.from('moderator_earnings').insert({
            user_id: user?.id,
            task_type: 'support_chat',
            amount_cents: halfCents,
            target_entity_id: ticket.id,
            target_user_id: ticket.user_id,
            description: `Support en attente #${ticket.ticket_number} (50%)`,
          } as any);

          // Update wallet
          await supabase.from('moderator_wallets').upsert({
            user_id: user?.id,
            balance_cents: halfCents,
            total_earned_cents: halfCents,
          } as any, { onConflict: 'user_id' });

          // Actually we need to ADD to existing wallet, not upsert with raw value
          // Let's use a raw SQL approach
          const { data: wallet } = await supabase
            .from('moderator_wallets')
            .select('balance_cents, total_earned_cents')
            .eq('user_id', user?.id)
            .maybeSingle();

          if (wallet) {
            await supabase
              .from('moderator_wallets')
              .update({
                balance_cents: wallet.balance_cents + halfCents,
                total_earned_cents: wallet.total_earned_cents + halfCents,
              } as any)
              .eq('user_id', user?.id);
          } else {
            await supabase
              .from('moderator_wallets')
              .insert({
                user_id: user?.id,
                balance_cents: halfCents,
                total_earned_cents: halfCents,
              } as any);
          }

          toast.success(`Conversation mise en attente. +${(halfCents / 100).toFixed(2).replace('.', ',')} € (50%)`);
        } else {
          toast.success('Conversation mise en attente.');
        }
      } else {
        toast.success('Conversation mise en attente.');
      }

      globalQueryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      globalQueryClient.invalidateQueries({ queryKey: ['moderation-task-active'] });
      globalQueryClient.invalidateQueries({ queryKey: ['moderation-tasks-available'] });
      globalQueryClient.invalidateQueries({ queryKey: ['moderator-wallet'] });
      globalQueryClient.invalidateQueries({ queryKey: ['moderator-earnings'] });
    } catch (err) {
      console.error('Error holding ticket:', err);
      toast.error('Erreur lors de la mise en attente');
    } finally {
      setIsHoldingTicket(false);
    }
  };

  // Sync ratingSubmitted when ticket data updates
  useEffect(() => {
    if (ticket.rated_at) setRatingSubmitted(true);
  }, [ticket.rated_at]);

  const handleSubmitRating = async () => {
    if (!ratingEmoji) return;
    setIsSubmittingRating(true);
    try {
      await supabase
        .from('support_tickets' as any)
        .update({
          rating_emoji: ratingEmoji,
          rating_comment: ratingComment.trim() || null,
          rated_at: new Date().toISOString(),
        } as any)
        .eq('id', ticket.id);
      setRatingSubmitted(true);
      globalQueryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      globalQueryClient.invalidateQueries({ queryKey: ['live-support-ticket', ticket.id] });
    } catch {
      toast.error('Erreur lors de l\'envoi de votre avis');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const isClosed = ticket.status === 'closed';
  const isWaitingClient = ticket.status === 'waiting_client';
  const hasRated = ratingSubmitted || !!ticket.rated_at;

  const statusLabel = ticket.status === 'open' ? 'En attente' : ticket.status === 'assigned' ? 'En cours' : ticket.status === 'waiting_client' ? 'En attente client' : 'Fermé';
  const statusColor = ticket.status === 'open' ? 'bg-amber-500/20 text-amber-600' : ticket.status === 'assigned' ? 'bg-green-500/20 text-green-600' : ticket.status === 'waiting_client' ? 'bg-orange-500/20 text-orange-600' : 'bg-muted text-muted-foreground';

  return (
    <div className="flex flex-col h-full min-h-0 bg-background overflow-hidden flex-1">
      {/* Header - hidden when embedded in admin panel */}
      {!hideHeader && (
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
          {isAgent && !isClosed && !isWaitingClient && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setShowManualCreditDialog(true)}
                title="Attribuer des crédits"
              >
                <Coins className="w-5 h-5 text-amber-500" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5 text-xs text-orange-600 border-orange-400/30 hover:bg-orange-500/10"
                onClick={handleHoldTicket}
                disabled={isHoldingTicket}
                title="Mettre en attente du client"
              >
                {isHoldingTicket ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PauseCircle className="w-3.5 h-3.5" />}
                En attente
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleCloseTicket}
                disabled={isClosingTicket}
                title="Clôturer le ticket"
              >
                {isClosingTicket ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Clôturer
              </Button>
            </div>
          )}
        </div>
      </header>
      )}

      {/* Agent action bar when header is hidden (embedded mode) */}
      {hideHeader && isAgent && (
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-card/50">
          <Badge variant="secondary" className={cn("text-[11px] px-2 py-0.5 font-medium", statusColor)}>
            {statusLabel}
          </Badge>
          {!isClosed && !isWaitingClient && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setShowManualCreditDialog(true)}
              >
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                Crédits
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-orange-600 hover:bg-orange-500/10"
                onClick={handleHoldTicket}
                disabled={isHoldingTicket}
              >
                {isHoldingTicket ? <Loader2 className="w-3 h-3 animate-spin" /> : <PauseCircle className="w-3.5 h-3.5" />}
                Attente
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                onClick={handleCloseTicket}
                disabled={isClosingTicket}
              >
                {isClosingTicket ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Clôturer
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Manual Credit Attribution Dialog */}
      <Dialog open={showManualCreditDialog} onOpenChange={setShowManualCreditDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              Attribuer des crédits
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Attribuer des crédits manuellement au client de ce ticket.
            </p>
            <Input
              type="number"
              min="1"
              max="10000"
              placeholder="Nombre de crédits (1 - 10 000)"
              value={manualCreditAmount}
              onChange={(e) => setManualCreditAmount(e.target.value)}
              disabled={isGrantingCredits}
            />
            <div>
              <label className="text-sm font-medium mb-1.5 block">Type de crédits</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'purchased', label: 'Achetés', color: 'bg-sky-400/10 text-sky-600 border-sky-400/30' },
                  { value: 'daily', label: 'Quotidiens', color: 'bg-green-500/10 text-green-600 border-green-500/30' },
                  { value: 'bonus', label: 'Bonus', color: 'bg-blue-700/10 text-blue-700 border-blue-700/30' },
                  { value: 'passive', label: 'Passifs', color: 'bg-amber-400/10 text-amber-600 border-amber-400/30' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setManualCreditType(opt.value)}
                    className={cn(
                      "text-xs font-semibold rounded-full border px-3 py-1.5 transition-all",
                      opt.color,
                      manualCreditType === opt.value ? 'ring-2 ring-primary ring-offset-1' : 'opacity-60'
                    )}
                    disabled={isGrantingCredits}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualCreditDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleManualCreditGrant}
              disabled={isGrantingCredits || !manualCreditAmount}
              className="gap-2"
            >
              {isGrantingCredits ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Attribuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket info banner - hidden when embedded */}
      {!hideHeader && (
        <div className="px-4 py-2 bg-primary/5 border-b border-border">
          <p className="text-xs text-muted-foreground text-center">
            Ticket #{ticket.ticket_number} • {ticket.subject}
          </p>
        </div>
      )}

      {/* Wait time banner for open tickets (client side) */}
      {!isAgent && (ticket.status === 'open') && (
        <EstimatedWaitBanner entityId={ticket.id} className="mx-3 mt-2" />
      )}

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
              const isChatbotBot = message.message_type === 'chatbot_bot';
              const isChatbotUser = message.message_type === 'chatbot_user';
              const isSystem = message.message_type === 'system';
              const showDate = shouldShowDateSeparator(index);
              const senderProfile = senderProfiles?.[message.sender_id];

              // For chatbot messages, determine alignment
              const isRightAligned = isChatbotUser || (isOwn && !isChatbotBot);

              const nextMsg = messages[index + 1];
              const isLastInGroup = !nextMsg ||
                nextMsg.sender_id !== message.sender_id ||
                nextMsg.message_type !== message.message_type ||
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
                    isSystem ? "justify-center" : isRightAligned ? "justify-end" : "justify-start",
                    isLastInGroup ? "mb-2" : "mb-0.5"
                  )}>
                    <div className={cn("max-w-[80%] flex flex-col", isRightAligned ? "items-end" : "items-start")}>
                      {/* Bot label for chatbot messages */}
                      {isChatbotBot && isLastInGroup && (
                        <span className="text-[11px] text-muted-foreground font-medium mb-0.5 px-1 flex items-center gap-1">
                          <Bot className="w-3 h-3" /> Assistant
                        </span>
                      )}

                      {/* Agent label */}
                      {!isOwn && !isChatbotBot && !isChatbotUser && !isSystem && isLastInGroup && senderProfile && (
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
                      ) : isSystem ? (
                        <div className="flex items-start gap-2 px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-2xl border border-border/50 italic max-w-full">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span style={{ wordBreak: 'break-word' }}>{formatBoldText(message.content)}</span>
                        </div>
                      ) : isChatbotBot ? (
                        <div className="px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words bg-muted/60 border border-border/30 text-foreground rounded-2xl rounded-bl-md max-w-full"
                          style={{ wordBreak: 'break-word' }}>
                          {formatBoldText(message.content)}
                        </div>
                      ) : (
                        <div className={cn(
                          "px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
                          isRightAligned
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                            : "bg-card border border-border text-foreground rounded-2xl rounded-bl-md",
                          "max-w-full"
                        )}
                        style={{ wordBreak: 'break-word' }}
                        >
                          {formatBoldText(message.content)}
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

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-start gap-2 px-3 py-1">
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-3 py-2.5 flex items-center gap-2">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {typingUsers.length === 1
                    ? `${typingUsers[0].username} écrit...`
                    : `${typingUsers.length} personnes écrivent...`}
                </span>
              </div>
            </div>
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

      {/* Inline satisfaction survey when closed (user side) */}
      {isClosed && !isAgent && (
        <div className="px-3 py-3 border-t border-border bg-card">
          {!hasRated ? (
            <div className="bg-muted/50 border border-border rounded-2xl p-4 space-y-3">
              <p className="text-sm font-medium text-foreground text-center">Comment évaluez-vous cette assistance ?</p>
              <div className="flex justify-center gap-3">
                {[
                  { emoji: '😡', label: 'Terrible' },
                  { emoji: '😕', label: 'Mauvais' },
                  { emoji: '😐', label: 'Moyen' },
                  { emoji: '😊', label: 'Bien' },
                  { emoji: '😍', label: 'Excellent' },
                ].map((opt) => (
                  <button
                    key={opt.emoji}
                    onClick={() => setRatingEmoji(opt.emoji)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                      ratingEmoji === opt.emoji
                        ? "bg-primary/10 ring-2 ring-primary scale-110"
                        : "hover:bg-muted"
                    )}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-[10px] text-muted-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
              {ratingEmoji && (
                <>
                  <Textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Un commentaire ? (optionnel)"
                    className="min-h-[60px] max-h-[100px] resize-none text-sm"
                    rows={2}
                  />
                  <Button
                    onClick={handleSubmitRating}
                    disabled={isSubmittingRating}
                    className="w-full gap-2"
                    size="sm"
                  >
                    {isSubmittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Envoyer mon avis
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="flex justify-center py-2">
              <span className="text-xs text-muted-foreground bg-muted/80 px-4 py-1.5 rounded-full">
                🔒 Conversation clôturée
              </span>
            </div>
          )}
        </div>
      )}

      {/* Agent sees closed label */}
      {isClosed && isAgent && (
        <div className="flex justify-center py-3 border-t border-border bg-card">
          <span className="text-xs text-muted-foreground bg-muted/80 px-4 py-1.5 rounded-full">
            🔒 Conversation clôturée
          </span>
        </div>
      )}

      {/* Waiting client banner (agent side) */}
      {isWaitingClient && isAgent && (
        <div className="flex justify-center py-3 border-t border-border bg-card">
          <span className="text-xs text-muted-foreground bg-orange-500/10 text-orange-600 px-4 py-1.5 rounded-full">
            ⏸️ En attente de réponse du client
          </span>
        </div>
      )}

      {/* FAQ Search Panel for agents */}
      {isAgent && !isClosed && !isWaitingClient && (
        <FAQSearchPanel onInsertResponse={(text) => setInputValue(prev => prev ? prev + '\n' + text : text)} />
      )}

      {/* Input (only when not closed and not waiting_client for agent) */}
      {!isClosed && !(isAgent && isWaitingClient) && (
        <div className="flex-shrink-0 border-t border-border bg-card p-2"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {isWaitingClient && !isAgent && (
            <p className="text-xs text-orange-600 text-center mb-2">
              ⏸️ Votre conversation est en attente. Répondez pour être mis en relation avec un agent.
            </p>
          )}
          <div className="flex items-end gap-2">
            {isAgent && !isWaitingClient && (
              <SavedRepliesSheet onSelect={(content) => setInputValue(prev => prev ? prev + '\n' + content : content)} />
            )}
            <Textarea
              ref={inputTextareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                handleTyping(e.target.value.length > 0, ownProfile?.username || 'Utilisateur');
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                // Multiple delays to catch keyboard animation on various mobile devices
                setTimeout(() => scrollToBottom(true), 100);
                setTimeout(() => scrollToBottom(true), 300);
                setTimeout(() => scrollToBottom(true), 500);
              }}
              placeholder={isWaitingClient && !isAgent ? "Répondez pour reprendre la conversation..." : isAgent ? "Répondre au client..." : "Décrivez votre problème..."}
              className="min-h-[40px] max-h-[120px] py-[10px] px-4 resize-none text-sm leading-5 rounded-2xl"
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
