import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, ChevronDown, Headphones, HelpCircle, X, ArrowLeft, Send, Bot, Loader2, Star, XCircle, BookOpen, MessageCircle, Shield, CreditCard, Users, Settings, Sparkles, LifeBuoy, Headset, MessageSquareText } from 'lucide-react';
import { playNotificationSoundStandalone } from '@/hooks/useNotificationSound';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useFAQArticles } from '@/hooks/useFAQ';
import { useSupportTickets, useSupportMessages, SupportTicket } from '@/hooks/useSupportTickets';
import { useSupportTypingIndicator } from '@/hooks/useSupportTypingIndicator';
import SupportChatRoom from '@/components/support/SupportChatRoom';

import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

import { toast } from 'sonner';

type ChatPhase = 'idle' | 'chatbot' | 'waiting_agent' | 'agent' | 'rating';

interface ChatMessage {
  type: 'bot' | 'user' | 'system';
  text: string;
}

interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const RATING_EMOJIS = [
  { emoji: '😡', label: 'Très insatisfait' },
  { emoji: '😕', label: 'Insatisfait' },
  { emoji: '😐', label: 'Neutre' },
  { emoji: '😊', label: 'Satisfait' },
  { emoji: '🤩', label: 'Très satisfait' },
];

// Simple bold text renderer: converts **text** to <strong>text</strong>
const BoldText = ({ text }: { text: string }) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

interface HelpProps {
  embedded?: boolean;
}

