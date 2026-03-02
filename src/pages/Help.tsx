import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, MessageCircle, Headphones, HelpCircle, Bot, X, ArrowLeft } from 'lucide-react';
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

type ChatPhase = 'chatbot' | 'agent';

const Help = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatPhase, setChatPhase] = useState<ChatPhase>('chatbot');
  const [chatbotHistory, setChatbotHistory] = useState<{ type: 'bot' | 'user'; text: string }[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showTickets, setShowTickets] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: faqArticles = [], isLoading: faqLoading } = useFAQArticles(searchQuery);
  const { data: rootNodes = [] } = useHelpChatbotNodes(undefined);
  const { data: childNodes = [] } = useHelpChatbotNodes(currentNodeId);
  const { createTicket } = useSupportTickets();

  const currentOptions = currentNodeId ? childNodes : rootNodes;

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatbotHistory.length]);

  // Init chatbot greeting when opening chat
  useEffect(() => {
    if (showChat && chatPhase === 'chatbot' && chatbotHistory.length === 0) {
      setChatbotHistory([{
        type: 'bot',
        text: 'Bonjour ! 👋 Je suis l\'assistant du support. Comment puis-je vous aider ?',
      }]);
    }
  }, [showChat, chatPhase]);

  const handleOpenChat = () => {
    setChatPhase('chatbot');
    setChatbotHistory([]);
    setCurrentNodeId(null);
    setShowChat(true);
  };

  const handleSelectOption = (node: HelpChatbotNode) => {
    const newHistory = [
      ...chatbotHistory,
      { type: 'user' as const, text: node.label },
    ];

    if (node.response_text) {
      newHistory.push({ type: 'bot' as const, text: node.response_text });
    }

    setChatbotHistory(newHistory);
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

  const handleBackFromChat = () => {
    if (chatPhase === 'agent') {
      // Go back to chatbot phase
      setChatPhase('chatbot');
      setSelectedTicket(null);
    } else {
      setShowChat(false);
      setChatbotHistory([]);
      setCurrentNodeId(null);
    }
  };

  const handleResetChatbot = () => {
    setChatbotHistory([{
      type: 'bot',
      text: 'Bonjour ! 👋 Je suis l\'assistant du support. Comment puis-je vous aider ?',
    }]);
    setCurrentNodeId(null);
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
  if (selectedTicket && !showChat) {
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
            {/* FAQ Section */}
            {faqArticles.length === 0 && !faqLoading ? (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-medium text-foreground mb-1">
                  {searchQuery ? 'Aucun résultat' : 'FAQ bientôt disponible'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  {searchQuery 
                    ? 'Essayez avec d\'autres mots-clés ou contactez le support.'
                    : 'Les articles d\'aide seront bientôt disponibles. En attendant, contactez le support via la bulle de chat.'
                  }
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
                            "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ml-2",
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

      {/* Floating chat bubble */}
      {!showTickets && !showChat && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleOpenChat}
          className="fixed bottom-6 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center z-50"
          style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>
      )}

      {/* Full-screen Support Chat (Chatbot → Agent) */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[60] bg-background flex flex-col"
          >
            {chatPhase === 'agent' && selectedTicket ? (
              /* Agent phase - reuse existing SupportChatRoom */
              <SupportChatRoom
                ticket={selectedTicket}
                onBack={handleBackFromChat}
              />
            ) : (
              /* Chatbot phase */
              <>
                {/* Header */}
                <div 
                  className="border-b border-border px-4 py-3 flex items-center gap-3"
                  style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
                >
                  <Button variant="ghost" size="icon" onClick={handleBackFromChat}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                        <Bot className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Assistant Support</p>
                      <p className="text-[11px] text-green-500 font-medium">En ligne</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleResetChatbot} className="text-xs text-muted-foreground">
                    Recommencer
                  </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1">
                  <div ref={scrollRef} className="p-4 space-y-3 max-w-lg mx-auto">
                    {chatbotHistory.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i === chatbotHistory.length - 1 ? 0.1 : 0 }}
                        className={cn("flex gap-2.5", msg.type === 'user' ? "justify-end" : "justify-start")}
                      >
                        {msg.type === 'bot' && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                          msg.type === 'user' 
                            ? "bg-primary text-primary-foreground rounded-br-sm" 
                            : "bg-muted rounded-bl-sm"
                        )}>
                          <p className="whitespace-pre-line">{msg.text}</p>
                        </div>
                      </motion.div>
                    ))}

                    {/* Show options as chat suggestion chips */}
                    {currentOptions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-wrap gap-2 pl-10"
                      >
                        {currentOptions.map((node) => (
                          <button
                            key={node.id}
                            onClick={() => handleSelectOption(node)}
                            className="px-3.5 py-2 text-xs font-medium rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/50 transition-all active:scale-95"
                          >
                            {node.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>

                {/* Bottom action */}
                <div 
                  className="border-t border-border p-4"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
                >
                  <Button
                    onClick={handleContactAgent}
                    className="w-full gap-2 h-12 rounded-xl"
                    variant={currentOptions.length === 0 ? "default" : "secondary"}
                    disabled={createTicket.isPending}
                  >
                    <Headphones className="w-4 h-4" />
                    {createTicket.isPending ? 'Connexion en cours...' : 'Contacter un Agent par chat'}
                  </Button>
                  {currentOptions.length > 0 && (
                    <p className="text-[11px] text-center text-muted-foreground mt-2">
                      Sélectionnez une option ci-dessus ou contactez un agent
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Help;
