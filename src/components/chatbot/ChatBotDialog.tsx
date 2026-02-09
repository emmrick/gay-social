import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatbotConfig, useChatbotConversation, useSendChatbotMessage } from '@/hooks/useChatbotConfig';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatBotDialogProps {
  profileUserId: string;
  profileUsername: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChatBotDialog = ({ profileUserId, profileUsername, open, onOpenChange }: ChatBotDialogProps) => {
  const { data: config } = useChatbotConfig(profileUserId);
  const { data: history = [] } = useChatbotConversation(profileUserId);
  const sendMessage = useSendChatbotMessage();
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<{ role: string; content: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const greeting = config?.greeting_message || `Salut ! Je suis le chatbot de ${profileUsername}. Pose-moi des questions ! 😊`;

  // Merge history + local messages
  const allMessages = [
    ...history.map((m: any) => ({ role: m.role, content: m.content })),
    ...localMessages,
  ];

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages.length]);

  // Reset local messages when dialog opens
  useEffect(() => {
    if (open) setLocalMessages([]);
  }, [open]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || sendMessage.isPending) return;

    setInput('');
    setLocalMessages(prev => [...prev, { role: 'user', content: msg }]);

    try {
      const reply = await sendMessage.mutateAsync({
        profileUserId,
        message: msg,
        conversationHistory: allMessages,
      });
      setLocalMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      setLocalMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Désolé, je rencontre un problème technique. Essaie de contacter directement cette personne ! 😅' },
      ]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 h-[80vh] max-h-[600px] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                ChatBot de {profileUsername}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">🤖 Réponse automatique</p>
            </div>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div ref={scrollRef} className="p-4 space-y-3">
              {/* Greeting */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2"
              >
                <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="bg-secondary/80 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%]">
                  <p className="text-sm">{greeting}</p>
                </div>
              </motion.div>

              {/* Conversation */}
              <AnimatePresence>
                {allMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('flex gap-2', msg.role === 'user' && 'justify-end')}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl px-3 py-2 max-w-[80%] text-sm',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-secondary/80 rounded-tl-sm'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {sendMessage.isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="bg-secondary/80 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border/50 flex-shrink-0">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pose une question..."
              className="flex-1 text-sm h-10"
              maxLength={500}
              disabled={sendMessage.isPending}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-xl"
              disabled={!input.trim() || sendMessage.isPending}
            >
              {sendMessage.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            🤖 Réponses générées automatiquement • Contactez directement pour plus d'infos
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatBotDialog;