const Help = ({ embedded = false }: HelpProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [chatPhase, setChatPhase] = useState<ChatPhase>('idle');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiHistory, setAiHistory] = useState<AIChatMessage[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [freeText, setFreeText] = useState('');
  const [ratingEmoji, setRatingEmoji] = useState<string | null>(null);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasCheckedActiveTicket, setHasCheckedActiveTicket] = useState(false);
  const [showEscalationButton, setShowEscalationButton] = useState(false);
  
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const freeTextRef = useRef<HTMLTextAreaElement>(null);
  const agentJoinedRef = useRef(false);
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Auto-resize freeText textarea
  useEffect(() => {
    if (freeTextRef.current) {
      freeTextRef.current.style.height = 'auto';
      const scrollHeight = freeTextRef.current.scrollHeight;
      freeTextRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [freeText]);

  // Auto-resume active ticket on mount
  const { tickets, isLoading: ticketsLoading, createTicket, closeTicket } = useSupportTickets();
  useEffect(() => {
    if (hasCheckedActiveTicket || !user?.id || ticketsLoading) return;
    setHasCheckedActiveTicket(true);
    
    const activeTicket = tickets.find(t => t.status === 'open' || t.status === 'assigned');
    if (activeTicket) {
      setSelectedTicket(activeTicket);
      agentJoinedRef.current = activeTicket.status === 'assigned';
      setChatPhase(activeTicket.status === 'assigned' ? 'agent' : 'waiting_agent');
    }
  }, [tickets, user?.id, hasCheckedActiveTicket, ticketsLoading]);

  const { data: faqArticles = [], isLoading: faqLoading } = useFAQArticles(searchQuery);

  // Fetch user profile for personalized greeting
  const { data: userProfile } = useQuery({
    queryKey: ['own-profile-help', user?.id],
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

  // Listen for agent messages on the active ticket
  const { messages: ticketMessages } = useSupportMessages(selectedTicket?.id ?? null);
  const { typingUsers: agentTypingUsers } = useSupportTypingIndicator(selectedTicket?.id ?? null);

  // Fetch agent profile when ticket gets assigned
  const { data: agentProfile } = useQuery({
    queryKey: ['agent-profile', selectedTicket?.assigned_to],
    queryFn: async () => {
      if (!selectedTicket?.assigned_to) return null;
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', selectedTicket.assigned_to)
        .single();
      return data;
    },
    enabled: !!selectedTicket?.assigned_to,
  });

  // Poll ticket status for assignment changes
  const { data: liveTicket } = useQuery({
    queryKey: ['live-ticket-status', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket?.id) return null;
      const { data } = await supabase
        .from('support_tickets' as any)
        .select('*')
        .eq('id', selectedTicket.id)
        .single();
      return data as unknown as SupportTicket;
    },
    enabled: !!selectedTicket?.id,
    refetchInterval: (chatPhase === 'waiting_agent' || chatPhase === 'agent') ? 3000 : 10000,
  });

  // Detect when agent joins or closes
  useEffect(() => {
    if (!liveTicket) return;

    if (liveTicket.status === 'assigned' && chatPhase === 'waiting_agent' && !agentJoinedRef.current) {
      agentJoinedRef.current = true;
      setChatPhase('agent');
      setSelectedTicket(liveTicket);
    }

    if (liveTicket.status === 'closed' && (chatPhase === 'agent' || chatPhase === 'waiting_agent')) {
      setChatPhase('rating');
      setSelectedTicket(liveTicket);
    }
  }, [liveTicket?.status, liveTicket?.assigned_to, chatPhase]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, ticketMessages.length, chatPhase, agentTypingUsers.length, isBotTyping]);

  const handleStartChat = () => {
    setChatPhase('chatbot');
    setAiHistory([]);
    setShowEscalationButton(false);
    agentJoinedRef.current = false;
    const displayName = userProfile?.username || 'cher utilisateur';
    setChatMessages([
      { type: 'bot', text: `Bonjour **${displayName}** ! 👋 Je suis l'assistant **Gay Connect**. Pose-moi ta question et je ferai de mon mieux pour t'aider.` },
      { type: 'bot', text: 'Tu peux me demander des infos sur les **crédits**, la **vérification d\'identité**, les **messages**, la **sécurité**, ou toute autre fonctionnalité du site !' },
    ]);
  };

  // Send message to AI chatbot
  const handleSendToAI = useCallback(async () => {
    if (!freeText.trim() || isBotTyping) return;
    const userMsg = freeText.trim();
    setFreeText('');

    // Add user message to chat
    setChatMessages(prev => [...prev, { type: 'user', text: userMsg }]);

    // Build AI history
    const newHistory: AIChatMessage[] = [...aiHistory, { role: 'user', content: userMsg }];
    setAiHistory(newHistory);
    setIsBotTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('help-chat', {
        body: {
          messages: newHistory,
          username: userProfile?.username || undefined,
        },
      });

      if (error) throw error;

      const reply = data.reply || "Désolé, je n'ai pas pu répondre. **Contacte un agent** pour plus d'aide.";
      const needsEscalation = data.needsEscalation || false;

      setChatMessages(prev => [...prev, { type: 'bot', text: reply }]);
      setAiHistory(prev => [...prev, { role: 'assistant', content: reply }]);

      if (needsEscalation) {
        setShowEscalationButton(true);
      }

      playNotificationSoundStandalone();
    } catch (err: any) {
      console.error('AI chat error:', err);
      
      let errorMsg = "Désolé, je rencontre un **problème technique**. Tu peux **contacter un agent** du support.";
      if (err?.message?.includes('429')) {
        errorMsg = "Trop de messages envoyés trop rapidement. **Patiente quelques secondes** puis réessaie.";
      } else if (err?.message?.includes('402')) {
        errorMsg = "Le service est temporairement **indisponible**. Tu peux **contacter un agent** du support.";
      }

      setChatMessages(prev => [...prev, { type: 'bot', text: errorMsg }]);
      setShowEscalationButton(true);
    } finally {
      setIsBotTyping(false);
    }
  }, [freeText, aiHistory, isBotTyping, userProfile?.username]);

  const handleContactAgent = async () => {
    if (!user) { navigate('/auth'); return; }
    try {
      setChatMessages(prev => [
        ...prev,
        { type: 'system' as const, text: 'Nous vous mettons en relation avec le prochain agent disponible. Merci de patienter...' },
      ]);
      setChatPhase('waiting_agent');

      const history = chatMessages.map(m => ({ type: m.type, text: m.text }));
      const ticket = await createTicket.mutateAsync("Demande d'assistance");

      await supabase
        .from('support_tickets' as any)
        .update({ chatbot_history: history } as any)
        .eq('id', ticket.id);

      // Insert chatbot messages into support_messages
      const chatbotMessagesToInsert = chatMessages.map((msg) => ({
        ticket_id: ticket.id,
        sender_id: user.id,
        content: msg.text,
        message_type: msg.type === 'user' ? 'chatbot_user' : msg.type === 'system' ? 'system' : 'chatbot_bot',
      }));

      if (chatbotMessagesToInsert.length > 0) {
        await supabase
          .from('support_messages' as any)
          .insert(chatbotMessagesToInsert as any);
      }

      setSelectedTicket(ticket);
    } catch {
      setChatPhase('chatbot');
    }
  };

  const handleGoBack = () => {
    setChatPhase('idle');
    setChatMessages([]);
    setAiHistory([]);
    setFreeText('');
    setShowEscalationButton(false);
    if (selectedTicket && (selectedTicket.status === 'open' || selectedTicket.status === 'assigned' || liveTicket?.status === 'open' || liveTicket?.status === 'assigned')) {
      // Keep selectedTicket so we can resume
    } else {
      setSelectedTicket(null);
    }
    agentJoinedRef.current = false;
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket?.id) return;
    try {
      await closeTicket.mutateAsync(selectedTicket.id);
      setChatPhase('rating');
    } catch {
      // Error handled by mutation
    }
  };

  const handleEndChat = () => {
    setChatPhase('idle');
    setChatMessages([]);
    setAiHistory([]);
    setFreeText('');
    setSelectedTicket(null);
    setShowEscalationButton(false);
    agentJoinedRef.current = false;
    setRatingEmoji(null);
    setRatingComment('');
  };

  // Send message to agent (in agent phase)
  const handleSendToAgent = useCallback(async () => {
    if (!freeText.trim() || !selectedTicket?.id || !user?.id) return;
    const text = freeText.trim();
    setFreeText('');
    await supabase
      .from('support_messages' as any)
      .insert({ ticket_id: selectedTicket.id, sender_id: user.id, content: text, message_type: 'text' } as any);
  }, [freeText, selectedTicket?.id, user?.id]);

  const handleSubmitRating = async () => {
    if (!ratingEmoji || !selectedTicket?.id) return;
    setIsSubmittingRating(true);
    try {
      await supabase
        .from('support_tickets' as any)
        .update({
          rating_emoji: ratingEmoji,
          rating_comment: ratingComment.trim() || null,
          rated_at: new Date().toISOString(),
        } as any)
        .eq('id', selectedTicket.id);
      toast.success('Merci pour votre avis !');
      handleEndChat();
    } catch {
      toast.error("Erreur lors de l'envoi de l'avis");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Grouped FAQ
  const groupedFAQ = faqArticles.reduce((acc, article) => {
    if (!acc[article.category]) acc[article.category] = [];
    acc[article.category].push(article);
    return acc;
  }, {} as Record<string, typeof faqArticles>);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Centre d'aide</h2>
          <p className="text-muted-foreground mb-4">Connectez-vous pour accéder au centre d'aide.</p>
          <Button onClick={() => navigate('/auth')}>Se connecter</Button>
        </Card>
      </div>
    );
  }

  // ============ RATING PHASE ============
  if (chatPhase === 'rating') {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex flex-col">
        <div
          className="border-b border-border bg-background/95 backdrop-blur-lg flex items-center gap-3 px-3 py-2.5"
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}
        >
          <Button variant="ghost" size="icon" onClick={handleEndChat} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-sm">Votre avis</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Star className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">Comment s'est passée votre conversation ?</h2>
            <p className="text-sm text-muted-foreground">Votre avis nous aide à améliorer notre service.</p>
          </div>

          <div className="flex gap-3">
            {RATING_EMOJIS.map((r) => (
              <button
                key={r.emoji}
                onClick={() => setRatingEmoji(r.emoji)}
                className={cn(
                  "w-14 h-14 text-2xl rounded-2xl border-2 transition-all flex items-center justify-center hover:scale-110 active:scale-95",
                  ratingEmoji === r.emoji
                    ? "border-primary bg-primary/10 scale-110 shadow-md"
                    : "border-border bg-background"
                )}
                title={r.label}
              >
                {r.emoji}
              </button>
            ))}
          </div>

          {ratingEmoji && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm space-y-3"
            >
              <p className="text-sm text-muted-foreground">Un commentaire ? (optionnel)</p>
              <Textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Dites-nous en plus..."
                className="resize-none"
                rows={3}
              />
              <Button
                onClick={handleSubmitRating}
                disabled={isSubmittingRating}
                className="w-full h-12 rounded-full font-semibold gap-2"
              >
                {isSubmittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Envoyer mon avis
              </Button>
            </motion.div>
          )}

          <Button variant="ghost" size="sm" onClick={handleEndChat} className="text-muted-foreground">
            Passer
          </Button>
        </div>
      </div>
    );
  }

  // ============ CHAT PHASES (chatbot, waiting_agent, agent) ============
  if (chatPhase !== 'idle') {
    const isAgentPhase = chatPhase === 'agent';
    const isWaiting = chatPhase === 'waiting_agent';
    const isChatbotPhase = chatPhase === 'chatbot';

    return (
      <div className="fixed inset-0 z-[60] bg-background flex flex-col">
        {/* Header */}
        <div
          className="border-b border-border bg-background/95 backdrop-blur-lg flex items-center gap-3 px-3 py-2.5"
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}
        >
          <Button variant="ghost" size="icon" onClick={handleGoBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {isAgentPhase && agentProfile ? (
              <>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                  {agentProfile.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-sm truncate block">{agentProfile.username}</span>
                  <span className="text-[11px] text-green-500">En ligne</span>
                </div>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-sm truncate block">Assistant Gay Connect</span>
                  <span className="text-[11px] text-green-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    IA • En ligne
                  </span>
                </div>
              </>
            )}
          </div>
          {(isAgentPhase || isWaiting) ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCloseTicket} 
              disabled={closeTicket.isPending}
              className="text-xs shrink-0 rounded-full gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              {closeTicket.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Clôturer
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleGoBack} className="text-xs shrink-0 rounded-full">
              Fermer
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
            {/* Chatbot messages (AI phase) */}
            {isChatbotPhase && chatMessages.map((msg, i) => (
              <motion.div
                key={`chat-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex items-end gap-2",
                  msg.type === 'user' ? "justify-end" : msg.type === 'system' ? "justify-center" : "justify-start"
                )}
              >
                {msg.type === 'system' ? (
                  <div className="bg-muted/60 text-muted-foreground text-xs px-4 py-2 rounded-full text-center max-w-[85%]">
                    <BoldText text={msg.text} />
                  </div>
                ) : (
                  <>
                    {msg.type === 'bot' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-0.5">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.type === 'user'
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}>
                      <p className="whitespace-pre-line"><BoldText text={msg.text} /></p>
                    </div>
                  </>
                )}
              </motion.div>
            ))}

            {/* Bot typing indicator */}
            {isBotTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end gap-2 justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-[10px] text-muted-foreground ml-1.5">en train de réfléchir...</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Escalation button (shown when AI suggests contacting an agent) */}
            {isChatbotPhase && showEscalationButton && !isBotTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-end gap-2"
              >
                <div className="w-8 h-8 shrink-0" />
                <div className="flex-1 space-y-1.5 max-w-[80%]">
                  <button
                    onClick={handleContactAgent}
                    disabled={createTicket.isPending}
                    className="w-full text-left px-4 py-3 text-sm font-medium rounded-2xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors active:scale-[0.98] flex items-center gap-2"
                  >
                    <Headphones className="w-4 h-4 shrink-0" />
                    {createTicket.isPending ? 'Connexion...' : 'Contacter un agent du support'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* All messages from support_messages (agent phase) */}
            {(isAgentPhase || isWaiting) && ticketMessages
              .filter(m => m.message_type !== 'credit_request')
              .map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                const isSystem = msg.message_type === 'system';
                const isChatbotBot = msg.message_type === 'chatbot_bot';
                const isChatbotUser = msg.message_type === 'chatbot_user';
                const isAgentMessage = !isOwn && !isChatbotBot && !isChatbotUser && !isSystem;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex items-end gap-2",
                      isSystem ? "justify-center" : (isChatbotUser || isOwn) && !isChatbotBot ? "justify-end" : "justify-start"
                    )}
                  >
                    {isSystem ? (
                      <div className="bg-muted/60 text-muted-foreground text-xs px-4 py-2 rounded-full text-center max-w-[85%]">
                        <BoldText text={msg.content} />
                      </div>
                    ) : (
                      <>
                        {isChatbotBot && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-0.5">
                            <Bot className="w-3.5 h-3.5 text-primary" />
                          </div>
                        )}
                        {isAgentMessage && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-0.5 text-xs font-bold text-primary">
                            {agentProfile?.username?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                          (isChatbotUser || isOwn) && !isChatbotBot
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        )}>
                          <p className="whitespace-pre-line break-words"><BoldText text={msg.content} /></p>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}

            {/* Agent typing indicator */}
            {(isAgentPhase || isWaiting) && agentTypingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end gap-2 justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-0.5 text-xs font-bold text-primary">
                  {agentProfile?.username?.charAt(0)?.toUpperCase() || <Headset className="w-3.5 h-3.5" />}
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={scrollEndRef} />
          </div>
        </div>

        {/* Bottom input */}
        <div
          className="border-t border-border bg-background px-4 py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {isWaiting && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs mb-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Recherche d'un agent disponible...</span>
            </div>
          )}
          {isChatbotPhase && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-[11px] mb-2">
              <Sparkles className="w-3 h-3 text-primary/60" />
              <span>Réponses générées par IA • Pose ta question librement</span>
            </div>
          )}
          <div className="max-w-lg mx-auto flex items-end gap-2">
            <Textarea
              ref={freeTextRef}
              placeholder={isChatbotPhase ? "Pose ta question ici..." : (isAgentPhase || isWaiting) ? "Écrivez votre message..." : "..."}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                  if (!isMobile) {
                    e.preventDefault();
                    if (isChatbotPhase) {
                      handleSendToAI();
                    } else {
                      handleSendToAgent();
                    }
                  }
                }
              }}
              className="flex-1 rounded-2xl bg-muted border-0 min-h-[40px] max-h-[120px] py-[10px] px-4 resize-none text-sm leading-5"
              rows={1}
              disabled={isBotTyping}
            />
            <Button
              size="icon"
              variant={freeText.trim() ? "default" : "ghost"}
              onClick={isChatbotPhase ? handleSendToAI : handleSendToAgent}
              disabled={!freeText.trim() || isBotTyping}
              className="rounded-full w-11 h-11 shrink-0"
            >
              {isBotTyping ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <Send className="w-4.5 h-4.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Category icon mapping
  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('compte') || lower.includes('profil')) return <Users className="w-4 h-4" />;
    if (lower.includes('crédit') || lower.includes('paiement') || lower.includes('achat')) return <CreditCard className="w-4 h-4" />;
    if (lower.includes('sécu') || lower.includes('confiden') || lower.includes('privacy')) return <Shield className="w-4 h-4" />;
    if (lower.includes('message') || lower.includes('chat') || lower.includes('conversation')) return <MessageCircle className="w-4 h-4" />;
    if (lower.includes('param') || lower.includes('config') || lower.includes('réglage')) return <Settings className="w-4 h-4" />;
    if (lower.includes('crédit') || lower.includes('abonn')) return <Sparkles className="w-4 h-4" />;
    return <BookOpen className="w-4 h-4" />;
  };

  // ============ DEFAULT: FAQ page ============
  return (
    <div className={cn("bg-background flex flex-col", embedded ? "flex-1" : "min-h-dvh")}>
      {/* Modern Header */}
      <div
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="px-4 pb-3 flex items-center gap-3">
          {!embedded && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold tracking-tight">Centre d'aide</h1>
            <p className="text-xs text-muted-foreground">Trouvez rapidement des réponses</p>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              placeholder="Rechercher un sujet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl bg-muted/50 border-0 h-11 focus-visible:ring-1 focus-visible:ring-primary/30 placeholder:text-muted-foreground/50"
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full" onClick={() => setSearchQuery('')}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5 pb-28">
            {/* Resume active conversation banner */}
            {!searchQuery && selectedTicket && (selectedTicket.status === 'open' || selectedTicket.status === 'assigned' || liveTicket?.status === 'open' || liveTicket?.status === 'assigned') && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button
                  onClick={() => {
                    const currentStatus = liveTicket?.status || selectedTicket.status;
                    agentJoinedRef.current = currentStatus === 'assigned';
                    setChatPhase(currentStatus === 'assigned' ? 'agent' : 'waiting_agent');
                    if (liveTicket) setSelectedTicket(liveTicket);
                  }}
                  className="w-full rounded-2xl bg-primary/10 border border-primary/20 p-4 text-left transition-all hover:bg-primary/15 active:scale-[0.98] flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Headphones className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">Conversation en cours</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Reprendre votre échange avec le support</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </button>
              </motion.div>
            )}

            {/* Quick action - single prominent card */}
            {!searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={handleStartChat}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 p-5 text-left transition-all hover:from-primary/15 hover:to-accent/15 active:scale-[0.98] w-full"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base text-foreground">Discuter avec l'assistant IA</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Pose ta question, il te répondra instantanément !</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Crédits', 'Vérification', 'Messages', 'Sécurité', 'Profil'].map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-full bg-background/80 text-[11px] font-medium text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              </motion.div>
            )}

            {/* FAQ articles */}
            {faqArticles.length === 0 && !faqLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {searchQuery ? 'Aucun résultat trouvé' : 'FAQ bientôt disponible'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  {searchQuery ? 'Essayez avec d\'autres mots-clés ou demandez à l\'assistant.' : 'Les articles d\'aide seront bientôt disponibles.'}
                </p>
                {searchQuery && (
                  <Button variant="outline" size="sm" onClick={handleStartChat} className="mt-4 gap-2 rounded-full">
                    <Bot className="w-4 h-4" />
                    Demander à l'assistant
                  </Button>
                )}
              </motion.div>
            ) : (
              Object.entries(groupedFAQ).map(([category, articles], catIndex) => (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: catIndex * 0.05 }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {getCategoryIcon(category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-sm capitalize truncate">{category}</h2>
                      <p className="text-[11px] text-muted-foreground">{articles.length} article{articles.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <div className="space-y-2 ml-0.5">
                    {articles.map((article, artIndex) => (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: catIndex * 0.05 + artIndex * 0.03 }}
                      >
                        <button
                          className={cn(
                            "w-full text-left rounded-xl border border-border/50 bg-card overflow-hidden transition-all",
                            "hover:border-primary/20 hover:shadow-sm active:scale-[0.995]",
                            expandedFAQ === article.id && "border-primary/30 shadow-sm bg-primary/[0.02]"
                          )}
                          onClick={() => setExpandedFAQ(expandedFAQ === article.id ? null : article.id)}
                        >
                          <div className="px-4 py-3.5 flex items-center gap-3">
                            <p className="font-medium text-sm flex-1 leading-snug">{article.question}</p>
                            <motion.div
                              animate={{ rotate: expandedFAQ === article.id ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="shrink-0"
                            >
                              <ChevronDown className="w-4 h-4 text-muted-foreground/60" />
                            </motion.div>
                          </div>
                        </button>
                        <AnimatePresence>
                          {expandedFAQ === article.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 py-3 ml-0 border-l-2 border-primary/30 ml-4 mt-1 mb-2">
                                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{article.answer}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))
            )}

            {/* Bottom help nudge */}
            {faqArticles.length > 0 && !searchQuery && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center pt-4 pb-2"
              >
                <p className="text-xs text-muted-foreground mb-2">Vous n'avez pas trouvé votre réponse ?</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartChat}
                  className="gap-2 rounded-full border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Bot className="w-4 h-4" />
                  Parler à l'assistant IA
                </Button>
              </motion.div>
            )}
          </div>
      </ScrollArea>

      {/* Floating chat bubble */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
        onClick={handleStartChat}
        className={cn(
          "fixed right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center",
          embedded ? "bottom-28" : "bottom-20"
        )}
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Démarrer le chat"
      >
        <Bot className="w-6 h-6" />
      </motion.button>
    </div>
  );
};

export default Help;
