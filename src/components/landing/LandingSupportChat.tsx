import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, Headset, BookOpen, Shield, CreditCard, Users, Settings, Sparkles, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

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

const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');

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

const getCategoryIcon = (category: string) => {
  const lower = category.toLowerCase();
  if (lower.includes('compte') || lower.includes('profil')) return <Users className="w-3.5 h-3.5" />;
  if (lower.includes('crédit') || lower.includes('paiement')) return <CreditCard className="w-3.5 h-3.5" />;
  if (lower.includes('sécu') || lower.includes('confiden')) return <Shield className="w-3.5 h-3.5" />;
  if (lower.includes('message') || lower.includes('chat')) return <MessageSquareText className="w-3.5 h-3.5" />;
  if (lower.includes('param') || lower.includes('config')) return <Settings className="w-3.5 h-3.5" />;
  if (lower.includes('vérif')) return <Shield className="w-3.5 h-3.5" />;
  if (lower.includes('notif')) return <MessageSquareText className="w-3.5 h-3.5" />;
  if (lower.includes('fonctio')) return <Sparkles className="w-3.5 h-3.5" />;
  return <BookOpen className="w-3.5 h-3.5" />;
};

const LandingSupportChat = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [freeText, setFreeText] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [noMatchCount, setNoMatchCount] = useState(0);
  const [showEscalation, setShowEscalation] = useState(false);
  const [started, setStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: allFaqArticles = [] } = useQuery({
    queryKey: ['landing-faq-articles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('faq_articles')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true });
      return data || [];
    },
  });

  const faqCategories = useMemo(() => {
    return Array.from(new Set(allFaqArticles.map(a => a.category)));
  }, [allFaqArticles]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isBotTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
    }
  }, [freeText]);

  const playMessageSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;

      // Pleasant 3-note wind chime: C6 → E6 → G6
      const notes = [1047, 1319, 1568]; // C6, E6, G6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        const start = now + i * 0.12;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
        osc.start(start);
        osc.stop(start + 0.45);
      });
    } catch {}
  }, []);

  const addBotMessage = useCallback((text: string, options?: ChatOption[]) => {
    setIsBotTyping(true);
    const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
    setTimeout(() => {
      setMessages(prev => [...prev, { type: 'bot', text, options }]);
      setIsBotTyping(false);
      playMessageSound();
    }, delay);
  }, [playMessageSound]);

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

  const showCategoryQuestions = useCallback((category: string) => {
    setCurrentCategory(category);
    const articles = allFaqArticles.filter(a => a.category === category);
    if (articles.length === 0) {
      addBotMessage("Aucune question disponible dans cette catégorie. Tu peux **poser ta question** directement.");
      setTimeout(() => showCategoryOptions(), 1000);
      return;
    }
    const options: ChatOption[] = articles.map(a => ({
      label: a.question,
      value: `faq:${a.id}`,
    }));
    addBotMessage(
      `Voici les questions sur **${category}** :\nChoisis-en une ou **tape ta question**. 📝`,
      options,
    );
  }, [allFaqArticles, addBotMessage, showCategoryOptions]);

  const showFaqAnswer = useCallback((articleId: string) => {
    const article = allFaqArticles.find(a => a.id === articleId);
    if (!article) return;
    setNoMatchCount(0);
    addBotMessage(`**${article.question}**\n\n${article.answer}`);

    setTimeout(() => {
      const options: ChatOption[] = [
        { label: '🔄 Autre question sur ce sujet', value: 'same_category' },
        { label: '📋 Changer de sujet', value: 'change_category' },
        { label: '👤 Contacter un agent', value: 'contact_agent' },
      ];
      addBotMessage("Ça répond à ta question ? 😊", options);
    }, 800);
  }, [allFaqArticles, addBotMessage]);

  const searchFaqArticles = useCallback((query: string) => {
    const normalizedQuery = normalize(query);
    const words = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return [];

    const scored = allFaqArticles.map(article => {
      const nQ = normalize(article.question);
      const nA = normalize(article.answer);
      const nC = normalize(article.category);
      let score = 0;
      for (const word of words) {
        if (nQ.includes(word)) score += 3;
        if (nA.includes(word)) score += 1;
        if (nC.includes(word)) score += 2;
      }
      return { article, score };
    });

    return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 5).map(s => s.article);
  }, [allFaqArticles]);

  const handleStart = () => {
    setStarted(true);
    setMessages([
      { type: 'bot', text: "Bonjour ! 👋 Je suis l'assistant **Gay Connect**. Comment puis-je t'aider ?" },
    ]);
    setTimeout(() => {
      const options: ChatOption[] = faqCategories.map(cat => ({
        label: cat,
        value: `cat:${cat}`,
        icon: getCategoryIcon(cat),
      }));
      setMessages(prev => [
        ...prev,
        { type: 'bot', text: "Choisis un **sujet** ou **tape ta question** directement ! 👇", options },
      ]);
    }, 600);
  };

  const handleOptionClick = useCallback((value: string) => {
    if (value.startsWith('cat:')) {
      const category = value.replace('cat:', '');
      setMessages(prev => [...prev, { type: 'user', text: category }]);
      showCategoryQuestions(category);
    } else if (value.startsWith('faq:')) {
      const articleId = value.replace('faq:', '');
      const article = allFaqArticles.find(a => a.id === articleId);
      if (article) {
        setMessages(prev => [...prev, { type: 'user', text: article.question }]);
        showFaqAnswer(articleId);
      }
    } else if (value === 'same_category') {
      setMessages(prev => [...prev, { type: 'user', text: 'Autre question sur ce sujet' }]);
      if (currentCategory) showCategoryQuestions(currentCategory);
      else showCategoryOptions();
    } else if (value === 'change_category') {
      setMessages(prev => [...prev, { type: 'user', text: 'Changer de sujet' }]);
      setCurrentCategory(null);
      showCategoryOptions();
    } else if (value === 'contact_agent') {
      setMessages(prev => [...prev, { type: 'user', text: 'Contacter un agent' }]);
      setShowEscalation(true);
      addBotMessage("Pour être mis en relation avec un **conseiller**, connecte-toi à ton compte. Notre équipe te répondra rapidement ! 💬");
    }
  }, [allFaqArticles, currentCategory, showCategoryQuestions, showCategoryOptions, showFaqAnswer, addBotMessage]);

  const handleSendFreeText = useCallback(() => {
    if (!freeText.trim() || isBotTyping) return;
    const userMsg = freeText.trim();
    setFreeText('');
    setMessages(prev => [...prev, { type: 'user', text: userMsg }]);

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
        addBotMessage(`J'ai trouvé **${matches.length} résultats**. Clique sur celui qui t'intéresse : 👇`, options);
      }
    } else {
      const newCount = noMatchCount + 1;
      setNoMatchCount(newCount);
      if (newCount >= 2) {
        setShowEscalation(true);
        addBotMessage("Je n'ai pas trouvé de réponse. 😕 Je te recommande de **contacter un conseiller** pour une aide personnalisée.");
      } else {
        const options: ChatOption[] = [
          { label: '📋 Parcourir les sujets', value: 'change_category' },
          { label: '👤 Contacter un agent', value: 'contact_agent' },
        ];
        addBotMessage("Je n'ai pas trouvé de réponse correspondante. 🤔 Essaie de **reformuler** ou parcours les sujets.", options);
      }
    }
  }, [freeText, isBotTyping, searchFaqArticles, showFaqAnswer, addBotMessage, noMatchCount]);

  const handleContactAgent = () => {
    navigate('/auth');
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => { setIsOpen(true); if (!started) handleStart(); }}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform"
            aria-label="Contacter le support"
          >
            <MessageCircle className="w-6 h-6" />
            {/* Pulse */}
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] rounded-2xl border border-border/50 bg-background/98 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
              <div className="relative px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center ring-2 ring-primary/20">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background">
                      <span className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-40" />
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-foreground">Support Gay Connect</h3>
                    <p className="text-[11px] text-muted-foreground">En ligne • Réponse instantanée</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.type === 'system' ? (
                    <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-lg py-2 px-3">
                      {msg.text}
                    </div>
                  ) : (
                    <div className={cn('flex gap-2', msg.type === 'user' && 'justify-end')}>
                      {msg.type === 'bot' && (
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                      <div className="max-w-[80%] space-y-1">
                        <div
                          className={cn(
                            'rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
                            msg.type === 'user'
                              ? 'bg-primary text-primary-foreground rounded-tr-sm'
                              : 'bg-secondary/70 text-foreground rounded-tl-sm border border-border/30'
                          )}
                        >
                          {msg.text.split('\n').map((line, j) => (
                            <p key={j} className={j > 0 ? 'mt-1' : ''}>
                              <BoldText text={line} />
                            </p>
                          ))}
                        </div>
                        {/* Options */}
                        {msg.options && msg.options.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {msg.options.map((opt, k) => (
                              <button
                                key={k}
                                onClick={() => handleOptionClick(opt.value)}
                                disabled={isBotTyping}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/50 transition-all disabled:opacity-50"
                              >
                                {opt.icon}
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isBotTyping && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="bg-secondary/70 rounded-2xl rounded-tl-sm px-3 py-2.5 border border-border/30">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Escalation button */}
              {showEscalation && !isBotTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center pt-2"
                >
                  <Button
                    onClick={handleContactAgent}
                    className="gap-2 rounded-xl bg-primary hover:bg-primary/90 shadow-sm"
                    size="sm"
                  >
                    <Headset className="w-4 h-4" />
                    Contacter un conseiller
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="flex-shrink-0">
              <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
              <div className="p-3 bg-secondary/10">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendFreeText(); }}
                  className="flex gap-2 items-end"
                >
                  <Textarea
                    ref={textareaRef}
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
                        e.preventDefault();
                        handleSendFreeText();
                      }
                    }}
                    placeholder="Pose ta question..."
                    className="flex-1 text-[13px] min-h-[40px] max-h-[100px] resize-none rounded-xl bg-background/80 border-border/40 focus-visible:ring-primary/30 placeholder:text-muted-foreground/50"
                    rows={1}
                    maxLength={500}
                    disabled={isBotTyping}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 shadow-sm flex-shrink-0"
                    disabled={!freeText.trim() || isBotTyping}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LandingSupportChat;
