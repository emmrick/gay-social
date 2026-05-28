import { useState } from 'react';
import { Beaker, Mail, Copy, Check, HeartHandshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BetaInterestMessageProps {
  email: string;
  amount: number;
  createdAt?: string | null;
}

const BetaInterestMessage = ({ email, amount, createdAt }: BetaInterestMessageProps) => {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  return (
    <div className={cn(
      "rounded-2xl p-4 w-[280px] max-w-[80vw]",
      "bg-gradient-to-br from-primary/15 via-fuchsia-500/10 to-amber-500/15",
      "border border-primary/30 shadow-lg backdrop-blur-sm"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Beaker className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground leading-tight">Nouvelle inscription bêta</p>
          <p className="text-[11px] text-muted-foreground">Programme de test fermé</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 rounded-xl bg-background/60 px-3 py-2 border border-border/60">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">{email}</span>
          </div>
          <button
            onClick={copyEmail}
            className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Copier l'adresse e-mail"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl bg-background/60 px-3 py-2 border border-border/60">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-sm text-muted-foreground">Don souhaité</span>
          </div>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{amount} €</span>
        </div>
      </div>

      {createdAt && (
        <p className="text-[10px] text-muted-foreground mt-3 text-right">
          {format(new Date(createdAt), 'd MMM yyyy · HH:mm', { locale: fr })}
        </p>
      )}
    </div>
  );
};

export default BetaInterestMessage;
