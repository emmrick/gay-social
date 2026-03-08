import { useState } from 'react';
import { Gift, Loader2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deductCredits, checkSufficientCredits } from '@/hooks/useCredits';
import { addCreditsToUser } from '@/hooks/useCredits';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface BirthdayGiftButtonProps {
  recipientId: string;
  recipientUsername: string;
}

const MAX_GIFT = 5;

const BirthdayGiftButton = ({ recipientId, recipientUsername }: BirthdayGiftButtonProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(1);
  const [sending, setSending] = useState(false);
  const currentYear = new Date().getFullYear();

  // Check if user already sent a gift this year
  const { data: existingGift } = useQuery({
    queryKey: ['birthday-gift', user?.id, recipientId, currentYear],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('birthday_gifts' as any)
        .select('amount')
        .eq('sender_id', user.id)
        .eq('recipient_id', recipientId)
        .eq('gift_year', currentYear)
        .maybeSingle();
      return (data as unknown as { amount: number }) ?? null;
    },
    enabled: !!user?.id && user?.id !== recipientId,
  });

  if (!user || user.id === recipientId || existingGift) return null;

  const handleSend = async () => {
    if (!user?.id) return;
    setSending(true);

    try {
      // Check credits
      const hasCredits = await checkSufficientCredits(user.id, amount);
      if (!hasCredits) {
        toast.error('Crédits insuffisants');
        setSending(false);
        return;
      }

      // Deduct from sender
      const result = await deductCredits(
        user.id,
        amount,
        'birthday_gift',
        `Cadeau d'anniversaire pour ${recipientUsername}`,
        true
      );

      if (!result.success) {
        toast.error(result.error || 'Erreur');
        setSending(false);
        return;
      }

      // Add to recipient
      await addCreditsToUser(
        recipientId,
        amount,
        'bonus',
        'birthday_gift',
        `Cadeau d'anniversaire de la part d'un membre`
      );

      // Record the gift
      await supabase
        .from('birthday_gifts' as any)
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          amount,
          gift_year: currentYear,
        } as any);

      queryClient.invalidateQueries({ queryKey: ['birthday-gift', user.id, recipientId, currentYear] });
      
      toast.success(`🎁 ${amount} crédit${amount > 1 ? 's' : ''} offert${amount > 1 ? 's' : ''} à ${recipientUsername} !`);
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'envoi du cadeau');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      >
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-pink-500/30 text-pink-500 hover:bg-pink-500/10"
          onClick={() => setOpen(true)}
        >
          <Gift className="w-4 h-4" />
          Offrir des crédits
        </Button>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎂 Cadeau d'anniversaire
            </DialogTitle>
            <DialogDescription>
              Offre des crédits à {recipientUsername} pour son anniversaire !
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-4 py-6">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => setAmount(Math.max(1, amount - 1))}
              disabled={amount <= 1}
            >
              <Minus className="w-4 h-4" />
            </Button>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={amount}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-center"
              >
                <div className="text-4xl font-bold">{amount}</div>
                <div className="text-sm text-muted-foreground">crédit{amount > 1 ? 's' : ''}</div>
              </motion.div>
            </AnimatePresence>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => setAmount(Math.min(MAX_GIFT, amount + 1))}
              disabled={amount >= MAX_GIFT}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Maximum {MAX_GIFT} crédits par anniversaire
          </p>

          <DialogFooter>
            <Button
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Gift className="w-4 h-4 mr-2" />
              )}
              Offrir {amount} crédit{amount > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BirthdayGiftButton;
