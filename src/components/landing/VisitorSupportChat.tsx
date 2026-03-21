import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Headset, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface VisitorSupportChatProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'form' | 'chat';

const VisitorSupportChat = ({ isOpen, onClose }: VisitorSupportChatProps) => {
  const [step, setStep] = useState<Step>('form');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; sender_type: string; content: string; created_at: string }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
    }
  }, [newMessage]);

  // Realtime messages
  useEffect(() => {
    if (!sessionId) return;
    
    // Fetch existing messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('visitor_support_messages' as any)
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as any[]);
    };
    fetchMessages();

    const channel = supabase
      .channel(`visitor-support-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'visitor_support_messages',
        filter: `session_id=eq.${sessionId}`,
      }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as any]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const handleCreateSession = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('visitor_support_sessions' as any)
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          phone_number: phone.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId((data as any).id);

      // Send welcome message
      await supabase
        .from('visitor_support_messages' as any)
        .insert({
          session_id: (data as any).id,
          sender_type: 'system',
          content: `Bienvenue ${firstName} ! Un conseiller va prendre en charge votre demande. Vous pouvez décrire votre problème en attendant.`,
        });

      // Google Ads conversion tracking - Contact
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', {
          'send_to': 'AW-18000558154/mbyNCImp54QcEMrwqodD',
        });
      }

      setStep('chat');
    } catch (err) {
      console.error('Error creating session:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !sessionId || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      await supabase
        .from('visitor_support_messages' as any)
        .insert({
          session_id: sessionId,
          sender_type: 'visitor',
          content,
        });
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  }, [newMessage, sessionId, sending]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[360px] h-[100dvh] sm:h-[520px] sm:max-h-[calc(100vh-6rem)] sm:rounded-2xl border-0 sm:border border-border/50 bg-background shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0 bg-primary/5 border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Headset className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Service Client</h3>
              <p className="text-[11px] text-muted-foreground">Gay Social · Assistance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {step === 'form' ? (
        /* Identity form */
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="text-center py-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <Headset className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Contactez-nous</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Pour vous identifier, veuillez remplir les informations ci-dessous.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="visitor-firstname" className="text-xs">Prénom *</Label>
              <Input
                id="visitor-firstname"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Votre prénom"
                maxLength={50}
              />
            </div>
            <div>
              <Label htmlFor="visitor-lastname" className="text-xs">Nom *</Label>
              <Input
                id="visitor-lastname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Votre nom"
                maxLength={50}
              />
            </div>
            <div>
              <Label htmlFor="visitor-email" className="text-xs">E-mail (optionnel)</Label>
              <Input
                id="visitor-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="visitor-phone" className="text-xs">Téléphone (optionnel)</Label>
              <Input
                id="visitor-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
                maxLength={20}
              />
            </div>
          </div>

          <Button
            onClick={handleCreateSession}
            disabled={!firstName.trim() || !lastName.trim() || creating}
            className="w-full gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            Démarrer la conversation
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            Vos informations sont protégées et utilisées uniquement pour votre assistance.
          </p>
        </div>
      ) : (
        /* Chat view */
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex gap-2', msg.sender_type === 'visitor' && 'justify-end')}>
                {msg.sender_type !== 'visitor' && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Headset className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
                  msg.sender_type === 'visitor'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : msg.sender_type === 'system'
                    ? 'bg-secondary/70 text-foreground rounded-tl-sm border border-border/30 italic'
                    : 'bg-secondary/70 text-foreground rounded-tl-sm border border-border/30'
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-border">
            <div className="p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex gap-2 items-end"
              >
                <Textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Votre message..."
                  className="flex-1 text-[13px] min-h-[40px] max-h-[100px] resize-none rounded-xl"
                  rows={1}
                  maxLength={1000}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 rounded-xl flex-shrink-0"
                  disabled={!newMessage.trim() || sending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default VisitorSupportChat;
