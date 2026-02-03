import { History, ArrowDown, ArrowUp, Coins } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCredits, CreditTransaction } from '@/hooks/useCredits';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  };
  return labels[type] || type;
};

const getCreditTypeBadge = (type: 'passive' | 'daily' | 'bonus' | 'purchased') => {
  switch (type) {
    case 'passive':
      return <Badge variant="outline" className="text-xs bg-amber-400/10 text-amber-600 border-amber-400/30">Passif</Badge>;
    case 'daily':
      return <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">Quotidien</Badge>;
    case 'bonus':
      return <Badge variant="outline" className="text-xs bg-blue-700/10 text-blue-700 border-blue-700/30">Bonus</Badge>;
    case 'purchased':
      return <Badge variant="outline" className="text-xs bg-sky-400/10 text-sky-600 border-sky-400/30">Achetés</Badge>;
  }
};

interface TransactionItemProps {
  transaction: CreditTransaction;
}

const TransactionItem = ({ transaction }: TransactionItemProps) => {
  const isPositive = transaction.amount > 0;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          isPositive ? "bg-green-500/10" : "bg-red-500/10"
        )}>
          {isPositive ? (
            <ArrowDown className="w-4 h-4 text-green-500" />
          ) : (
            <ArrowUp className="w-4 h-4 text-red-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">
            {getTransactionLabel(transaction.transaction_type)}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {format(new Date(transaction.created_at), 'dd MMM à HH:mm', { locale: fr })}
            </span>
            {getCreditTypeBadge(transaction.credit_type)}
          </div>
        </div>
      </div>
      <span className={cn(
        "font-semibold",
        isPositive ? "text-green-500" : "text-red-500"
      )}>
        {isPositive ? '+' : ''}{transaction.amount.toFixed(2)}
      </span>
    </div>
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
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            Historique des crédits
          </SheetTitle>
          <SheetDescription>
            Vos 50 dernières transactions
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-150px)] mt-4 -mx-6 px-6">
          {transactionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune transaction</p>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default CreditHistorySheet;
