/**
 * IdeasPage (/idees) — Page communautaire listant uniquement les idées
 * APPROUVÉES par la modération.
 *
 * - 👍 / 👎 (1 crédit par nouveau vote, gratuit pour modifier/retirer)
 * - Bouton "Voir le détail" qui ouvre le SuggestionDialog existant
 *   (description complète, exemples, pièces jointes, propre suivi)
 * - Bouton "Proposer une idée" qui ouvre le même dialog en mode création
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  TrendingUp,
  Clock,
  Eye,
  PenLine,
  CheckCircle2,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  useCommunitySuggestions,
  useCastSuggestionVote,
} from '@/hooks/useSuggestionVotes';
import SuggestionDialog from '@/components/profile/SuggestionDialog';
import SEOHead from '@/components/seo/SEOHead';

const VOTE_COST = 1;
type SortMode = 'top' | 'recent';

const IdeasPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { availableCredits, totalCredits, isLoading: creditsLoading } = useCredits();
  const { data: suggestions, isLoading } = useCommunitySuggestions();
  const castVote = useCastSuggestionVote();

  const [sort, setSort] = useState<SortMode>('top');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const balance = availableCredits ?? totalCredits ?? 0;

  // On ne garde QUE les idées approuvées (cf. brief).
  const approved = useMemo(() => {
    const list = (suggestions ?? []).filter((s) => s.status === 'approved');
    if (sort === 'top') {
      list.sort((a, b) => b.score - a.score || b.upvotes - a.upvotes);
    } else {
      list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return list;
  }, [suggestions, sort]);

  const handleVote = async (
    s: (typeof approved)[number],
    type: 'up' | 'down',
  ) => {
    if (!user) return;
    if (s.user_id === user.id) {
      toast.info('Vous ne pouvez pas voter pour votre propre idée');
      return;
    }
    const isNewVote = s.myVote === null;
    if (isNewVote && balance < VOTE_COST) {
      setInsufficientOpen(true);
      return;
    }
    setPendingId(s.id);
    try {
      const res = await castVote.mutateAsync({ suggestionId: s.id, voteType: type });
      if (res.action === 'added') {
        toast.success(type === 'up' ? '👍 Vote pris en compte' : '👎 Vote pris en compte');
      } else if (res.action === 'changed') {
        toast.success('Vote modifié');
      } else if (res.action === 'removed') {
        toast.success('Vote retiré');
      }
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg === 'INSUFFICIENT_CREDITS') setInsufficientOpen(true);
      else if (msg === 'CANNOT_VOTE_OWN_SUGGESTION')
        toast.info('Vous ne pouvez pas voter pour votre propre idée');
      else toast.error('Erreur lors du vote', { description: msg });
    } finally {
      setPendingId(null);
    }
  };

  const openDetail = (id: string) => {
    setDetailId(id);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setDetailId(null);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <SEOHead
        title="Idées de la communauté | Gay Social"
        description="Découvrez et votez pour les idées approuvées par la communauté Gay Social. Soutenez les fonctionnalités qui comptent pour vous."
        canonical="https://gaysocial.fr/idees"
      />

      {/* Header sticky */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-2 px-3 h-12">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate(-1)}
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h1 className="font-display text-base font-bold truncate">
              Idées de la communauté
            </h1>
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
            <PenLine className="w-3.5 h-3.5 mr-1" />
            Proposer
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 py-4 space-y-3">
        {/* Sous-titre + solde */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Uniquement les idées <strong className="text-foreground">approuvées</strong> par
            la modération. Votez pour celles qui vous intéressent (1 crédit par vote).
          </p>
        </div>

        {/* Tri + solde */}
        <div className="flex items-center justify-between gap-2">
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
          <div
            className={cn(
              'flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border',
              balance < VOTE_COST
                ? 'bg-destructive/10 text-destructive border-destructive/30'
                : 'bg-muted/50 text-muted-foreground border-border',
            )}
          >
            <Coins className="w-3 h-3" />
            <span className="tabular-nums">{creditsLoading ? '…' : balance}</span>
          </div>
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : approved.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Lightbulb className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune idée approuvée pour le moment.</p>
            <p className="text-xs mt-1">
              Les idées proposées par les membres apparaissent ici après validation par
              l'équipe.
            </p>
            <Button size="sm" className="mt-4" onClick={openCreate}>
              <PenLine className="w-3.5 h-3.5 mr-1" />
              Proposer la première idée
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {approved.map((s, i) => {
              const isPending = pendingId === s.id;
              const isOwn = s.user_id === user?.id;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.2), duration: 0.25 }}
                  className="flex gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors"
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
                        (isPending || isOwn) && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      {isPending && s.myVote !== 'up' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ThumbsUp
                          className={cn('w-4 h-4', s.myVote === 'up' && 'fill-current')}
                        />
                      )}
                    </button>
                    <span
                      className={cn(
                        'text-sm font-bold tabular-nums',
                        s.score > 0 && 'text-green-600 dark:text-green-400',
                        s.score < 0 && 'text-red-600 dark:text-red-400',
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
                        (isPending || isOwn) && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      {isPending && s.myVote !== 'down' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ThumbsDown
                          className={cn('w-4 h-4', s.myVote === 'down' && 'fill-current')}
                        />
                      )}
                    </button>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm leading-snug flex-1">
                        {s.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 flex-shrink-0 text-[10px]"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                        Approuvée
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {s.description}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={s.authorAvatarUrl ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(s.authorUsername ?? '?').slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {isOwn ? 'Vous' : s.authorUsername ?? 'Membre'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(s.created_at), 'd MMM', { locale: fr })}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-7 text-[11px] px-2 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => openDetail(s.id)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Détail
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Détail / création */}
      <SuggestionDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setDetailId(null);
        }}
        initialSuggestionId={detailId}
      />

      {/* Crédits insuffisants */}
      <AlertDialog open={insufficientOpen} onOpenChange={setInsufficientOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mb-2">
              <Coins className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-center">Crédits insuffisants</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Voter pour une idée coûte <strong className="text-foreground">1 crédit</strong>.
              Modifier ou retirer un vote existant reste gratuit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="mt-0">Plus tard</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setInsufficientOpen(false);
                navigate('/credits');
              }}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              <Coins className="w-4 h-4 mr-1.5" />
              Recharger
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IdeasPage;
