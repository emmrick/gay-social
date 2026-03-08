import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, ChevronDown, Headphones, HelpCircle, X, ArrowLeft, Send, Bot, Loader2, Star, XCircle, BookOpen, MessageCircle, Shield, CreditCard, Users, Settings, Sparkles, LifeBuoy, Headset, MessageSquareText, Scale } from 'lucide-react';
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

// Normalize text for search matching
const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');

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
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [freeText, setFreeText] = useState('');
  const [ratingEmoji, setRatingEmoji] = useState<string | null>(null);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasCheckedActiveTicket, setHasCheckedActiveTicket] = useState(false);
  const [showEscalationButton, setShowEscalationButton] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [answeredArticleIds, setAnsweredArticleIds] = useState<Set<string>>(new Set());
  const [noMatchCount, setNoMatchCount] = useState(0);

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

  // Fetch ALL FAQ articles (no search filter for chatbot matching)
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

  // Get unique categories from FAQ
  const faqCategories = useMemo(() => {
    const cats = new Set(allFaqArticles.map(a => a.category));
    return Array.from(cats);
  }, [allFaqArticles]);

  // Category icon mapping
  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('compte') || lower.includes('profil')) return <Users className="w-4 h-4" />;
    if (lower.includes('crédit') || lower.includes('paiement') || lower.includes('achat')) return <CreditCard className="w-4 h-4" />;
    if (lower.includes('sécu') || lower.includes('confiden') || lower.includes('privacy')) return <Shield className="w-4 h-4" />;
    if (lower.includes('message') || lower.includes('chat') || lower.includes('conversation')) return <MessageCircle className="w-4 h-4" />;
    if (lower.includes('param') || lower.includes('config') || lower.includes('réglage')) return <Settings className="w-4 h-4" />;
    if (lower.includes('vérif')) return <Shield className="w-4 h-4" />;
    if (lower.includes('notif')) return <MessageSquareText className="w-4 h-4" />;
    if (lower.includes('fonctio') || lower.includes('feature')) return <Sparkles className="w-4 h-4" />;
    if (lower.includes('techni')) return <Settings className="w-4 h-4" />;
    return <BookOpen className="w-4 h-4" />;
  };

  // Simulate bot typing delay based on word count (~1s per word, clamped 2s–15s)
  const addBotMessage = useCallback((text: string, options?: ChatOption[]) => {
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const typingDelay = wordCount * 1000;
    setIsBotTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { type: 'bot', text, options }]);
      setIsBotTyping(false);
      playNotificationSoundStandalone();
    }, typingDelay);
  }, []);

  // Show category selection
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
      addBotMessage(`Aucune question disponible dans cette catégorie pour le moment. Tu peux **poser ta question** directement ou **choisir une autre catégorie**.`);
      setTimeout(() => showCategoryOptions(), 1200);
      return;
    }
    const options: ChatOption[] = articles.map(a => ({
      label: a.question,
      value: `faq:${a.id}`,
    }));
    addBotMessage(
      `Voici les questions fréquentes sur **${category}** :\nChoisis celle qui correspond à ta question, ou **tape ta question** si elle n'y est pas. 📝`,
      options,
    );
  }, [allFaqArticles, addBotMessage, showCategoryOptions]);

  // Show an FAQ answer
  const showFaqAnswer = useCallback((articleId: string) => {
    const article = allFaqArticles.find(a => a.id === articleId);
    if (!article) return;

    setAnsweredArticleIds(prev => new Set(prev).add(articleId));
    setNoMatchCount(0);

    addBotMessage(`**${article.question}**\n\n${article.answer}`);

    // After answer, ask if they need more help
    setTimeout(() => {
      const options: ChatOption[] = [
        { label: '🔄 Autre question sur ce sujet', value: 'same_category' },
        { label: '📋 Changer de sujet', value: 'change_category' },
        { label: '📜 Consulter les règles', value: 'view_rules' },
        { label: '👤 Contacter un agent', value: 'contact_agent' },
      ];
      addBotMessage(
        "Est-ce que ça répond à ta question ? Tu peux **continuer** sur le même sujet ou **changer de catégorie**.",
        options
      );
    }, 1000);
  }, [allFaqArticles, addBotMessage]);

  // Search FAQ articles by keywords
  const searchFaqArticles = useCallback((query: string) => {
    const normalizedQuery = normalize(query);
    const words = normalizedQuery.split(/\s+/).filter(w => w.length > 2);

    if (words.length === 0) return [];

    const scored = allFaqArticles.map(article => {
      const normalizedQ = normalize(article.question);
      const normalizedA = normalize(article.answer);
      const normalizedCat = normalize(article.category);
      let score = 0;

      for (const word of words) {
        if (normalizedQ.includes(word)) score += 3;
        if (normalizedA.includes(word)) score += 1;
        if (normalizedCat.includes(word)) score += 2;
      }

      return { article, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.article);
  }, [allFaqArticles]);

  const handleStartChat = () => {
    setChatPhase('chatbot');
    setShowEscalationButton(false);
    setCurrentCategory(null);
    setAnsweredArticleIds(new Set());
    setNoMatchCount(0);
    agentJoinedRef.current = false;
    const displayName = userProfile?.username || 'cher utilisateur';
    setChatMessages([
      { type: 'bot', text: `Bonjour **${displayName}** ! 👋 Je suis l'assistant **Gay Connect**. Je suis là pour t'aider à trouver des réponses à tes questions.` },
    ]);

    // Show categories after greeting
    setTimeout(() => {
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
    }, 700);
  };

  // Handle option click (category or FAQ question)
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
      if (currentCategory) {
        showCategoryQuestions(currentCategory);
      } else {
        showCategoryOptions();
      }
    } else if (value === 'change_category') {
      setChatMessages(prev => [...prev, { type: 'user', text: 'Changer de sujet' }]);
      setCurrentCategory(null);
      showCategoryOptions();
    } else if (value === 'contact_agent') {
      setChatMessages(prev => [...prev, { type: 'user', text: 'Contacter un agent' }]);
      setShowEscalationButton(true);
      addBotMessage("D'accord ! Tu peux **contacter un agent** du support en cliquant sur le bouton ci-dessous. Un membre de notre équipe te répondra dès que possible. 💬");
    } else if (value === 'view_rules') {
      setChatMessages(prev => [...prev, { type: 'user', text: 'Consulter les règles' }]);
      navigate('/regles');
    } else if (value === 'view_help_center') {
      setChatMessages(prev => [...prev, { type: 'user', text: 'Centre d\'aide complet' }]);
      navigate('/aide/centre');
    } else if (value === 'view_legal') {
      setChatMessages(prev => [...prev, { type: 'user', text: 'Mentions légales' }]);
      navigate('/legal');
    }
  }, [allFaqArticles, currentCategory, showCategoryQuestions, showCategoryOptions, showFaqAnswer, addBotMessage]);

  // Handle free text input from user
  const handleSendFreeText = useCallback(() => {
    if (!freeText.trim() || isBotTyping) return;
    const userMsg = freeText.trim();
    setFreeText('');

    setChatMessages(prev => [...prev, { type: 'user', text: userMsg }]);

    // Search FAQ for matching articles
    const matches = searchFaqArticles(userMsg);

    if (matches.length > 0) {
      setNoMatchCount(0);
      // If one very strong match, show answer directly
      if (matches.length === 1) {
        showFaqAnswer(matches[0].id);
      } else {
        // Show matching questions as options
        const options: ChatOption[] = matches.map(a => ({
          label: a.question,
          value: `faq:${a.id}`,
        }));
        addBotMessage(
          `J'ai trouvé **${matches.length} résultat${matches.length > 1 ? 's' : ''}** qui pourraient correspondre à ta question. Clique sur celle qui t'intéresse : 👇`,
          options,
        );
      }
    } else {
      const newCount = noMatchCount + 1;
      setNoMatchCount(newCount);

      if (newCount >= 2) {
        // After 2 failed searches, suggest agent
        setShowEscalationButton(true);
        addBotMessage(
          "Je n'ai pas trouvé de réponse à ta question dans notre **base de connaissances**. 😕\n\nJe te recommande de **contacter un agent** du support qui pourra t'aider personnellement.",
        );
      } else {
        // First miss: suggest rephrasing or category browsing
        const options: ChatOption[] = [
          { label: '📋 Parcourir les sujets', value: 'change_category' },
          { label: '👤 Contacter un agent', value: 'contact_agent' },
        ];
        addBotMessage(
          "Je n'ai pas trouvé de réponse correspondant à ta question. 🤔\n\nEssaie de **reformuler** avec d'autres mots, ou **parcours les sujets** disponibles.",
          options,
        );
      }
    }
  }, [freeText, isBotTyping, searchFaqArticles, showFaqAnswer, addBotMessage, noMatchCount]);

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

  const handleGoBack = async () => {
    // If ticket is still open (no agent assigned), cancel it
    const ticketToCancel = selectedTicket;
    const liveStatus = liveTicket?.status || ticketToCancel?.status;
    
    if (ticketToCancel && liveStatus === 'open') {
      // Close the ticket since no agent picked it up yet
      try {
        await supabase
          .from('support_tickets' as any)
          .update({ status: 'closed', closed_at: new Date().toISOString() } as any)
          .eq('id', ticketToCancel.id);

        // Also cancel the associated moderation task
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
    } else if (ticketToCancel && (liveStatus === 'assigned')) {
      // Agent already assigned - keep ticket so user can resume
    } else {
      setSelectedTicket(null);
    }

    setChatPhase('idle');
    setChatMessages([]);
    setFreeText('');
    setShowEscalationButton(false);
    setCurrentCategory(null);
    setAnsweredArticleIds(new Set());
    setNoMatchCount(0);
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
    setFreeText('');
    setSelectedTicket(null);
    setShowEscalationButton(false);
    setCurrentCategory(null);
    setAnsweredArticleIds(new Set());
    setNoMatchCount(0);
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
                    <MessageSquareText className="w-3 h-3" />
                    Chatbot • En ligne
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
                      {/* Option buttons */}
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

            {/* Escalation button */}
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
              <MessageSquareText className="w-3 h-3 text-primary/60" />
              <span>Chatbot • Tape ta question ou choisis une option</span>
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
                      handleSendFreeText();
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
  }

  // ============ DEFAULT: FAQ page ============
  return (
    <div className={cn("bg-background flex flex-col overflow-hidden", embedded ? "flex-1" : "h-dvh")}>
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

      <div className="flex-1 overflow-y-auto">
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
                      <p className="font-semibold text-base text-foreground">Discuter avec l'assistant</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Trouve des réponses rapidement grâce au chatbot !</p>
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

            {/* Quick navigation links */}
            {!searchQuery && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate('/regles')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
                >
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-[11px] font-medium">Règles</span>
                </button>
                <button
                  onClick={() => navigate('/legal')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
                >
                  <Scale className="w-5 h-5 text-primary" />
                  <span className="text-[11px] font-medium">Mentions légales</span>
                </button>
              </div>
            )}

            {/* FAQ Categories directly on page */}
            {!searchQuery && faqCategories.length > 0 && (
              <div>
                <h2 className="font-semibold text-sm text-muted-foreground mb-3">Catégories d'aide</h2>
                <div className="space-y-2">
                  {faqCategories.map((name, i) => {
                    const count = allFaqArticles.filter(a => a.category === name).length;
                    return (
                      <motion.button
                        key={name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => navigate(`/aide/${encodeURIComponent(name)}`)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                          {getCategoryIcon(name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{name}</p>
                          <p className="text-xs text-muted-foreground">{count} article{count > 1 ? 's' : ''}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search results */}
            {searchQuery && faqArticles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{faqArticles.length} résultat{faqArticles.length !== 1 ? 's' : ''}</p>
                {faqArticles.map(article => (
                  <button
                    key={article.id}
                    onClick={() => navigate(`/aide?article=${article.id}`)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs text-muted-foreground">{article.category}</p>
                      <p className="font-medium text-sm">{article.question}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {searchQuery && faqArticles.length === 0 && !faqLoading && (
              <div className="text-center py-8">
                <Search className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Aucun article trouvé</p>
              </div>
            )}
          </div>
      </div>

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
