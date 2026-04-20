/**
 * Centre d'aide — Chatbot 100 % flow décisionnel + escalade vers agent humain.
 * Refonte complète : aucun appel IA, réponses 100 % cohérentes, style iMessage premium.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Loader2, Star, XCircle, Headset, HelpCircle, Headphones, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useSupportTickets, useSupportMessages, SupportTicket } from '@/hooks/useSupportTickets';
import { useSupportTypingIndicator } from '@/hooks/useSupportTypingIndicator';
import { useEstimatedWaitTime } from '@/hooks/useEstimatedWaitTime';
import WaitTimeBanner from '@/components/support/WaitTimeBanner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { playNotificationSoundStandalone } from '@/hooks/useNotificationSound';
import HelpChatBubble from '@/components/help/HelpChatBubble';
import HelpQuickChips, { type HelpChip } from '@/components/help/HelpQuickChips';
import HelpBreadcrumb from '@/components/help/HelpBreadcrumb';
import {
  HELP_FLOW, HELP_ROOT_ID, findNodeById, findPathToNode, findParentNode,
} from '@/lib/help/helpFlow';
import type { HelpBreadcrumbStep, HelpNode } from '@/lib/help/helpFlow.types';

type ChatPhase = 'chatbot' | 'waiting_agent' | 'agent' | 'rating';

interface ChatMessage {
  type: 'bot' | 'user' | 'system';
  text: string;
  isTyping?: boolean;
  revealedLength?: number;
  /** Chips affichées sous le message bot */
  chips?: HelpChip[];
  /** Node courant (pour reconstruire le breadcrumb au scroll) */
  nodeId?: string;
}

const RATING_EMOJIS = [
  { emoji: '😡', label: 'Très insatisfait' },
  { emoji: '😕', label: 'Insatisfait' },
  { emoji: '😐', label: 'Neutre' },
  { emoji: '😊', label: 'Satisfait' },
  { emoji: '🤩', label: 'Très satisfait' },
];

const STORAGE_KEY_PHASE = 'gc-help-chat-phase-v2';
const STORAGE_KEY_MESSAGES = 'gc-help-chat-messages-v2';
const STORAGE_KEY_TICKET = 'gc-help-chat-ticket-id-v2';
const STORAGE_KEY_NODE = 'gc-help-chat-current-node-v2';

const loadPhase = (): ChatPhase => {
  try {
    const v = localStorage.getItem(STORAGE_KEY_PHASE);
    if (v === 'waiting_agent' || v === 'agent' || v === 'rating') return v;
  } catch { /* noop */ }
  return 'chatbot';
};
const loadMessages = (): ChatMessage[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_MESSAGES) || '[]'); } catch { return []; }
};
const loadTicketId = (): string | null => {
  try { return localStorage.getItem(STORAGE_KEY_TICKET); } catch { return null; }
};
const loadCurrentNode = (): string => {
  try { return localStorage.getItem(STORAGE_KEY_NODE) || HELP_ROOT_ID; } catch { return HELP_ROOT_ID; }
};

interface HelpProps { embedded?: boolean }

