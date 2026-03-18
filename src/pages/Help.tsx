import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Headphones, HelpCircle, X, ArrowLeft, Send, Bot, Loader2, Star, XCircle, BookOpen, MessageCircle, Shield, CreditCard, Users, Settings, Sparkles, LifeBuoy, Headset, MessageSquareText, Scale } from 'lucide-react';
import { playNotificationSoundStandalone } from '@/hooks/useNotificationSound';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useSupportTickets, useSupportMessages, SupportTicket } from '@/hooks/useSupportTickets';
import { useSupportTypingIndicator } from '@/hooks/useSupportTypingIndicator';
import SupportChatRoom from '@/components/support/SupportChatRoom';

import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

import { toast } from 'sonner';

type ChatPhase = 'chatbot' | 'waiting_agent' | 'agent' | 'rating';

interface ChatMessage {
  type: 'bot' | 'user' | 'system';
  text: string;
  options?: ChatOption[];
}

interface ChatOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

const RATING_EMOJIS = [
  { emoji: '😡', label: 'Très insatisfait' },
  { emoji: '😕', label: 'Insatisfait' },
  { emoji: '😐', label: 'Neutre' },
  { emoji: '😊', label: 'Satisfait' },
  { emoji: '🤩', label: 'Très satisfait' },
];

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

const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');

// Persistence helpers - use localStorage for cross-page persistence
const STORAGE_KEY_PHASE = 'gc-help-chat-phase';
const STORAGE_KEY_MESSAGES = 'gc-help-chat-messages';
const STORAGE_KEY_TICKET = 'gc-help-chat-ticket-id';

const loadPersistedPhase = (): ChatPhase => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PHASE);
    if (saved === 'waiting_agent' || saved === 'agent' || saved === 'rating') return saved;
    return 'chatbot';
  } catch { return 'chatbot'; }
};

const loadPersistedMessages = (): ChatMessage[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

const loadPersistedTicketId = (): string | null => {
  try { return localStorage.getItem(STORAGE_KEY_TICKET); } catch { return null; }
};

const persistState = (phase: ChatPhase, messages: ChatMessage[], ticketId?: string | null) => {
  try {
    localStorage.setItem(STORAGE_KEY_PHASE, phase);
    // Strip icons from options before serializing
    const safe = messages.map(m => ({
      type: m.type,
      text: m.text,
      options: m.options?.map(o => ({ label: o.label, value: o.value })),
    }));
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(safe));
    if (ticketId) localStorage.setItem(STORAGE_KEY_TICKET, ticketId);
  } catch { /* noop */ }
};

const clearPersistedState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY_PHASE);
    localStorage.removeItem(STORAGE_KEY_MESSAGES);
    localStorage.removeItem(STORAGE_KEY_TICKET);
  } catch { /* noop */ }
};

interface HelpProps {
  embedded?: boolean;
}

