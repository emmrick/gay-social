import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, Headphones, HelpCircle, X, ArrowLeft, Send, Bot, Loader2, Star, XCircle } from 'lucide-react';
import { playNotificationSoundStandalone } from '@/hooks/useNotificationSound';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useFAQArticles, useHelpChatbotNodes, type HelpChatbotNode } from '@/hooks/useFAQ';
import { useSupportTickets, useSupportMessages, SupportTicket } from '@/hooks/useSupportTickets';
import SupportTicketList from '@/components/support/SupportTicketList';
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

const RATING_EMOJIS = [
  { emoji: '😡', label: 'Très insatisfait' },
  { emoji: '😕', label: 'Insatisfait' },
  { emoji: '😐', label: 'Neutre' },
  { emoji: '😊', label: 'Satisfait' },
  { emoji: '🤩', label: 'Très satisfait' },
];

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
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [nodeHistory, setNodeHistory] = useState<(string | null)[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTickets, setShowTickets] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [ratingEmoji, setRatingEmoji] = useState<string | null>(null);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const agentJoinedRef = useRef(false);

  const { data: faqArticles = [], isLoading: faqLoading } = useFAQArticles(searchQuery);
  const { data: rootNodes = [] } = useHelpChatbotNodes(undefined);
  const { data: childNodes = [] } = useHelpChatbotNodes(currentNodeId);
  const { createTicket, closeTicket } = useSupportTickets();

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
    enabled: !!selectedTicket?.id && (chatPhase === 'waiting_agent' || chatPhase === 'agent'),
    refetchInterval: 3000,
  });

  // Detect when agent joins or closes
  useEffect(() => {
    if (!liveTicket) return;

    if (liveTicket.status === 'assigned' && chatPhase === 'waiting_agent' && !agentJoinedRef.current) {
      agentJoinedRef.current = true;
      setChatPhase('agent');
      setSelectedTicket(liveTicket);
    }

    // Agent closed the ticket -> show rating
    if (liveTicket.status === 'closed' && (chatPhase === 'agent' || chatPhase === 'waiting_agent')) {
      setChatPhase('rating');
      setSelectedTicket(liveTicket);
    }
  }, [liveTicket?.status, liveTicket?.assigned_to, chatPhase]);

  const currentOptions = currentNodeId ? childNodes : rootNodes;

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, currentOptions.length, ticketMessages.length, chatPhase]);

  const handleStartChat = () => {
    setChatPhase('chatbot');
    setCurrentNodeId(null);
    setNodeHistory([]);
    agentJoinedRef.current = false;
    const displayName = userProfile?.username || 'cher utilisateur';
    setChatMessages([
      { type: 'bot', text: `Bonjour ${displayName} ! 👋 Merci de contacter l'assistance. Nous sommes là pour vous aider.` },
      { type: 'bot', text: 'Comment pouvons-nous vous aider aujourd\'hui ? Sélectionnez une option ci-dessous.' },
    ]);
    playNotificationSoundStandalone();
  };

  const handleSelectOption = (node: HelpChatbotNode) => {
    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { type: 'user', text: node.label },
    ];
    if (node.response_text) {
      newMessages.push({ type: 'bot', text: node.response_text });
      playNotificationSoundStandalone();
    }
    setChatMessages(newMessages);
    setNodeHistory(prev => [...prev, currentNodeId]);
    setCurrentNodeId(node.id);
  };

  const handleGoBackInChat = () => {
    if (nodeHistory.length === 0) return;
    const previousNodeId = nodeHistory[nodeHistory.length - 1];
    setNodeHistory(prev => prev.slice(0, -1));
    setChatMessages(prev => [
      ...prev,
      { type: 'system', text: '↩️ Retour au menu précédent' },
    ]);
    setCurrentNodeId(previousNodeId);
  };

  const handleContactAgent = async () => {
    if (!user) { navigate('/auth'); return; }
    try {
      // Add waiting message
      setChatMessages(prev => [
        ...prev,
        { type: 'system', text: 'Nous vous mettons en relation avec le prochain agent disponible. Merci de patienter...' },
      ]);
      setChatPhase('waiting_agent');

      // Save chatbot history with the ticket
      const history = chatMessages.map(m => ({ type: m.type, text: m.text }));
      const ticket = await createTicket.mutateAsync("Demande d'assistance");

      // Save chatbot history
      await supabase
        .from('support_tickets' as any)
        .update({ chatbot_history: history } as any)
        .eq('id', ticket.id);

      setSelectedTicket(ticket);
    } catch {
      setChatPhase('chatbot');
    }
  };




  // Go back to FAQ without closing the ticket - conversation stays open
  const handleGoBack = () => {
    setChatPhase('idle');
    setChatMessages([]);
    setCurrentNodeId(null);
    setNodeHistory([]);
    setFreeText('');
    if (selectedTicket && (selectedTicket.status === 'open' || selectedTicket.status === 'assigned' || liveTicket?.status === 'open' || liveTicket?.status === 'assigned')) {
      // Keep selectedTicket so we can resume
    } else {
      setSelectedTicket(null);
    }
    agentJoinedRef.current = false;
  };

  // Close the ticket officially -> show rating
  const handleCloseTicket = async () => {
    if (!selectedTicket?.id) return;
    try {
      await closeTicket.mutateAsync(selectedTicket.id);
      setChatPhase('rating');
    } catch {
      // Error handled by mutation
    }
  };

  // Full reset after rating or skip
  const handleEndChat = () => {
    setChatPhase('idle');
    setChatMessages([]);
    setCurrentNodeId(null);
    setNodeHistory([]);
    setFreeText('');
    setSelectedTicket(null);
    agentJoinedRef.current = false;
    setRatingEmoji(null);
    setRatingComment('');
  };

  const handleSendFreeText = () => {
    if (!freeText.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { type: 'user', text: freeText.trim() },
      { type: 'bot', text: 'Merci pour ces détails. Pour une assistance personnalisée, nous vous recommandons de contacter un agent.' },
    ]);
    setFreeText('');
    playNotificationSoundStandalone();
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

  // Show old ticket detail from "Mes tickets"
  if (selectedTicket && chatPhase === 'idle') {
    return (
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
        className="min-h-screen"
      >
        <SupportChatRoom ticket={selectedTicket} onBack={() => setSelectedTicket(null)} />
      </motion.div>
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

          {/* Emoji rating */}
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

          {/* Optional comment */}
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
                <div className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center shrink-0">
                  <Bot className="w-4.5 h-4.5 text-background" />
                </div>
                <span className="font-semibold text-sm truncate">Assistance</span>
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
            {/* Chatbot messages */}
            {chatMessages.map((msg, i) => (
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
                    {msg.text}
                  </div>
                ) : (
                  <>
                    {msg.type === 'bot' && (
                      <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center shrink-0 mb-0.5">
                        <Bot className="w-3.5 h-3.5 text-background" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.type === 'user'
                        ? "bg-foreground text-background rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}>
                      <p className="whitespace-pre-line">{msg.text}</p>
                    </div>
                  </>
                )}
              </motion.div>
            ))}

            {/* Waiting spinner */}
            {isWaiting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center py-4"
              >
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recherche d'un agent disponible...</span>
                </div>
              </motion.div>
            )}

            {/* Agent joined message */}
            {isAgentPhase && agentProfile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center"
              >
                <div className="bg-green-500/10 text-green-600 text-xs font-medium px-4 py-2 rounded-full text-center">
                  🛡️ {agentProfile.username} a rejoint la conversation
                </div>
              </motion.div>
            )}

            {/* Agent messages from support_messages */}
            {isAgentPhase && ticketMessages
              .filter(m => m.message_type !== 'credit_request')
              .map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                const isSystem = msg.message_type === 'system';

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex items-end gap-2",
                      isSystem ? "justify-center" : isOwn ? "justify-end" : "justify-start"
                    )}
                  >
                    {isSystem ? (
                      <div className="bg-muted/60 text-muted-foreground text-xs px-4 py-2 rounded-full text-center max-w-[85%]">
                        {msg.content}
                      </div>
                    ) : (
                      <>
                        {!isOwn && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-0.5 text-xs font-bold text-primary">
                            {agentProfile?.username?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                          isOwn
                            ? "bg-foreground text-background rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        )}>
                          <p className="whitespace-pre-line break-words">{msg.content}</p>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}

            {/* Chatbot action buttons (only in chatbot phase) */}
            {chatPhase === 'chatbot' && currentOptions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-end gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center shrink-0 mb-0.5">
                  <Bot className="w-3.5 h-3.5 text-background" />
                </div>
                <div className="flex-1 space-y-1.5 max-w-[80%]">
                  {currentOptions.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => handleSelectOption(node)}
                      className="w-full text-left px-4 py-3 text-sm font-medium rounded-2xl border border-border bg-background hover:bg-muted transition-colors active:scale-[0.98]"
                    >
                      {node.label}
                    </button>
                  ))}
                  {/* Agent button - shown at root level after navigating (not on first display) */}
                  {chatMessages.length > 2 && !currentNodeId && (
                    <button
                      onClick={handleContactAgent}
                      disabled={createTicket.isPending}
                      className="w-full text-left px-4 py-3 text-sm font-medium rounded-2xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors active:scale-[0.98] flex items-center gap-2"
                    >
                      <Headphones className="w-4 h-4 shrink-0" />
                      {createTicket.isPending ? 'Connexion...' : 'Mise en relation avec un agent'}
                    </button>
                  )}
                  {/* Back button */}
                  {nodeHistory.length > 0 && (
                    <button
                      onClick={handleGoBackInChat}
                      className="w-full text-left px-4 py-3 text-sm font-medium rounded-2xl border border-border bg-background hover:bg-muted transition-colors active:scale-[0.98] flex items-center gap-2 text-muted-foreground"
                    >
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                      Revenir en arrière
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Leaf node: no children = show agent button + other options */}
            {chatPhase === 'chatbot' && currentOptions.length === 0 && chatMessages.length > 2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-end gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center shrink-0 mb-0.5">
                  <Bot className="w-3.5 h-3.5 text-background" />
                </div>
                <div className="flex-1 space-y-1.5 max-w-[80%]">
                  <button
                    onClick={handleContactAgent}
                    disabled={createTicket.isPending}
                    className="w-full text-left px-4 py-3 text-sm font-medium rounded-2xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors active:scale-[0.98] flex items-center gap-2"
                  >
                    <Headphones className="w-4 h-4 shrink-0" />
                    {createTicket.isPending ? 'Connexion...' : 'Mise en relation avec un agent'}
                  </button>
                  <button
                    onClick={() => {
                      setNodeHistory([]);
                      setCurrentNodeId(null);
                      setChatMessages(prev => [
                        ...prev,
                        { type: 'bot', text: 'Avez-vous une autre question ? Sélectionnez une option ci-dessous.' },
                      ]);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium rounded-2xl border border-border bg-background hover:bg-muted transition-colors active:scale-[0.98]"
                  >
                    Autre demande
                  </button>
                  {/* Back button */}
                  {nodeHistory.length > 0 && (
                    <button
                      onClick={handleGoBackInChat}
                      className="w-full text-left px-4 py-3 text-sm font-medium rounded-2xl border border-border bg-background hover:bg-muted transition-colors active:scale-[0.98] flex items-center gap-2 text-muted-foreground"
                    >
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                      Revenir en arrière
                    </button>
                  )}
                </div>
              </motion.div>
            )}




            <div ref={scrollEndRef} />
          </div>
        </div>

        {/* Bottom input */}
        {(chatPhase === 'chatbot' || chatPhase === 'agent') && (
          <div
            className="border-t border-border bg-background px-4 py-3"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="max-w-lg mx-auto flex items-center gap-2">
              <Input
                placeholder={isAgentPhase ? "Écrivez votre message..." : "Décrivez votre problème..."}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    isAgentPhase ? handleSendToAgent() : handleSendFreeText();
                  }
                }}
                className="flex-1 rounded-full bg-muted border-0 h-11"
              />
              <Button
                size="icon"
                variant={freeText.trim() ? "default" : "ghost"}
                onClick={isAgentPhase ? handleSendToAgent : handleSendFreeText}
                disabled={!freeText.trim()}
                className="rounded-full w-11 h-11 shrink-0"
              >
                <Send className="w-4.5 h-4.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Waiting phase - no input */}
        {isWaiting && (
          <div className="border-t border-border bg-muted/50 px-4 py-4 text-center"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <p className="text-xs text-muted-foreground">En attente d'un agent...</p>
          </div>
        )}
      </div>
    );
  }

  // ============ DEFAULT: FAQ page ============
  return (
    <div className={cn("bg-background flex flex-col", embedded ? "flex-1" : "min-h-dvh")}>
      <div
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="px-4 pb-3 flex items-center gap-3">
          {!embedded && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">Centre d'aide</h1>
            <p className="text-xs text-muted-foreground">FAQ & Support client</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowTickets(!showTickets)}>
            <Headphones className="w-4 h-4" />
            Mes tickets
          </Button>
        </div>

        {!showTickets && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans la FAQ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7" onClick={() => setSearchQuery('')}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {showTickets ? (
          <div className="p-4">
            <SupportTicketList onSelectTicket={(ticket) => { setShowTickets(false); setSelectedTicket(ticket as SupportTicket); }} />
          </div>
        ) : (
          <div className="p-4 space-y-6 pb-24">
            {faqArticles.length === 0 && !faqLoading ? (
              <div className="text-center py-8">
                <HelpCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-medium text-foreground mb-1">
                  {searchQuery ? 'Aucun résultat' : 'FAQ bientôt disponible'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  {searchQuery ? 'Essayez avec d\'autres mots-clés ou contactez le support.' : 'Les articles d\'aide seront bientôt disponibles.'}
                </p>
              </div>
            ) : (
              Object.entries(groupedFAQ).map(([category, articles]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs capitalize">{category}</Badge>
                    <span className="text-xs text-muted-foreground">{articles.length} article{articles.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-2">
                    {articles.map((article) => (
                      <Card
                        key={article.id}
                        className={cn("overflow-hidden transition-all cursor-pointer", expandedFAQ === article.id ? "ring-1 ring-primary/30" : "")}
                        onClick={() => setExpandedFAQ(expandedFAQ === article.id ? null : article.id)}
                      >
                        <div className="px-4 py-3 flex items-center justify-between">
                          <p className="font-medium text-sm flex-1">{article.question}</p>
                          <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-2", expandedFAQ === article.id && "rotate-90")} />
                        </div>
                        <AnimatePresence>
                          {expandedFAQ === article.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-3 border-t border-border pt-3">
                                <p className="text-sm text-muted-foreground whitespace-pre-line">{article.answer}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </ScrollArea>

      {/* Floating chat bubble */}
      <button
        onClick={handleStartChat}
        className={cn(
          "fixed right-4 z-50 w-14 h-14 rounded-full bg-foreground text-background shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center",
          embedded ? "bottom-28" : "bottom-20"
        )}
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Démarrer le chat"
      >
        <Bot className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Help;
