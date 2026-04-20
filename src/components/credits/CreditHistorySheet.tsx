import { History, ArrowDown, ArrowUp, Coins } from 'lucide-react';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCredits, CreditTransaction } from '@/hooks/useCredits';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const getTransactionLabel = (type: string): string => {
  const labels: Record<string, string> = {
    signup_bonus: 'Bonus inscription',
    daily_claim: 'Crédit quotidien',
    identity_verification: 'Vérification identité',
    referral_bonus: 'Bonus parrainage',
    purchase: 'Achat de crédits',
    private_message_text: 'Message privé',
    private_message_media: 'Photo/Vidéo privée',
    group_message_text: 'Message groupe',
    group_message_media: 'Média groupe',
    ephemeral_media: 'Média éphémère',
    album_share: 'Partage album',
    album_create: 'Création album',
    profile_reaction: 'Réaction profil',
    profile_view: 'Vue profil',
    nearby_unlock_30: 'Déblocage 30 profils',
    nearby_unlock_130: 'Déblocage 130 profils',
    passive_recharge: 'Recharge passive',
    daily_recharge: 'Recharge quotidienne',
  };
  return labels[type] || type;
};

const getCreditTypeBadge = (type: 'passive' | 'daily' | 'bonus' | 'purchased') => {
  const config = {
    passive: { label: 'Passif', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    daily: { label: 'Quotidien', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    bonus: { label: 'Bonus', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    purchased: { label: 'Achetés', className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  };
  const c = config[type];
  return <Badge variant="outline" className={cn("text-[10px] font-semibold", c.className)}>{c.label}</Badge>;
};

interface TransactionItemProps {
  transaction: CreditTransaction;
  index: number;
}

const TransactionItem = ({ transaction, index }: TransactionItemProps) => {
  const isPositive = transaction.amount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center",
          isPositive ? "bg-emerald-500/10" : "bg-red-500/10"
        )}>
          {isPositive ? (
            <ArrowDown className="w-4 h-4 text-emerald-500" />
          ) : (
            <ArrowUp className="w-4 h-4 text-red-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">
            {getTransactionLabel(transaction.transaction_type)}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground">
              {format(new Date(transaction.created_at), 'dd MMM à HH:mm', { locale: fr })}
            </span>
            {getCreditTypeBadge(transaction.credit_type)}
          </div>
        </div>
      </div>
      <span className={cn(
        "font-bold tabular-nums text-sm",
        isPositive ? "text-emerald-500" : "text-red-500"
      )}>
        {isPositive ? '+' : ''}{transaction.amount.toFixed(1)}
      </span>
    </motion.div>
  );
};

interface CreditHistorySheetProps {
  trigger?: React.ReactNode;
}

const CreditHistorySheet = ({ trigger }: CreditHistorySheetProps) => {
  const { transactions, transactionsLoading } = useCredits();

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <History className="w-4 h-4" />
            Historique
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md border-border/60">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-heading">
            <Coins className="w-5 h-5 text-primary" />
            Historique des crédits
          </SheetTitle>
          <SheetDescription className="text-xs">
            Vos 50 dernières transactions
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-150px)] mt-4 -mx-6 px-6">
          {transactionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse h-16 bg-muted rounded-2xl" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Aucune transaction</p>
              <p className="text-xs mt-1">Vos mouvements de crédits apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx, i) => (
                <TransactionItem key={tx.id} transaction={tx} index={i} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default CreditHistorySheet;
