import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Headphones, HelpCircle, X, ArrowLeft, Send, Bot, Loader2, Star, XCircle, BookOpen, MessageCircle, Shield, CreditCard, Users, Settings, Sparkles, LifeBuoy, Headset, MessageSquareText, RotateCcw, Clock, AlertTriangle, Gift, Coins } from 'lucide-react';
import { addCreditsToUser } from '@/hooks/useCredits';
import { useEstimatedWaitTime } from '@/hooks/useEstimatedWaitTime';
import { Progress } from '@/components/ui/progress';
import { playNotificationSoundStandalone } from '@/hooks/useNotificationSound';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useSupportTickets, useSupportMessages, SupportTicket } from '@/hooks/useSupportTickets';
import { useSupportTypingIndicator } from '@/hooks/useSupportTypingIndicator';
import SupportChatRoom from '@/components/support/SupportChatRoom';
import WaitTimeBanner from '@/components/support/WaitTimeBanner';

import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

import { toast } from 'sonner';
import {
  searchKnowledgeBase,
  STATIC_KNOWLEDGE,
  normalize,
  type ScoredResult,
} from '@/lib/helpChatbotEngine';

type ChatPhase = 'chatbot' | 'waiting_agent' | 'agent' | 'rating';

interface ChatMessage {
  type: 'bot' | 'user' | 'system';
  text: string;
  isTyping?: boolean;
  revealedLength?: number;
  action?: 'credit_claim';
}

// Pending results for numbered suggestions
let pendingSuggestions: ScoredResult[] = [];

const RATING_EMOJIS = [
  { emoji: '😡', label: 'Très insatisfait' },
  { emoji: '😕', label: 'Insatisfait' },
  { emoji: '😐', label: 'Neutre' },
  { emoji: '😊', label: 'Satisfait' },
  { emoji: '🤩', label: 'Très satisfait' },
];

const BoldText = ({ text }: { text: string }) => {
  const parts = text.split(/(\*\*[^*]+\*\*|\[LINK:\/[^\]]+\])/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        // Link pattern: [LINK:/path]
        const linkMatch = part.match(/^\[LINK:(\/[^\]]+)\]$/);
        if (linkMatch) {
          const path = linkMatch[1];
          const label = '👉 Accéder à la page';
          return (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); window.location.href = path; }}
              className="inline-flex items-center gap-1 text-primary underline underline-offset-2 font-medium hover:opacity-80 transition-opacity"
            >
              {label}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