const Help = ({ embedded = false }: HelpProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chatPhase, setChatPhase] = useState<ChatPhase>(loadPersistedPhase);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(loadPersistedMessages);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [freeText, setFreeText] = useState('');
  const [ratingEmoji, setRatingEmoji] = useState<string | null>(null);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasCheckedActiveTicket, setHasCheckedActiveTicket] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [noMatchCount, setNoMatchCount] = useState(0);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const freeTextRef = useRef<HTMLTextAreaElement>(null);
  const agentJoinedRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    if (freeTextRef.current) {
      freeTextRef.current.style.height = 'auto';
      const scrollHeight = freeTextRef.current.scrollHeight;
      freeTextRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [freeText]);

  // Persist state on changes
  useEffect(() => {
    persistState(chatPhase, chatMessages, selectedTicket?.id);
  }, [chatPhase, chatMessages, selectedTicket?.id]);

  // Fetch all FAQ articles
  const { data: allFaqArticles = [] } = useQuery({
    queryKey: ['all-faq-articles-chatbot'],
    queryFn: async () => {
      const { data } = await supabase
        .from('faq_articles')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true });
      return data || [];
    },
  });

  // Fetch user profile
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

  // Support tickets
  const { tickets, isLoading: ticketsLoading, createTicket, closeTicket } = useSupportTickets();

  // Auto-resume active ticket on mount
  useEffect(() => {
    if (hasCheckedActiveTicket || !user?.id || ticketsLoading) return;
    setHasCheckedActiveTicket(true);

    const activeTicket = tickets.find(t => t.status === 'open' || t.status === 'assigned' || t.status === 'waiting_client');
    
    // Also check persisted ticket id
    const persistedTicketId = loadPersistedTicketId();
    const ticketToResume = activeTicket || (persistedTicketId ? tickets.find(t => t.id === persistedTicketId && t.status !== 'closed') : null);

    if (ticketToResume) {
      setSelectedTicket(ticketToResume);

      if (ticketToResume.chatbot_history && Array.isArray(ticketToResume.chatbot_history) && chatMessages.length === 0) {
        const restoredMessages: ChatMessage[] = (ticketToResume.chatbot_history as Array<{ type: string; text: string }>).map(m => ({
          type: m.type as 'bot' | 'user' | 'system',
          text: m.text,
        }));
        setChatMessages(restoredMessages);
      }

      if (ticketToResume.status === 'assigned') {
        agentJoinedRef.current = true;
        setChatPhase('agent');
      } else {
        setChatPhase('waiting_agent');
      }
    }
  }, [tickets, user?.id, hasCheckedActiveTicket, ticketsLoading]);

  // Listen for ticket messages & typing
  const { messages: ticketMessages } = useSupportMessages(selectedTicket?.id ?? null);
  const { typingUsers: agentTypingUsers } = useSupportTypingIndicator(selectedTicket?.id ?? null);

  // Agent profile
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

  // Poll ticket status
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

  // Detect agent join/close
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

  // Auto scroll
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, ticketMessages.length, chatPhase, agentTypingUsers.length, isBotTyping]);

  // FAQ categories
  const faqCategories = useMemo(() => {
    const cats = new Set(allFaqArticles.map(a => a.category));
    return Array.from(cats);
  }, [allFaqArticles]);

  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('compte') || lower.includes('profil')) return <Users className="w-4 h-4" />;
    if (lower.includes('crédit') || lower.includes('paiement') || lower.includes('achat')) return <CreditCard className="w-4 h-4" />;
    if (lower.includes('sécu') || lower.includes('confiden')) return <Shield className="w-4 h-4" />;
    if (lower.includes('message') || lower.includes('chat') || lower.includes('conversation')) return <MessageCircle className="w-4 h-4" />;
    if (lower.includes('vérif')) return <Shield className="w-4 h-4" />;
    if (lower.includes('notif')) return <MessageSquareText className="w-4 h-4" />;
    if (lower.includes('fonctio') || lower.includes('feature')) return <Sparkles className="w-4 h-4" />;
    if (lower.includes('techni')) return <Settings className="w-4 h-4" />;
    return <BookOpen className="w-4 h-4" />;
  };

  // Bot message with typing delay
  const addBotMessage = useCallback((text: string, options?: ChatOption[]) => {
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const typingDelay = Math.min(Math.ceil(wordCount / 5) * 1000, 3000);
    setIsBotTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { type: 'bot', text, options }]);
      setIsBotTyping(false);
      playNotificationSoundStandalone();
    }, typingDelay);
  }, []);

  // Show category options
  const showCategoryOptions = useCallback(() => {
    const options: ChatOption[] = faqCategories.map(cat => ({
      label: cat,
      value: `cat:${cat}`,
      icon: getCategoryIcon(cat),
    }));
    addBotMessage(
      "Sur quel **sujet** as-tu une question ? Tu peux aussi **taper ta question** directement ! 👇",
      options
    );
  }, [faqCategories, addBotMessage]);

  // Show questions for a category
  const showCategoryQuestions = useCallback((category: string) => {
    setCurrentCategory(category);
    const articles = allFaqArticles.filter(a => a.category === category);
    if (articles.length === 0) {
      addBotMessage("Aucune question disponible dans cette catégorie pour le moment. Tu peux **poser ta question** directement ou **choisir une autre catégorie**.");
      setTimeout(() => showCategoryOptions(), 1200);
      return;
    }
    const options: ChatOption[] = articles.map(a => ({
      label: a.question,
      value: `faq:${a.id}`,
    }));
    addBotMessage(
      `Voici les questions fréquentes sur **${category}** :\nChoisis celle qui correspond, ou **tape ta question** 📝`,
      options,
    );
  }, [allFaqArticles, addBotMessage, showCategoryOptions]);

  // Show FAQ answer
  const showFaqAnswer = useCallback((articleId: string) => {
    const article = allFaqArticles.find(a => a.id === articleId);
    if (!article) return;
    setNoMatchCount(0);

    // Find related articles in same category
    const related = allFaqArticles
      .filter(a => a.category === article.category && a.id !== articleId)
      .slice(0, 3);

    const options: ChatOption[] = [
      ...related.map(r => ({ label: `📄 ${r.question}`, value: `faq:${r.id}` })),
      { label: '📋 Changer de sujet', value: 'change_category' },
      { label: '👤 Contacter un agent', value: 'contact_agent' },
    ];
    addBotMessage(`**${article.question}**\n\n${article.answer}\n\nÇa répond à ta question ? 😊`, options);
  }, [allFaqArticles, addBotMessage]);

  // Search FAQ by keywords
  const searchFaqArticles = useCallback((query: string) => {
    const normalizedQuery = normalize(query);
    const words = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return [];

    const scored = allFaqArticles.map(article => {
      const nq = normalize(article.question);
      const na = normalize(article.answer);
      const nc = normalize(article.category);
      let score = 0;
      for (const word of words) {
        if (nq.includes(word)) score += 3;
        if (na.includes(word)) score += 1;
        if (nc.includes(word)) score += 2;
      }
      return { article, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.article);
  }, [allFaqArticles]);

  // Initialize chatbot on first load (auto-start)
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!userProfile && user?.id) return; // Wait for profile
    if (chatMessages.length > 0) {
      hasInitializedRef.current = true;
      return; // Already has messages (restored from persistence)
    }

    hasInitializedRef.current = true;
    const displayName = userProfile?.username || 'cher utilisateur';
    const greeting: ChatMessage = {
      type: 'bot',
      text: `Bonjour **${displayName}** ! 👋 Je suis l'assistant **Gay Connect**. Je suis là pour t'aider à trouver des réponses à tes questions.`,
    };
    setChatMessages([greeting]);

    // Show categories after delay
    setTimeout(() => {
      if (!faqCategories.length) return;
      const options: ChatOption[] = faqCategories.map(cat => ({
        label: cat,
        value: `cat:${cat}`,
        icon: getCategoryIcon(cat),
      }));
      setChatMessages(prev => [
        ...prev,
        {
          type: 'bot',
          text: "Choisis un **sujet** ci-dessous, ou **tape ta question** directement ! 👇",
          options,
        },
      ]);
      playNotificationSoundStandalone();
    }, 800);
  }, [userProfile, user?.id, faqCategories, chatMessages.length]);

  // Handle option click
  const handleOptionClick = useCallback((value: string) => {
    if (value.startsWith('cat:')) {
      const category = value.replace('cat:', '');
      setChatMessages(prev => [...prev, { type: 'user', text: category }]);
      showCategoryQuestions(category);
    } else if (value.startsWith('faq:')) {
      const articleId = value.replace('faq:', '');
      const article = allFaqArticles.find(a => a.id === articleId);
      if (article) {
        setChatMessages(prev => [...prev, { type: 'user', text: article.question }]);
        showFaqAnswer(articleId);
      }
    } else if (value === 'same_category') {
      setChatMessages(prev => [...prev, { type: 'user', text: 'Autre question sur ce sujet' }]);
      if (currentCategory) showCategoryQuestions(currentCategory);
      else showCategoryOptions();
    } else if (value === 'change_category') {
      setChatMessages(prev => [...prev, { type: 'user', text: 'Changer de sujet' }]);
      setCurrentCategory(null);
      showCategoryOptions();
    } else if (value === 'contact_agent') {
      setChatMessages(prev => [...prev, { type: 'user', text: 'Contacter un agent' }]);
      handleContactAgent();
    } else if (value === 'view_rules') {
      navigate('/regles');
    } else if (value === 'view_legal') {
      navigate('/legal');
    }
  }, [allFaqArticles, currentCategory, showCategoryQuestions, showCategoryOptions, showFaqAnswer, navigate]);

  // Handle free text
  const handleSendFreeText = useCallback(() => {
    if (!freeText.trim() || isBotTyping) return;
    const userMsg = freeText.trim();
    setFreeText('');

    setChatMessages(prev => [...prev, { type: 'user', text: userMsg }]);

    const matches = searchFaqArticles(userMsg);

    if (matches.length > 0) {
      setNoMatchCount(0);
      if (matches.length === 1) {
        showFaqAnswer(matches[0].id);
      } else {
        const options: ChatOption[] = matches.map(a => ({
          label: a.question,
          value: `faq:${a.id}`,
        }));
        addBotMessage(
          `J'ai trouvé **${matches.length} résultats** qui pourraient correspondre. Clique sur celle qui t'intéresse : 👇`,
          options,
        );
      }
    } else {
      const newCount = noMatchCount + 1;
      setNoMatchCount(newCount);

      if (newCount >= 2) {
        addBotMessage(
          "Je n'ai pas trouvé de réponse dans notre **base de connaissances**. 😕\n\nJe te recommande de **contacter un agent** du support qui pourra t'aider personnellement.",
          [{ label: '👤 Contacter un agent', value: 'contact_agent' }]
        );
      } else {
        const options: ChatOption[] = [
          { label: '📋 Parcourir les sujets', value: 'change_category' },
          { label: '👤 Contacter un agent', value: 'contact_agent' },
        ];
        addBotMessage(
          "Je n'ai pas trouvé de réponse correspondante. 🤔\n\nEssaie de **reformuler** avec d'autres mots, ou **parcours les sujets** disponibles.",
          options,
        );
      }
    }
  }, [freeText, isBotTyping, searchFaqArticles, showFaqAnswer, addBotMessage, noMatchCount]);

  // Contact agent - creates ticket and transitions to waiting
  const handleContactAgent = async () => {
    if (!user) { navigate('/auth'); return; }
    try {
      setChatMessages(prev => [
        ...prev,
        { type: 'system', text: 'Nous vous mettons en relation avec le prochain agent disponible. Merci de patienter...' },
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

  // Go back - reset chat
  const handleGoBack = async () => {
    const ticketToCancel = selectedTicket;
    const liveStatus = liveTicket?.status || ticketToCancel?.status;

    if (ticketToCancel && liveStatus === 'open') {
      try {
        await supabase
          .from('support_tickets' as any)
          .update({ status: 'closed', closed_at: new Date().toISOString() } as any)
          .eq('id', ticketToCancel.id);
        await supabase
          .from('moderation_tasks')
          .update({ status: 'cancelled', completed_at: new Date().toISOString() } as any)
          .eq('task_type', 'support_chat')
          .eq('status', 'pending')
          .contains('metadata', { ticket_id: ticketToCancel.id } as any);
      } catch (err) {
        console.error('[Help] Error cancelling ticket:', err);
      }
      setSelectedTicket(null);
    } else if (ticketToCancel && (liveStatus === 'assigned' || liveStatus === 'waiting_client')) {
      // Keep ticket open for resume
    } else {
      setSelectedTicket(null);
    }

    resetChat();
  };

  const resetChat = () => {
    setChatPhase('chatbot');
    setChatMessages([]);
    setFreeText('');
    setCurrentCategory(null);
    setNoMatchCount(0);
    agentJoinedRef.current = false;
    hasInitializedRef.current = false;
    clearPersistedState();
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket?.id) return;
    try {
      await closeTicket.mutateAsync(selectedTicket.id);
      setChatPhase('rating');
    } catch { /* handled */ }
  };

  const handleEndChat = () => {
    setSelectedTicket(null);
    setRatingEmoji(null);
    setRatingComment('');
    resetChat();
  };

  // Send to agent
  const handleSendToAgent = useCallback(async () => {
    if (!freeText.trim() || !selectedTicket?.id || !user?.id) return;
    const text = freeText.trim();
    setFreeText('');

    const currentStatus = liveTicket?.status || selectedTicket.status;
    if (currentStatus === 'waiting_client') {
      try {
        await supabase
          .from('support_messages' as any)
          .insert({
            ticket_id: selectedTicket.id,
            sender_id: user.id,
            content: '🔄 Nous vous mettons en relation avec un agent. Merci de patienter...',
            message_type: 'system',
          } as any);
        await supabase
          .from('support_tickets' as any)
          .update({ status: 'open', assigned_to: null } as any)
          .eq('id', selectedTicket.id);
      } catch (err) {
        console.error('Error reopening ticket:', err);
      }
    }

    await supabase
      .from('support_messages' as any)
      .insert({ ticket_id: selectedTicket.id, sender_id: user.id, content: text, message_type: 'text' } as any);
  }, [freeText, selectedTicket?.id, selectedTicket?.status, liveTicket?.status, user?.id]);

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

  // ============ CHAT VIEW (chatbot / waiting_agent / agent) ============
  const isAgentPhase = chatPhase === 'agent';
  const isWaiting = chatPhase === 'waiting_agent';
  const isChatbotPhase = chatPhase === 'chatbot';

  return (
    <div className={cn("flex flex-col bg-background overflow-hidden", embedded ? "flex-1" : "fixed inset-0 z-[60]")}>
      {/* Header */}
      <div
        className="border-b border-border bg-background/95 backdrop-blur-lg flex items-center gap-3 px-3 py-2.5 flex-shrink-0"
        style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}
      >
        <Button variant="ghost" size="icon" onClick={isChatbotPhase ? () => navigate(-1) : handleGoBack} className="shrink-0">
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
                  <MessageSquareText className="w-3 h-3" />
                  {isWaiting ? "Recherche d'un agent..." : 'Chatbot • En ligne'}
                </span>
              </div>
            </>
          )}
        </div>
        {(isAgentPhase || isWaiting) && (
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
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          {/* Chatbot messages */}
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
                    {msg.type === 'bot' && msg.options && msg.options.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        {msg.options.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleOptionClick(opt.value)}
                            className="w-full text-left px-3 py-2.5 text-sm font-medium rounded-xl border border-primary/20 bg-background/80 text-foreground hover:bg-primary/10 hover:border-primary/40 transition-colors active:scale-[0.98] flex items-center gap-2"
                          >
                            {opt.icon && <span className="text-primary shrink-0">{opt.icon}</span>}
                            <span className="line-clamp-2">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
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
                  <span className="text-[10px] text-muted-foreground ml-1.5">en train d'écrire...</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Agent phase messages */}
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

          {/* Agent typing */}
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

      {/* Bottom bar */}
      <div
        className="border-t border-border bg-background px-4 py-3 flex-shrink-0"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {isWaiting && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs mb-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Recherche d'un agent disponible...</span>
          </div>
        )}

        {/* Always-visible "Contact agent" button in chatbot phase */}
        {isChatbotPhase && !isBotTyping && (
          <button
            onClick={handleContactAgent}
            disabled={createTicket.isPending}
            className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors active:scale-[0.98]"
          >
            <Headphones className="w-3.5 h-3.5" />
            {createTicket.isPending ? 'Connexion en cours...' : 'Contacter un agent'}
          </button>
        )}

        <div className="max-w-lg mx-auto flex items-end gap-2">
          <Textarea
            ref={freeTextRef}
            placeholder={isChatbotPhase ? "Pose ta question ici..." : "Écrivez votre message..."}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                if (!isMobile) {
                  e.preventDefault();
                  if (isChatbotPhase) handleSendFreeText();
                  else handleSendToAgent();
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
            onClick={isChatbotPhase ? handleSendFreeText : handleSendToAgent}
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
};

export default Help;