const Help = ({ embedded = false }: HelpProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<ChatPhase>(loadPhase);
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [currentNodeId, setCurrentNodeId] = useState<string>(loadCurrentNode);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [agentInput, setAgentInput] = useState('');
  const [ratingEmoji, setRatingEmoji] = useState<string | null>(null);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [hasCheckedActiveTicket, setHasCheckedActiveTicket] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [waitStartTime, setWaitStartTime] = useState<number | null>(() => {
    try { const v = localStorage.getItem('gc-help-wait-start-v2'); return v ? parseInt(v, 10) : null; } catch { return null; }
  });

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const agentJoinedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const agentInputRef = useRef<HTMLTextAreaElement>(null);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PHASE, phase);
      localStorage.setItem(STORAGE_KEY_NODE, currentNodeId);
      const safe = messages.map((m) => ({ type: m.type, text: m.text, chips: m.chips, nodeId: m.nodeId }));
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(safe));
      if (selectedTicket?.id) localStorage.setItem(STORAGE_KEY_TICKET, selectedTicket.id);
    } catch { /* noop */ }
  }, [phase, messages, currentNodeId, selectedTicket?.id]);

  // Auto-resize agent textarea
  useEffect(() => {
    if (agentInputRef.current) {
      agentInputRef.current.style.height = 'auto';
      const sh = agentInputRef.current.scrollHeight;
      agentInputRef.current.style.height = Math.min(sh, 120) + 'px';
    }
  }, [agentInput]);

  // Profile
  const { data: userProfile } = useQuery({
    queryKey: ['own-profile-help-v2', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('username').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Tickets
  const { tickets, isLoading: ticketsLoading, createTicket, closeTicket } = useSupportTickets();
  const waitTimeData = useEstimatedWaitTime(selectedTicket?.id ?? null);

  // Auto-resume active ticket
  useEffect(() => {
    if (hasCheckedActiveTicket || !user?.id || ticketsLoading) return;
    setHasCheckedActiveTicket(true);
    const active = tickets.find((t) => t.status === 'open' || t.status === 'assigned' || t.status === 'waiting_client');
    const persistedId = loadTicketId();
    const toResume = active || (persistedId ? tickets.find((t) => t.id === persistedId && t.status !== 'closed') : null);
    if (toResume) {
      setSelectedTicket(toResume);
      if (toResume.status === 'assigned') {
        agentJoinedRef.current = true;
        setPhase('agent');
      } else {
        setPhase('waiting_agent');
      }
    }
  }, [tickets, user?.id, hasCheckedActiveTicket, ticketsLoading]);

  // Live ticket polling
  const { messages: ticketMessages } = useSupportMessages(selectedTicket?.id ?? null);
  const { typingUsers: agentTyping } = useSupportTypingIndicator(selectedTicket?.id ?? null);

  const { data: agentProfile } = useQuery({
    queryKey: ['agent-profile-v2', selectedTicket?.assigned_to],
    queryFn: async () => {
      if (!selectedTicket?.assigned_to) return null;
      const { data } = await supabase.from('profiles').select('username, avatar_url').eq('user_id', selectedTicket.assigned_to).single();
      return data;
    },
    enabled: !!selectedTicket?.assigned_to,
  });

  const { data: liveTicket } = useQuery({
    queryKey: ['live-ticket-status-v2', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket?.id) return null;
      const { data } = await supabase.from('support_tickets' as any).select('*').eq('id', selectedTicket.id).single();
      return data as unknown as SupportTicket;
    },
    enabled: !!selectedTicket?.id,
    refetchInterval: (phase === 'waiting_agent' || phase === 'agent') ? 3000 : 10000,
  });

  useEffect(() => {
    if (!liveTicket) return;
    if (liveTicket.status === 'assigned' && phase === 'waiting_agent' && !agentJoinedRef.current) {
      agentJoinedRef.current = true;
      setPhase('agent');
      setSelectedTicket(liveTicket);
    }
    if (liveTicket.status === 'closed' && (phase === 'agent' || phase === 'waiting_agent')) {
      setPhase('rating');
      setSelectedTicket(liveTicket);
    }
  }, [liveTicket?.status, liveTicket?.assigned_to, phase]);

  // Auto-scroll : à chaque changement, et instantané pendant le typewriter
  // pour que la dernière ligne soit toujours visible au-dessus de la barre fixe.
  const typingReveal = messages.find((m) => m.isTyping)?.revealedLength;
  const isTypingActive = messages.some((m) => m.isTyping);
  useEffect(() => {
    const behavior: ScrollBehavior = isTypingActive ? 'auto' : 'smooth';
    const t = setTimeout(() => scrollEndRef.current?.scrollIntoView({ behavior, block: 'end' }), 30);
    return () => clearTimeout(t);
  }, [messages.length, ticketMessages.length, phase, agentTyping.length, isBotTyping, typingReveal, isTypingActive]);

  // Typewriter
  useEffect(() => {
    const typingMsg = messages.find((m) => m.isTyping);
    if (!typingMsg) {
      if (typewriterRef.current) { clearInterval(typewriterRef.current); typewriterRef.current = null; }
      return;
    }
    if (typewriterRef.current) return;
    typewriterRef.current = setInterval(() => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.isTyping);
        if (idx === -1) {
          if (typewriterRef.current) clearInterval(typewriterRef.current);
          typewriterRef.current = null;
          return prev;
        }
        const msg = prev[idx];
        const fullLen = msg.text.length;
        const newLen = Math.min((msg.revealedLength || 0) + 1, fullLen);
        const updated = [...prev];
        if (newLen >= fullLen) {
          if (typewriterRef.current) clearInterval(typewriterRef.current);
          typewriterRef.current = null;
          updated[idx] = { ...msg, isTyping: false, revealedLength: fullLen };
          playNotificationSoundStandalone();
        } else {
          updated[idx] = { ...msg, revealedLength: newLen };
        }
        return updated;
      });
    }, 18);
    return () => {
      if (typewriterRef.current) { clearInterval(typewriterRef.current); typewriterRef.current = null; }
    };
  }, [messages]);

  /** Ajoute un message bot avec délai de "écrit en train..." puis effet machine à écrire */
  const addBotMessage = useCallback((text: string, chips?: HelpChip[], nodeId?: string) => {
    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
    const typingDelay = Math.min(Math.ceil(wordCount / 12) * 350, 900);
    setIsBotTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { type: 'bot', text, isTyping: true, revealedLength: 0, chips, nodeId }]);
      setIsBotTyping(false);
    }, typingDelay);
  }, []);

  /**
   * Construit les chips affichées sous une bulle bot.
   * Priorité : sous-rubriques → suggestions liées (FAQ croisée) → navigation arrière.
   * L'escalade « Parler à un agent » n'est PAS proposée ici (bouton dédié en bas).
   */
  const buildChipsForNode = useCallback((node: HelpNode): HelpChip[] => {
    const chips: HelpChip[] = [];

    // 1) Sous-rubriques (catégorie) ou suggestions liées (feuille)
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        chips.push({ id: child.id, label: child.label, emoji: child.emoji, variant: 'subtle' });
      }
    } else if (node.related && node.related.length > 0) {
      // Feuille : on propose les FAQ croisées comme prochaines questions
      for (const relId of node.related) {
        const relNode = findNodeById(relId);
        if (relNode) {
          chips.push({ id: relNode.id, label: relNode.label, emoji: relNode.emoji, variant: 'subtle' });
        }
      }
    }

    // 2) Navigation arrière (parent direct + menu principal)
    if (node.id !== HELP_ROOT_ID) {
      const parent = findParentNode(node.id);
      if (parent && parent.id !== HELP_ROOT_ID) {
        chips.push({
          id: parent.id,
          label: `Retour : ${parent.label}`,
          emoji: '↩️',
          variant: 'outline',
        });
      }
      chips.push({ id: HELP_ROOT_ID, label: 'Menu principal', emoji: '🏠', variant: 'outline' });
    }

    return chips;
  }, []);

  /** Navigue vers un node (affiche sa réponse + ses enfants comme chips) */
  const navigateToNode = useCallback(
    (nodeId: string, opts: { showUserBubble?: boolean } = {}) => {
      const node = findNodeById(nodeId);
      if (!node) return;

      if (opts.showUserBubble) {
        setMessages((prev) => [...prev, { type: 'user', text: `${node.emoji ?? ''} ${node.label}`.trim() }]);
      }

      setCurrentNodeId(nodeId);

      // Construire le message bot
      let intro = '';
      if (node.id === HELP_ROOT_ID) {
        const displayName = userProfile?.username || 'cher utilisateur';
        intro = `📋 **Menu principal**\n\nBonjour **${displayName}** ! Choisis une rubrique ci-dessous pour obtenir une réponse instantanée.\n\n💡 La plupart des questions trouvent leur réponse ici en quelques clics — explore les rubriques avant de contacter un agent.`;
      } else if (node.children && node.children.length > 0) {
        // Catégorie : afficher les sous-rubriques
        intro = node.answer
          ? `${node.answer}\n\n📂 **${node.label}** — choisis une question :`
          : `📂 **${node.emoji ?? ''} ${node.label}**\n\nChoisis la question qui t'intéresse 👇`;
      } else {
        // Feuille : afficher uniquement la réponse + footer suggestions/retour
        const base = node.answer || `Désolé, aucune réponse disponible pour cette rubrique.`;
        const hasRelated = (node.related?.length ?? 0) > 0;
        intro = hasRelated
          ? `${base}\n\n💡 **Questions liées** :`
          : `${base}\n\n↩️ Reviens en arrière ou choisis une autre rubrique :`;
      }

      const chips = buildChipsForNode(node);
      addBotMessage(intro.trim(), chips, node.id);
    },
    [addBotMessage, buildChipsForNode, userProfile?.username]
  );

  // Initialisation : message d'accueil + menu principal
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!userProfile && user?.id) return;
    if (messages.length > 0) { hasInitializedRef.current = true; return; }
    hasInitializedRef.current = true;
    navigateToNode(HELP_ROOT_ID);
  }, [userProfile, user?.id, messages.length, navigateToNode]);

  // Chip click handler
  const handleChipSelect = useCallback(
    (chipId: string) => {
      if (isBotTyping || messages.some((m) => m.isTyping)) return;
      if (chipId === '__agent_confirm') {
        // Confirmation utilisateur → on lance vraiment l'escalade
        void handleContactAgent();
        return;
      }
      if (chipId === '__agent_cancel') {
        // L'utilisateur préfère continuer avec l'aide automatique → retour menu
        navigateToNode(HELP_ROOT_ID, { showUserBubble: false });
        return;
      }
      navigateToNode(chipId, { showUserBubble: true });
    },
    [isBotTyping, messages, navigateToNode]
  );

  /**
   * Étape de confirmation avant l'escalade vers un agent.
   * On rappelle d'abord à l'utilisateur que la plupart des questions trouvent
   * leur réponse dans le menu, puis on lui demande de confirmer.
   */
  const promptAgentConfirmation = useCallback(() => {
    if (isBotTyping || messages.some((m) => m.isTyping)) return;
    setMessages((prev) => [
      ...prev,
      { type: 'user', text: '👤 Parler à un agent' },
    ]);
    addBotMessage(
      "Avant de te mettre en relation avec un conseiller (délai d'attente possible), as-tu vérifié que ta question n'est pas dans une rubrique ?\n\n💡 La plupart des sujets (crédits, profil, sécurité, paiement…) sont expliqués pas à pas dans le **Menu principal**.\n\nSouhaites-tu vraiment **continuer** vers un agent humain ?",
      [
        { id: '__agent_cancel', label: 'Revenir au menu', emoji: '🏠', variant: 'subtle' },
        { id: '__agent_confirm', label: 'Oui, parler à un agent', emoji: '👤', variant: 'outline' },
      ],
      '__agent_prompt',
    );
  }, [addBotMessage, isBotTyping, messages]);

  // Breadcrumb steps
  const breadcrumbSteps: HelpBreadcrumbStep[] = (() => {
    const path = findPathToNode(currentNodeId);
    return path.map((n) => ({ id: n.id, label: n.id === HELP_ROOT_ID ? 'Aide' : n.label }));
  })();

  // Reset
  const resetChat = useCallback(() => {
    setPhase('chatbot');
    setMessages([]);
    setCurrentNodeId(HELP_ROOT_ID);
    setAgentInput('');
    setWaitStartTime(null);
    agentJoinedRef.current = false;
    hasInitializedRef.current = false;
    try {
      localStorage.removeItem(STORAGE_KEY_PHASE);
      localStorage.removeItem(STORAGE_KEY_MESSAGES);
      localStorage.removeItem(STORAGE_KEY_TICKET);
      localStorage.removeItem(STORAGE_KEY_NODE);
      localStorage.removeItem('gc-help-wait-start-v2');
    } catch { /* noop */ }
  }, []);

  // Contact agent
  async function handleContactAgent() {
    if (!user) { navigate('/auth'); return; }
    try {
      setMessages((prev) => [
        ...prev,
        { type: 'user', text: '👤 Parler à un agent' },
        { type: 'system', text: 'Nous te mettons en relation avec le prochain agent disponible. Merci de patienter…' },
      ]);
      setPhase('waiting_agent');
      const now = Date.now();
      setWaitStartTime(now);
      try { localStorage.setItem('gc-help-wait-start-v2', String(now)); } catch {}

      const history = messages.map((m) => ({ type: m.type, text: m.text }));
      const ticket = await createTicket.mutateAsync("Demande d'assistance");

      await supabase
        .from('support_tickets' as any)
        .update({ chatbot_history: history } as any)
        .eq('id', ticket.id);

      const toInsert = messages.map((msg) => ({
        ticket_id: ticket.id,
        sender_id: user.id,
        content: msg.text,
        message_type: msg.type === 'user' ? 'chatbot_user' : msg.type === 'system' ? 'system' : 'chatbot_bot',
      }));
      if (toInsert.length > 0) {
        await supabase.from('support_messages' as any).insert(toInsert as any);
      }
      setSelectedTicket(ticket);
    } catch {
      setPhase('chatbot');
    }
  }

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
        console.error('[Help] cancel ticket error:', err);
      }
      setSelectedTicket(null);
    } else if (!ticketToCancel || (liveStatus !== 'assigned' && liveStatus !== 'waiting_client')) {
      setSelectedTicket(null);
    }
    resetChat();
    navigate('/home');
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket?.id) return;
    try {
      await closeTicket.mutateAsync(selectedTicket.id);
      setPhase('rating');
    } catch { /* noop */ }
  };

  const handleEndChat = () => {
    setSelectedTicket(null);
    setRatingEmoji(null);
    setRatingComment('');
    resetChat();
    navigate('/home');
  };

  // Agent message
  const handleSendToAgent = useCallback(async () => {
    if (!agentInput.trim() || !selectedTicket?.id || !user?.id) return;
    const text = agentInput.trim();
    setAgentInput('');
    const currentStatus = liveTicket?.status || selectedTicket.status;
    if (currentStatus === 'waiting_client') {
      try {
        await supabase.from('support_messages' as any).insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          content: '🔄 Relance — l\'utilisateur souhaite poursuivre la conversation.',
          message_type: 'system',
        } as any);
        await supabase.from('support_tickets' as any).update({ status: 'open', assigned_to: null } as any).eq('id', selectedTicket.id);
      } catch (err) { console.error(err); }
    }
    await supabase.from('support_messages' as any).insert({
      ticket_id: selectedTicket.id, sender_id: user.id, content: text, message_type: 'text',
    } as any);
  }, [agentInput, selectedTicket?.id, selectedTicket?.status, liveTicket?.status, user?.id]);

  const handleSubmitRating = async () => {
    if (!ratingEmoji || !selectedTicket?.id) return;
    setSubmittingRating(true);
    try {
      await supabase.from('support_tickets' as any).update({
        rating_emoji: ratingEmoji,
        rating_comment: ratingComment.trim() || null,
        rated_at: new Date().toISOString(),
      } as any).eq('id', selectedTicket.id);
      toast.success('Merci pour ton avis !');
      handleEndChat();
    } catch {
      toast.error("Erreur lors de l'envoi de l'avis");
    } finally { setSubmittingRating(false); }
  };

  // Auth gate
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-card/80 backdrop-blur-sm border-border/50 shadow-xl shadow-primary/5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <HelpCircle className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="font-display text-xl font-bold mb-2">Centre d'aide</h2>
          <p className="text-muted-foreground mb-4">Connecte-toi pour accéder au centre d'aide.</p>
          <Button onClick={() => navigate('/auth')} className="rounded-xl">Se connecter</Button>
        </Card>
      </div>
    );
  }

  // ============ RATING ============
  if (phase === 'rating') {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex flex-col">
        <div
          className="border-b border-border/40 bg-card/80 backdrop-blur-xl flex items-center gap-3 px-3 py-2.5"
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}
        >
          <Button variant="ghost" size="icon" onClick={handleEndChat} className="shrink-0 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-sm">Ton avis compte</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl shadow-primary/30"
          >
            <Star className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <div>
            <h2 className="font-display text-xl font-bold mb-1">Comment s'est passée ta conversation ?</h2>
            <p className="text-sm text-muted-foreground">Ton avis nous aide à améliorer le service.</p>
          </div>
          <div className="flex gap-3">
            {RATING_EMOJIS.map((r, i) => (
              <motion.button
                key={r.emoji}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                whileTap={{ scale: 0.9 }} onClick={() => setRatingEmoji(r.emoji)}
                className={cn(
                  'w-14 h-14 text-2xl rounded-2xl border-2 transition-all flex items-center justify-center',
                  ratingEmoji === r.emoji
                    ? 'border-primary bg-primary/10 scale-110 shadow-lg shadow-primary/20'
                    : 'border-border/50 bg-card/60 backdrop-blur-sm hover:scale-105'
                )}
                title={r.label}
              >{r.emoji}</motion.button>
            ))}
          </div>
          <AnimatePresence>
            {ratingEmoji && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-sm space-y-3"
              >
                <Textarea
                  placeholder="Un commentaire à ajouter ? (facultatif)"
                  value={ratingComment} onChange={(e) => setRatingComment(e.target.value)}
                  className="rounded-xl bg-card/60 backdrop-blur-sm border-border/50 min-h-[80px]"
                />
                <Button onClick={handleSubmitRating} disabled={submittingRating} className="w-full rounded-xl">
                  {submittingRating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Envoyer mon avis
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ============ CHATBOT / AGENT ============
  const isChatbot = phase === 'chatbot';
  const isWaiting = phase === 'waiting_agent';
  const isAgent = phase === 'agent';

  return (
    <div className={cn('flex flex-col bg-background', embedded ? 'h-full' : 'fixed inset-0 z-[60]')}>
      {/* Header */}
      <div
        className="border-b border-border/40 bg-card/80 backdrop-blur-xl flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ paddingTop: embedded ? undefined : 'max(0.625rem, env(safe-area-inset-top, 0px))' }}
      >
        <Button variant="ghost" size="icon" onClick={handleGoBack} className="shrink-0 rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
            {isAgent || isWaiting
              ? <Headset className="w-4 h-4 text-primary-foreground" />
              : <HelpCircle className="w-4 h-4 text-primary-foreground" />
            }
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate leading-tight">
              {isChatbot && 'Centre d\'aide'}
              {isWaiting && 'En attente d\'un agent'}
              {isAgent && (agentProfile?.username || 'Agent')}
            </p>
            <p className="text-[11px] text-muted-foreground truncate leading-tight">
              {isChatbot && 'Assistant Gay Social'}
              {isWaiting && 'Connexion en cours…'}
              {isAgent && 'Conseiller en ligne'}
            </p>
          </div>
        </div>
        {isChatbot && messages.length > 1 && (
          <Button
            variant="ghost" size="sm" onClick={() => { resetChat(); setTimeout(() => navigateToNode(HELP_ROOT_ID), 50); }}
            className="text-[11px] shrink-0 rounded-xl gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Recommencer
          </Button>
        )}
        {(isAgent || isWaiting) && (
          <Button
            variant="outline" size="sm" onClick={handleCloseTicket} disabled={closeTicket.isPending}
            className="text-xs shrink-0 rounded-xl gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {closeTicket.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Clôturer
          </Button>
        )}
      </div>

      {/* Breadcrumb (chatbot only) */}
      {isChatbot && (
        <HelpBreadcrumb steps={breadcrumbSteps} onNavigate={(id) => navigateToNode(id, { showUserBubble: false })} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-3 py-4 pb-8 space-y-2">
          {/* Chatbot bubbles */}
          {isChatbot && messages.map((msg, i) => (
            <HelpChatBubble
              key={`m-${i}`}
              type={msg.type}
              text={msg.text}
              isTyping={msg.isTyping}
              revealedLength={msg.revealedLength}
            >
              {msg.chips && msg.chips.length > 0 && !msg.isTyping && (
                <HelpQuickChips
                  chips={msg.chips}
                  onSelect={handleChipSelect}
                  disabled={isBotTyping || messages.some((m) => m.isTyping)}
                  layout={msg.nodeId === HELP_ROOT_ID ? 'grid' : 'wrap'}
                />
              )}
            </HelpChatBubble>
          ))}

          {/* Bot typing indicator */}
          {isChatbot && isBotTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2 justify-start">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mb-0.5 shadow-md shadow-primary/20">
                <HelpCircle className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-secondary/90 backdrop-blur-sm rounded-[22px] rounded-bl-[7px] px-4 py-3 shadow-[0_1px_3px_hsl(220_30%_20%/0.06),0_0_0_0.5px_hsl(var(--border)/0.6)]">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Agent phase */}
          {(isAgent || isWaiting) && ticketMessages
            .filter((m) => m.message_type !== 'credit_request')
            .map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              const isSystem = msg.message_type === 'system';
              const isChatbotBot = msg.message_type === 'chatbot_bot';
              const isChatbotUser = msg.message_type === 'chatbot_user';
              const isAgentMessage = !isOwn && !isChatbotBot && !isChatbotUser && !isSystem;
              const bubbleType: 'bot' | 'user' | 'system' =
                isSystem ? 'system' : ((isChatbotUser || isOwn) && !isChatbotBot ? 'user' : 'bot');
              return (
                <div key={msg.id} className="flex">
                  <div className="flex-1">
                    {isAgentMessage ? (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2 justify-start">
                        <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mb-0.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20">
                          {agentProfile?.username?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="max-w-[80%] bg-secondary/90 backdrop-blur-sm text-foreground rounded-[22px] rounded-bl-[7px] px-4 py-2.5 text-[14.5px] leading-[1.45] whitespace-pre-line break-words shadow-[0_1px_3px_hsl(220_30%_20%/0.06),0_0_0_0.5px_hsl(var(--border)/0.6)]">
                          {msg.content}
                        </div>
                      </motion.div>
                    ) : (
                      <HelpChatBubble type={bubbleType} text={msg.content} />
                    )}
                  </div>
                </div>
              );
            })}

          {(isAgent || isWaiting) && agentTyping.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2 justify-start">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mb-0.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20">
                {agentProfile?.username?.charAt(0)?.toUpperCase() || <Headset className="w-3.5 h-3.5" />}
              </div>
              <div className="bg-secondary/90 backdrop-blur-sm rounded-[22px] rounded-bl-[7px] px-4 py-3 shadow-[0_1px_3px_hsl(220_30%_20%/0.06),0_0_0_0.5px_hsl(var(--border)/0.6)]">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={scrollEndRef} className="h-2" />
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t border-border/40 bg-card/80 backdrop-blur-xl px-4 py-3 shrink-0"
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

        {isChatbot && (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-[11px] text-muted-foreground">
              💡 Choisis une rubrique ci-dessus pour une réponse instantanée
            </p>
            <button
              onClick={promptAgentConfirmation}
              disabled={createTicket.isPending || isBotTyping || messages.some((m) => m.isTyping)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-primary transition-colors rounded-full disabled:opacity-50"
            >
              <Headphones className="w-3.5 h-3.5" />
              {createTicket.isPending ? 'Connexion en cours…' : "Tu n'as pas trouvé ? Parler à un agent"}
            </button>
          </div>
        )}

        {(isAgent || isWaiting) && (
          <div className="max-w-lg mx-auto flex items-end gap-2">
            <Textarea
              ref={agentInputRef}
              placeholder="Écris ton message…"
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                  if (!isMobile) { e.preventDefault(); handleSendToAgent(); }
                }
              }}
              className="flex-1 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 min-h-[40px] max-h-[120px] py-[10px] px-4 resize-none text-sm leading-5 focus:border-primary/50"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSendToAgent}
              disabled={!agentInput.trim()}
              className="rounded-full w-11 h-11 shrink-0 bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/30"
            >
              <Send className="w-4.5 h-4.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Help;
