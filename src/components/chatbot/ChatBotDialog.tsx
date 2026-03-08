import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Sparkles, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatbotConfig, useChatbotConversation, useSendChatbotMessage } from '@/hooks/useChatbotConfig';
import { cn } from '@/lib/utils';
import { useCredits, CREDIT_COSTS } from '@/hooks/useCredits';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatBotDialogProps {
  profileUserId: string;
  profileUsername: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickQuestions = [
  "Salut, tu recherches quoi ? 👋",
  "Tu as quel âge ?",
  "Tu es d'où ?",
];

const ChatBotDialog = ({ profileUserId, profileUsername, open, onOpenChange }: ChatBotDialogProps) => {
  const { data: config } = useChatbotConfig(profileUserId);
  const { data: history = [] } = useChatbotConversation(profileUserId);
  const sendMessage = useSendChatbotMessage();
  const { deductCredits, hasEnoughCredits } = useCredits();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<{ role: string; content: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);

  const greeting = config?.greeting_message || `Salut ! Je suis le chatbot de ${profileUsername}. Pose-moi des questions ! 😊`;

  const allMessages = [
    ...history.map((m: any) => ({ role: m.role, content: m.content })),
    ...localMessages,
  ];

  const showQuickQuestions = allMessages.length === 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages.length]);

  useEffect(() => {
    if (open) setLocalMessages([]);
  }, [open]);

  const handleSend = async (overrideMsg?: string) => {
    const msg = (overrideMsg || input).trim();
    if (!msg || sendMessage.isPending || pendingRef.current) return;
    pendingRef.current = true;

    if (!hasEnoughCredits(CREDIT_COSTS.chatbot_message)) {
      toast.error(`Crédits insuffisants (${CREDIT_COSTS.chatbot_message} crédits par message)`);
      pendingRef.current = false;
      return;
    }

    setInput('');
    setLocalMessages(prev => [...prev, { role: 'user', content: msg }]);

    try {
      await deductCredits.mutateAsync({
        amount: CREDIT_COSTS.chatbot_message,
        transactionType: 'chatbot_message',
        description: `Message chatbot de ${profileUsername}`,
      });

      const reply = await sendMessage.mutateAsync({
        profileUserId,
        message: msg,
        conversationHistory: allMessages,
      });

      // Stream words: 1 second per 3 words
      const words = reply.split(/(\s+)/);
      setIsTyping(true);
      setStreamingText('');
      
      for (let i = 0; i < words.length; i++) {
        setStreamingText(prev => prev + words[i]);
        // Every 3 actual words (not whitespace), wait ~333ms (1s / 3 words)
        if (words[i].trim() && (i + 1) % 2 === 0) {
          await new Promise(resolve => setTimeout(resolve, 333));
        }
      }
      
      setIsTyping(false);
      setStreamingText('');
      setLocalMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      setIsTyping(false);
      setLocalMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Désolé, je rencontre un problème technique. Essaie de contacter directement cette personne ! 😅' },
      ]);
    } finally {
      pendingRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 h-[85vh] max-h-[650px] flex flex-col overflow-hidden border-border/30 bg-background/95 backdrop-blur-xl">
        {/* Header with gradient */}
        <DialogHeader className="flex-shrink-0 p-0">
          <div className="relative overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
            
            <div className="relative p-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center ring-2 ring-primary/20">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  {/* Online pulse */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background">
                    <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-40" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base font-bold truncate">
                    {profileUsername}
                  </DialogTitle>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <p className="text-[11px] text-muted-foreground font-medium">Assistant IA • En ligne</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
          </div>
        </DialogHeader>

        {/* Messages area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div ref={scrollRef} className="p-4 space-y-4">
              {/* Greeting bubble */}
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex gap-2.5"
              >
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 ring-1 ring-primary/20">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="space-y-1 max-w-[80%]">
                  <div className="bg-secondary/60 backdrop-blur-sm rounded-2xl rounded-tl-md px-3.5 py-2.5 border border-border/30">
                    <p className="text-sm leading-relaxed">{greeting}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 pl-1">Maintenant</p>
                </div>
              </motion.div>

              {/* Quick questions */}
              {showQuickQuestions && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="flex flex-wrap gap-2 pl-10"
                >
                  {quickQuestions.map((q, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      onClick={() => handleSend(q)}
                      disabled={sendMessage.isPending}
                      className="px-3 py-1.5 text-xs font-medium rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/50 transition-all duration-200 active:scale-95 disabled:opacity-50"
                    >
                      {q}
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* Conversation messages */}
              <AnimatePresence>
                {allMessages.map((msg, i) => (
                  <motion.div
                    key={`msg-${i}`}
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={cn('flex gap-2.5', msg.role === 'user' && 'justify-end')}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 ring-1 ring-primary/20">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="space-y-1 max-w-[80%]">
                      <div
                        className={cn(
                          'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed border',
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-tr-md border-primary/80 shadow-sm shadow-primary/20'
                            : 'bg-secondary/60 backdrop-blur-sm rounded-tl-md border-border/30'
                        )}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing / Streaming indicator */}
              {(sendMessage.isPending || isTyping) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-secondary/60 backdrop-blur-sm rounded-2xl rounded-tl-md px-4 py-3 border border-border/30 max-w-[80%]">
                    {streamingText ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{streamingText}<span className="inline-block w-1.5 h-4 bg-primary/60 rounded-sm animate-pulse ml-0.5 align-middle" /></p>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-[10px] text-muted-foreground ml-1.5">en train d'écrire...</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input area */}
        <div className="flex-shrink-0">
          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
          <div className="p-3 bg-secondary/20 backdrop-blur-sm">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2 items-center"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Écris un message..."
                className="flex-1 text-sm h-11 rounded-xl bg-background/80 border-border/40 focus-visible:ring-primary/30 placeholder:text-muted-foreground/50"
                maxLength={500}
                disabled={sendMessage.isPending}
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 shadow-sm shadow-primary/25 transition-all active:scale-95"
                disabled={!input.trim() || sendMessage.isPending}
              >
                {sendMessage.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Zap className="w-3 h-3 text-primary/50" />
              <p className="text-[10px] text-muted-foreground/70 font-medium">
                {CREDIT_COSTS.chatbot_message} crédit par message • IA
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatBotDialog;