// Persistence helpers
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
  const safe = messages.map(m => ({
      type: m.type,
      text: m.text,
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
  
  const [noMatchCount, setNoMatchCount] = useState(0);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isClaimingCredits, setIsClaimingCredits] = useState(false);
  const [waitStartTime, setWaitStartTime] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('gc-help-wait-start');
      return saved ? parseInt(saved, 10) : null;
    } catch { return null; }
  });

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const freeTextRef = useRef<HTMLTextAreaElement>(null);
  const agentJoinedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Wait time estimation (real-time, polls every 30s)
  const waitTimeData = useEstimatedWaitTime(selectedTicket?.id ?? null);

  // Auto-resume active ticket on mount
  useEffect(() => {
    if (hasCheckedActiveTicket || !user?.id || ticketsLoading) return;
    setHasCheckedActiveTicket(true);

    const activeTicket = tickets.find(t => t.status === 'open' || t.status === 'assigned' || t.status === 'waiting_client');
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
  const typingReveal = chatMessages.find(m => m.isTyping)?.revealedLength;
  const scrollThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (scrollThrottleRef.current) return;
    scrollThrottleRef.current = setTimeout(() => {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      scrollThrottleRef.current = null;
    }, 100);
  }, [chatMessages.length, ticketMessages.length, chatPhase, agentTypingUsers.length, isBotTyping, typingReveal]);

  // FAQ + static categories combined
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    allFaqArticles.forEach(a => cats.add(a.category));
    STATIC_KNOWLEDGE.forEach(s => cats.add(s.category));
    return Array.from(cats);
  }, [allFaqArticles]);

  // Typewriter effect: reveal bot messages letter by letter
  useEffect(() => {
    const typingMsg = chatMessages.find(m => m.isTyping);
    if (!typingMsg) {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
      return;
    }

    if (typewriterRef.current) return;

    typewriterRef.current = setInterval(() => {
      setChatMessages(prev => {
        const idx = prev.findIndex(m => m.isTyping);
        if (idx === -1) {
          if (typewriterRef.current) clearInterval(typewriterRef.current);
          typewriterRef.current = null;
          return prev;
        }
        const msg = prev[idx];
        const currentLen = msg.revealedLength || 0;
        const fullLen = msg.text.length;
        const newLen = Math.min(currentLen + 1, fullLen);

        if (newLen >= fullLen) {
          if (typewriterRef.current) clearInterval(typewriterRef.current);
          typewriterRef.current = null;
          const updated = [...prev];
          updated[idx] = { ...msg, isTyping: false, revealedLength: fullLen };
          playNotificationSoundStandalone();
          return updated;
        }

        const updated = [...prev];
        updated[idx] = { ...msg, revealedLength: newLen };
        return updated;
      });
    }, 18);

    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
    };
  }, [chatMessages]);

  // Bot message with typing delay then typewriter reveal
  const addBotMessage = useCallback((text: string) => {
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const typingDelay = Math.min(Math.ceil(wordCount / 8) * 400, 1200);
    setIsBotTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { type: 'bot', text, isTyping: true, revealedLength: 0 }]);
      setIsBotTyping(false);
    }, typingDelay);
  }, []);

  // Find an entry by id (FAQ or static)
  const findEntryById = useCallback((id: string) => {
    const faqMatch = allFaqArticles.find(a => a.id === id);
    if (faqMatch) return faqMatch;
    return STATIC_KNOWLEDGE.find(s => s.id === id) || null;
  }, [allFaqArticles]);

  // Show answer
  const showAnswer = useCallback((entryId: string) => {
    const entry = findEntryById(entryId);
    if (!entry) return;
    setNoMatchCount(0);
    pendingSuggestions = [];
    const linkPart = (entry as any).link ? `\n\n[LINK:${(entry as any).link}]` : '';
    addBotMessage(`**${entry.question}**\n\n${entry.answer}${linkPart}\n\nCette réponse t'a aidé ? Tu peux me poser une **autre question** ou taper **"agent"** pour contacter un conseiller. 😊\n\n📚 Consulte aussi le **Centre d'aide** pour plus d'articles : [LINK:/aide]`);
  }, [findEntryById, addBotMessage]);

  // Credit keywords detection
  const isCreditRequest = useCallback((msg: string) => {
    const lower = msg.toLowerCase();
    const creditKeywords = [
      'crédit', 'credit', 'crédits', 'credits',
      'donner des crédits', 'avoir des crédits', 'obtenir des crédits',
      'demande de crédit', 'besoin de crédit', 'plus de crédit',
      'pas assez de crédit', 'manque de crédit', 'donner crédit',
      'je veux des crédits', 'j\'ai plus de crédit', 'j\'ai pas de crédit',
      'recharger', 'recharge', 'solde', 'gratuit',
    ];
    return creditKeywords.some(kw => lower.includes(kw));
  }, []);

  // Handle credit claim from chatbot
  const handleCreditClaim = useCallback(async () => {
    if (!user?.id || isClaimingCredits) return;
    setIsClaimingCredits(true);

    try {
      // Check if user already claimed within the last 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: recentClaims, error: checkError } = await supabase
        .from('chatbot_credit_claims' as any)
        .select('id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', oneWeekAgo.toISOString())
        .limit(1);

      if (checkError) throw checkError;

      if (recentClaims && recentClaims.length > 0) {
        // Already claimed this week
        addBotMessage(
          `Je suis désolé, vous avez déjà bénéficié de crédits gratuits récemment. 😔\n\nLes crédits bonus via le chatbot sont délivrés **à titre exceptionnel** et sont limités à **une fois par semaine**.\n\nPour toute autre demande de crédits, veuillez **contacter un agent** en tapant **"agent"**.\n\nVous pouvez aussi gagner des crédits via :\n• La connexion quotidienne\n• Le parrainage d'amis\n• La complétion de votre profil\n\n[LINK:/credits]`
        );
        setIsClaimingCredits(false);
        return;
      }

      // Grant 5 bonus credits
      const result = await addCreditsToUser(user.id, 5, 'bonus', 'credit_claim', 'Crédits bonus offerts via le chatbot');
      if (!result.success) throw new Error(result.error);

      // Record the claim
      await supabase
        .from('chatbot_credit_claims' as any)
        .insert({ user_id: user.id, credits_given: 5 } as any);

      addBotMessage(
        `D'accord, je vous envoie **5 crédits Bonus** ! 🎁✨\n\nLes crédits ont été ajoutés à votre compte. Vous pouvez vérifier votre solde dans la section Crédits.\n\n⚠️ **Attention** : les crédits bonus sont délivrés **à titre exceptionnel** et ne sont pas souvent disponibles. Cette offre est limitée à **une fois par semaine**.\n\n[LINK:/credits]`
      );
      toast.success('🎁 5 crédits bonus ajoutés à votre compte !');
    } catch (err: any) {
      console.error('Credit claim error:', err);
      addBotMessage(
        `Oups, une erreur est survenue lors de l'attribution des crédits. 😕\n\nVeuillez réessayer plus tard ou **contacter un agent** en tapant **"agent"**.`
      );
    } finally {
      setIsClaimingCredits(false);
    }
  }, [user?.id, isClaimingCredits, addBotMessage]);

  // Initialize chatbot on first load
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!userProfile && user?.id) return;
    if (chatMessages.length > 0) {
      hasInitializedRef.current = true;
      return;
    }

    hasInitializedRef.current = true;
    const displayName = userProfile?.username || 'cher utilisateur';
    const greeting: ChatMessage = {
      type: 'bot',
      text: `Bonjour **${displayName}** ! 👋 Je suis l'assistant **Gay Social**.\n\nPose-moi ta question directement, je ferai de mon mieux pour t'aider ! 😊\n\nTu peux aussi taper **"agent"** à tout moment pour parler à un conseiller.\n\n📚 Ou consulte le **Centre d'aide** pour parcourir tous les articles : [LINK:/aide]`,
    };
    setChatMessages([greeting]);
    playNotificationSoundStandalone();
  }, [userProfile, user?.id, chatMessages.length]);

  // Handle free text — keyword search
  const handleSendFreeText = useCallback(() => {
    const isTypewriting = chatMessages.some(m => m.isTyping);
    if (!freeText.trim() || isBotTyping || isTypewriting) return;
    const userMsg = freeText.trim();
    setFreeText('');

    setChatMessages(prev => [...prev, { type: 'user', text: userMsg }]);

    const lowerMsg = userMsg.toLowerCase().trim();

    // Check if user wants to contact an agent
    if (lowerMsg === 'agent' || lowerMsg.includes('contacter un agent') || lowerMsg.includes('parler agent') || lowerMsg.includes('conseiller')) {
      handleContactAgent();
      return;
    }

    // Check if user is asking for credits
    if (isCreditRequest(lowerMsg)) {
      setChatMessages(prev => [...prev, {
        type: 'bot',
        text: `💳 La demande de crédits via le chatbot n'est pas disponible directement. Vous devez contacter le **service client** pour cela.\n\nToutefois, dans une démarche d'économie et de générosité de notre plateforme, et étant donné que nous pouvons rencontrer des soucis techniques, nous vous accordons **5 crédits bonus** exceptionnels. 🎁\n\nCliquez sur le bouton ci-dessous pour réclamer vos crédits :`,
        action: 'credit_claim',
      }]);
      return;
    }

    // Check if user typed a number to select a suggestion
    const num = parseInt(lowerMsg, 10);
    if (!isNaN(num) && num >= 1 && num <= pendingSuggestions.length) {
      const selected = pendingSuggestions[num - 1];
      showAnswer(selected.id);
      return;
    }

    const results = searchKnowledgeBase(userMsg, allFaqArticles);

    if (results.length > 0) {
      setNoMatchCount(0);

      if (results.length === 1 || results[0].score > results[1].score * 2) {
        // Single clear match — show answer directly
        showAnswer(results[0].id);
      } else {
        // Multiple results — show numbered text suggestions
        pendingSuggestions = results.slice(0, 5);
        const suggestionList = pendingSuggestions
          .map((r, i) => `**${i + 1}.** ${r.question}`)
          .join('\n');
        addBotMessage(
          `J'ai trouvé **${pendingSuggestions.length} sujets** qui pourraient correspondre à ta question :\n\n${suggestionList}\n\n📝 **Tape le numéro** (1-${pendingSuggestions.length}) du sujet qui t'intéresse, ou **reformule** ta question !`
        );
      }
    } else {
      const newCount = noMatchCount + 1;
      setNoMatchCount(newCount);
      pendingSuggestions = [];

      // Show available categories as text to help the user
      const catList = allCategories.map(c => `• ${c}`).join('\n');

      if (newCount >= 2) {
        addBotMessage(
          `Je n'ai pas trouvé de réponse dans notre base de connaissances. 😕\n\nJe te recommande de **contacter un agent** en tapant **"agent"** pour obtenir une aide personnalisée.`
        );
      } else {
        addBotMessage(
          `Je n'ai pas trouvé de réponse correspondante. 🤔\n\nEssaie de reformuler ta question avec d'autres mots. Voici les **sujets disponibles** :\n\n${catList}\n\nOu tape **"agent"** pour contacter un conseiller.`
        );
      }
    }
  }, [freeText, isBotTyping, chatMessages, allFaqArticles, allCategories, showAnswer, addBotMessage, noMatchCount, isCreditRequest]);

  // Contact agent
  const handleContactAgent = async () => {
    if (!user) { navigate('/auth'); return; }
    try {
      setChatMessages(prev => [
        ...prev,
        { type: 'system', text: 'Nous vous mettons en relation avec le prochain agent disponible. Merci de patienter...' },
      ]);
      setChatPhase('waiting_agent');
      const now = Date.now();
      setWaitStartTime(now);
      try { localStorage.setItem('gc-help-wait-start', String(now)); } catch {}

      const history = chatMessages.map(m => ({ type: m.type, text: m.text }));
      const ticket = await createTicket.mutateAsync("Demande d'assistance");

      await supabase
        .from('support_tickets' as any)
        .update({ chatbot_history: history } as any)
        .eq('id', ticket.id);

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

  // Go back
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
    
    setNoMatchCount(0);
    setWaitStartTime(null);
    agentJoinedRef.current = false;
    hasInitializedRef.current = false;
    clearPersistedState();
    try { localStorage.removeItem('gc-help-wait-start'); } catch {}
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="max-w-md w-full p-8 text-center bg-card/80 backdrop-blur-sm border-border/50 shadow-xl shadow-primary/5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Centre d'aide</h2>
            <p className="text-muted-foreground mb-4">Connectez-vous pour accéder au centre d'aide.</p>
            <Button onClick={() => navigate('/auth')} className="rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20">
              Se connecter
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ============ RATING PHASE ============
  if (chatPhase === 'rating') {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex flex-col">
        <div
          className="border-b border-border/50 bg-card/80 backdrop-blur-xl flex items-center gap-3 px-3 py-2.5"
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}
        >
          <Button variant="ghost" size="icon" onClick={handleEndChat} className="shrink-0 rounded-xl hover:bg-primary/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-display font-semibold text-sm">Votre avis</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shadow-lg shadow-primary/10"
          >
            <Star className="w-10 h-10 text-primary" />
          </motion.div>
          <div>
            <h2 className="font-display text-xl font-bold mb-1">Comment s'est passée votre conversation ?</h2>
            <p className="text-sm text-muted-foreground">Votre avis nous aide à améliorer notre service.</p>
          </div>

          <div className="flex gap-3">
            {RATING_EMOJIS.map((r, i) => (
              <motion.button
                key={r.emoji}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setRatingEmoji(r.emoji)}
                className={cn(
                  "w-14 h-14 text-2xl rounded-2xl border-2 transition-all flex items-center justify-center",
                  ratingEmoji === r.emoji
                    ? "border-primary bg-primary/10 scale-110 shadow-lg shadow-primary/20"
                    : "border-border/50 bg-card/60 backdrop-blur-sm hover:scale-105"
                )}
                title={r.label}
              >
                {r.emoji}
              </motion.button>
            ))}
          </div>

          <AnimatePresence>
            {ratingEmoji && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-sm space-y-3"
              >
                <p className="text-sm text-muted-foreground">Un commentaire ? (optionnel)</p>
                <Textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Dites-nous en plus..."
                  className="resize-none rounded-xl bg-card/60 border-border/50"
                  rows={3}
                />
                <Button
                  onClick={handleSubmitRating}
                  disabled={isSubmittingRating}
                  className="w-full h-12 rounded-xl font-semibold gap-2 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
                >
                  {isSubmittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Envoyer mon avis
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <Button variant="ghost" size="sm" onClick={handleEndChat} className="text-muted-foreground rounded-xl">
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
      {/* Header — glassmorphism */}
      <div
        className="border-b border-border/50 bg-card/80 backdrop-blur-xl flex items-center gap-3 px-3 py-2.5 flex-shrink-0"
        style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}
      >
        <Button variant="ghost" size="icon" onClick={isChatbotPhase ? () => navigate(-1) : handleGoBack} className="shrink-0 rounded-xl hover:bg-primary/10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {isAgentPhase && agentProfile ? (
            <>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                {agentProfile.username?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <span className="font-display font-semibold text-sm truncate block">{agentProfile.username}</span>
                <span className="text-[11px] text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  En ligne
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shrink-0">
                <Bot className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <span className="font-display font-semibold text-sm truncate block">Assistant Gay Social</span>
                <span className="text-[11px] text-emerald-500 flex items-center gap-1">
                  <MessageSquareText className="w-3 h-3" />
                  {isWaiting ? "Recherche d'un agent..." : 'Chatbot • En ligne'}
                </span>
              </div>
            </>
          )}
        </div>
        {isChatbotPhase && chatMessages.length > 2 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={resetChat}
            className="shrink-0 text-muted-foreground rounded-xl hover:bg-primary/10"
            title="Recommencer"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
        {(isAgentPhase || isWaiting) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCloseTicket}
            disabled={closeTicket.isPending}
            className="text-xs shrink-0 rounded-xl gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
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
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shrink-0 mb-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div className="max-w-[80%]">
                    <div className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      msg.type === 'user'
                        ? "bg-primary text-primary-foreground rounded-br-md shadow-primary/10"
                        : "bg-card/80 backdrop-blur-sm border border-border/50 text-foreground rounded-bl-md"
                    )}>
                      <p className="whitespace-pre-line">
                        <BoldText text={msg.isTyping ? msg.text.slice(0, msg.revealedLength || 0) : msg.text} />
                        {msg.isTyping && <span className="inline-block w-0.5 h-4 bg-foreground/70 animate-pulse ml-0.5 align-text-bottom" />}
                      </p>
                    </div>
                    {/* Credit claim button */}
                    {msg.action === 'credit_claim' && !msg.isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-2"
                      >
                        <Button
                          onClick={handleCreditClaim}
                          disabled={isClaimingCredits}
                          className="w-full gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
                          size="sm"
                        >
                          {isClaimingCredits ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Gift className="w-4 h-4" />
                          )}
                          {isClaimingCredits ? 'Attribution en cours...' : '🎁 Réclamer 5 crédits bonus'}
                        </Button>
                      </motion.div>
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
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shrink-0 mb-0.5">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
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
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shrink-0 mb-0.5">
                          <Bot className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                      {isAgentMessage && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shrink-0 mb-0.5 text-xs font-bold text-primary">
                          {agentProfile?.username?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                        (isChatbotUser || isOwn) && !isChatbotBot
                          ? "bg-primary text-primary-foreground rounded-br-md shadow-primary/10"
                          : "bg-card/80 backdrop-blur-sm border border-border/50 text-foreground rounded-bl-md"
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
        className="border-t border-border/50 bg-card/80 backdrop-blur-xl px-4 py-3 flex-shrink-0"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {isWaiting && (
          <WaitTimeBanner
            estimatedMinutes={waitTimeData.estimatedMinutes}
            position={waitTimeData.position}
            onlineModerators={waitTimeData.onlineModerators}
            found={waitTimeData.found}
            isLoading={waitTimeData.isLoading}
            waitStartTime={waitStartTime}
          />
        )}

        {isChatbotPhase && !isBotTyping && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleContactAgent}
            disabled={createTicket.isPending}
            className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 text-primary hover:from-primary/10 hover:to-accent/10 transition-all"
          >
            <Headphones className="w-3.5 h-3.5" />
            {createTicket.isPending ? 'Connexion en cours...' : 'Contacter un agent'}
          </motion.button>
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
            className="flex-1 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50 min-h-[40px] max-h-[120px] py-[10px] px-4 resize-none text-sm leading-5 focus:border-primary/50"
            rows={1}
            disabled={isBotTyping || chatMessages.some(m => m.isTyping)}
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
