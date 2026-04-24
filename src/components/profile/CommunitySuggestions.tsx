import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Loader2, Lightbulb, TrendingUp, Clock, CheckCircle2, Eye, Coins, Sparkles, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useCommunitySuggestions, useCastSuggestionVote, type CommunitySuggestion } from '@/hooks/useSuggestionVotes';

const VOTE_COST = 1;

type SortMode = 'top' | 'recent';

const STATUS_BADGE: Record<string, { label: string; icon: any; className: string }> = {
  in_review: {
    label: 'En examen',
    icon: Eye,
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  },
  approved: {
    label: 'Approuvée',
    icon: CheckCircle2,
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  },
};

const CommunitySuggestions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { availableCredits, totalCredits, isLoading: creditsLoading } = useCredits();
  const { data: suggestions, isLoading } = useCommunitySuggestions();
  const castVote = useCastSuggestionVote();
  const [sort, setSort] = useState<SortMode>('top');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [insufficientOpen, setInsufficientOpen] = useState(false);

  const balance = availableCredits ?? totalCredits ?? 0;
  const isBroke = !creditsLoading && balance < VOTE_COST;

  const sorted = useMemo(() => {
    if (!suggestions) return [];
    const list = [...suggestions];
    if (sort === 'top') {
      list.sort((a, b) => b.score - a.score || b.upvotes - a.upvotes);
    } else {
      list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return list;
  }, [suggestions, sort]);

  const goToCredits = () => {
    setInsufficientOpen(false);
    navigate('/credits');
  };

  const handleVote = async (s: CommunitySuggestion, type: 'up' | 'down') => {
    if (!user) return;
    if (s.user_id === user.id) {
      toast.info('Vous ne pouvez pas voter pour votre propre idée');
      return;
    }

    // Vérification client : un nouveau vote coûte 1 crédit.
    // Changer ou retirer son vote est gratuit.
    const isNewVote = s.myVote === null;
    if (isNewVote && balance < VOTE_COST) {
      setInsufficientOpen(true);
      return;
    }

    setPendingId(s.id);
    try {
      const res = await castVote.mutateAsync({ suggestionId: s.id, voteType: type });
      if (res.action === 'added') {
        toast.success(
          type === 'up' ? '👍 Vote pris en compte (-1 crédit)' : '👎 Vote pris en compte (-1 crédit)'
        );
      } else if (res.action === 'changed') {
        toast.success('Vote modifié');
      } else if (res.action === 'removed') {
        toast.success('Vote retiré');
      }
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg === 'INSUFFICIENT_CREDITS') {
        // Filet de sécurité côté serveur
        setInsufficientOpen(true);
      } else if (msg === 'CANNOT_VOTE_OWN_SUGGESTION') {
        toast.info('Vous ne pouvez pas voter pour votre propre idée');
      } else {
        toast.error('Erreur lors du vote', { description: msg });
      }
    } finally {
      setPendingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Lightbulb className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Aucune idée publique pour le moment.</p>
        <p className="text-xs mt-1">Soyez le premier à proposer une amélioration !</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {/* Tri + info coût */}
      <div className="flex items-center justify-between gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10 -mx-1 px-1">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={sort === 'top' ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setSort('top')}
          >
            <TrendingUp className="w-3 h-3 mr-1" /> Populaires
          </Button>
          <Button
            size="sm"
            variant={sort === 'recent' ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setSort('recent')}
          >
            <Clock className="w-3 h-3 mr-1" /> Récentes
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">1 vote = 1 crédit</p>
      </div>

      {sorted.map((s) => {
        const cfg = STATUS_BADGE[s.status];
        const StatusIcon = cfg?.icon;
        const isPending = pendingId === s.id;
        const isOwn = s.user_id === user?.id;
        return (
          <div
            key={s.id}
            className="flex gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors"
          >
            {/* Colonne votes */}
            <div className="flex flex-col items-center gap-0.5 min-w-[44px]">
              <button
                onClick={() => handleVote(s, 'up')}
                disabled={isPending || isOwn}
                aria-label="Pouce en l'air"
                className={cn(
                  'p-1.5 rounded-md transition-all',
                  s.myVote === 'up'
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  (isPending || isOwn) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isPending && s.myVote !== 'up' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsUp className={cn('w-4 h-4', s.myVote === 'up' && 'fill-current')} />
                )}
              </button>
              <span
                className={cn(
                  'text-sm font-bold tabular-nums',
                  s.score > 0 && 'text-green-600 dark:text-green-400',
                  s.score < 0 && 'text-red-600 dark:text-red-400'
                )}
              >
                {s.score > 0 ? `+${s.score}` : s.score}
              </span>
              <button
                onClick={() => handleVote(s, 'down')}
                disabled={isPending || isOwn}
                aria-label="Pouce en bas"
                className={cn(
                  'p-1.5 rounded-md transition-all',
                  s.myVote === 'down'
                    ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  (isPending || isOwn) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isPending && s.myVote !== 'down' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsDown className={cn('w-4 h-4', s.myVote === 'down' && 'fill-current')} />
                )}
              </button>
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm flex-1 leading-snug">{s.title}</h4>
                {cfg && (
                  <Badge variant="outline" className={cn(cfg.className, 'flex-shrink-0 text-[10px]')}>
                    {StatusIcon && <StatusIcon className="w-2.5 h-2.5 mr-1" />}
                    {cfg.label}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                {s.description}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={s.authorAvatarUrl ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(s.authorUsername ?? '?').slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">
                  {isOwn ? 'Vous' : s.authorUsername ?? 'Membre'}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(s.created_at), 'd MMM', { locale: fr })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CommunitySuggestions;
