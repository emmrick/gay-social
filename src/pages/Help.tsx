import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, Headphones, HelpCircle, X, ArrowLeft, ArrowRight, Check, Send, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFAQArticles, useHelpChatbotNodes, type HelpChatbotNode } from '@/hooks/useFAQ';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import SupportChatRoom from '@/components/support/SupportChatRoom';
import SupportTicketList from '@/components/support/SupportTicketList';
import { cn } from '@/lib/utils';

type ChatPhase = 'idle' | 'chatbot' | 'agent';

interface ChatMessage {
  type: 'bot' | 'user';
  text: string;
  actions?: HelpChatbotNode[];
}

const Help = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [chatPhase, setChatPhase] = useState<ChatPhase>('idle');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showTickets, setShowTickets] = useState(false);
  const [freeText, setFreeText] = useState('');
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const { data: faqArticles = [], isLoading: faqLoading } = useFAQArticles(searchQuery);
  const { data: rootNodes = [] } = useHelpChatbotNodes(undefined);
  const { data: childNodes = [] } = useHelpChatbotNodes(currentNodeId);
  const { createTicket } = useSupportTickets();

  const currentOptions = currentNodeId ? childNodes : rootNodes;

  // Auto-scroll to bottom
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, currentOptions.length]);

  // When chat starts, show greeting + root options
  const handleStartChat = () => {
    setChatPhase('chatbot');
    setCurrentNodeId(null);
    setChatMessages([
      {
        type: 'bot',
        text: 'Bonjour ! 👋 Merci de contacter l\'assistance. Nous sommes là pour vous aider.',
      },
      {
        type: 'bot',
        text: 'Comment pouvons-nous vous aider aujourd\'hui ? Sélectionnez une option ou décrivez votre problème ci-dessous.',
      },
    ]);
  };

  const handleSelectOption = (node: HelpChatbotNode) => {
    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { type: 'user', text: node.label },
    ];

    if (node.response_text) {
      newMessages.push({ type: 'bot', text: node.response_text });
    }

    setChatMessages(newMessages);
    setCurrentNodeId(node.id);
  };

  const handleContactAgent = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      const ticket = await createTicket.mutateAsync("Demande d'assistance");
      setChatPhase('agent');
      setSelectedTicket(ticket);
    } catch {
      // error handled by hook
    }
  };

  const handleEndChat = () => {
    setChatPhase('idle');
    setChatMessages([]);
    setCurrentNodeId(null);
    setFreeText('');
  };

  const handleSendFreeText = () => {
    if (!freeText.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { type: 'user', text: freeText.trim() },
      { type: 'bot', text: 'Merci pour ces détails. Pour une assistance personnalisée, nous vous recommandons de contacter un agent.' },
    ]);
    setFreeText('');
  };

  // Grouped FAQ by category
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

  // Show ticket detail from "Mes tickets"
  if (selectedTicket && chatPhase !== 'agent') {
    return (
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
        className="min-h-screen"
      >
        <SupportChatRoom
          ticket={selectedTicket}
          onBack={() => setSelectedTicket(null)}
        />
      </motion.div>
    );
  }

  // Agent phase — full screen support chat
  if (chatPhase === 'agent' && selectedTicket) {
    return (
      <div className="fixed inset-0 z-[60] bg-background">
        <SupportChatRoom
          ticket={selectedTicket}
          onBack={() => {
            setChatPhase('idle');
            setSelectedTicket(null);
            setChatMessages([]);
            setCurrentNodeId(null);
          }}
        />
      </div>
    );
  }

  // Chatbot phase — Uber Eats style
  if (chatPhase === 'chatbot') {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex flex-col">
        {/* Header */}
        <div
          className="border-b border-border bg-background/95 backdrop-blur-lg flex items-center gap-3 px-3 py-2.5"
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}
        >
          <Button variant="ghost" size="icon" onClick={handleEndChat} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center shrink-0">
              <Bot className="w-4.5 h-4.5 text-background" />
            </div>
            <span className="font-semibold text-sm truncate">Assistance</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndChat}
            className="text-xs shrink-0 rounded-full"
          >
            Mettre fin
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
            {chatMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i === chatMessages.length - 1 ? 0.1 : 0 }}
                className={cn("flex items-end gap-2", msg.type === 'user' ? "justify-end" : "justify-start")}
              >
                {msg.type === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center shrink-0 mb-0.5">
                    <Bot className="w-3.5 h-3.5 text-background" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.type === 'user'
                      ? "bg-foreground text-background rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
                {msg.type === 'user' && (
                  <Check className="w-4 h-4 text-muted-foreground shrink-0 mb-1" />
                )}
              </motion.div>
            ))}

            {/* Action buttons — Uber style */}
            {currentOptions.length > 0 && (
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

                  {/* Always show "Contacter un agent" as last action */}
                  <button
                    onClick={handleContactAgent}
                    disabled={createTicket.isPending}
                    className="w-full text-left px-4 py-3 text-sm font-medium rounded-2xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors active:scale-[0.98] flex items-center gap-2"
                  >
                    <Headphones className="w-4 h-4 shrink-0" />
                    {createTicket.isPending ? 'Connexion...' : 'Mise en relation avec un agent'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* If no options left, show prominent agent button */}
            {currentOptions.length === 0 && chatMessages.length > 2 && (
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
                    onClick={handleStartChat}
                    className="w-full text-left px-4 py-3 text-sm font-medium rounded-2xl border border-border bg-background hover:bg-muted transition-colors active:scale-[0.98]"
                  >
                    Autre demande
                  </button>
                  <button
                    onClick={handleContactAgent}
                    disabled={createTicket.isPending}
                    className="w-full text-left px-4 py-3 text-sm font-medium rounded-2xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors active:scale-[0.98] flex items-center gap-2"
                  >
                    <Headphones className="w-4 h-4 shrink-0" />
                    {createTicket.isPending ? 'Connexion...' : 'Mise en relation avec un agent'}
                  </button>
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
          <div className="max-w-lg mx-auto flex items-center gap-2">
            <Input
              placeholder="Décrivez votre problème..."
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendFreeText()}
              className="flex-1 rounded-full bg-muted border-0 h-11"
            />
            <Button
              size="icon"
              variant={freeText.trim() ? "default" : "ghost"}
              onClick={handleSendFreeText}
              disabled={!freeText.trim()}
              className="rounded-full w-11 h-11 shrink-0"
            >
              <Send className="w-4.5 h-4.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default: FAQ + "Démarrez le chat" card
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <div
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="px-4 pb-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">Centre d'aide</h1>
            <p className="text-xs text-muted-foreground">FAQ & Support client</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowTickets(!showTickets)}
          >
            <Headphones className="w-4 h-4" />
            Mes tickets
          </Button>
        </div>

        {/* Search */}
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {showTickets ? (
          <div className="p-4">
            <SupportTicketList onSelectTicket={(ticket) => { setShowTickets(false); setSelectedTicket(ticket); }} />
          </div>
        ) : (
          <div className="p-4 space-y-6 pb-24">
            {/* "Besoin d'aide?" CTA card — Uber style */}
            <Card className="p-6 text-center border-border/50">
              <h2 className="text-xl font-bold mb-2">Besoin d'aide ?</h2>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                Cliquez sur le bouton ci-dessous pour commencer à discuter avec notre assistant.
              </p>
              <Button
                onClick={handleStartChat}
                className="w-full max-w-xs mx-auto h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold text-sm gap-2"
              >
                Démarrez le chat
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>

            {/* FAQ Section */}
            {faqArticles.length === 0 && !faqLoading ? (
              <div className="text-center py-8">
                <HelpCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-medium text-foreground mb-1">
                  {searchQuery ? 'Aucun résultat' : 'FAQ bientôt disponible'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  {searchQuery
                    ? 'Essayez avec d\'autres mots-clés ou contactez le support.'
                    : 'Les articles d\'aide seront bientôt disponibles.'}
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
                        className={cn(
                          "overflow-hidden transition-all cursor-pointer",
                          expandedFAQ === article.id ? "ring-1 ring-primary/30" : ""
                        )}
                        onClick={() => setExpandedFAQ(expandedFAQ === article.id ? null : article.id)}
                      >
                        <div className="px-4 py-3 flex items-center justify-between">
                          <p className="font-medium text-sm flex-1">{article.question}</p>
                          <ChevronRight className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-2",
                            expandedFAQ === article.id && "rotate-90"
                          )} />
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
    </div>
  );
};

export default Help;
