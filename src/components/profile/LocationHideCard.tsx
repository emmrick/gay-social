import { useState } from 'react';
import { MapPin, MapPinOff, Coins, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLocationHide } from '@/hooks/useLocationHide';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const HIDE_COST = 30;

const formatRemaining = (seconds: number): string => {
  if (seconds <= 0) return '0 min';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}min`;
  return `${m} min`;
};

const LocationHideCard = () => {
  const { status, loading, acting, purchase, toggle } = useLocationHide();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasTimeLeft = status.has_period && status.remaining_seconds > 0;
  const isActive = status.is_hidden && status.remaining_seconds > 0;

  const handleToggleSwitch = async (checked: boolean) => {
    if (checked) {
      // L'utilisateur veut masquer
      if (hasTimeLeft) {
        const result = await toggle(true);
        if (!result?.success) {
          toast({
            title: 'Erreur',
            description: result?.error || 'Impossible d\'activer le masquage.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: '🛡️ Position masquée',
            description: `Temps restant : ${formatRemaining(result.remaining_seconds)}`,
          });
        }
      } else {
        // Doit acheter
        setConfirmOpen(true);
      }
    } else {
      // Désactiver le masquage (mise en pause, conserve le temps)
      const result = await toggle(false);
      if (!result?.success) {
        toast({
          title: 'Erreur',
          description: result?.error || 'Impossible de réactiver la position.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: '📍 Position réactivée',
          description: `Temps de masquage conservé : ${formatRemaining(result.remaining_seconds)}`,
        });
      }
    }
  };

  const handleConfirmPurchase = async () => {
    setConfirmOpen(false);
    const result = await purchase();
    if (!result?.success) {
      toast({
        title: 'Achat impossible',
        description: result?.error || 'Crédits insuffisants.',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: '🛡️ Position masquée pour 24h',
      description: `${HIDE_COST} crédits débités. Vous pouvez activer/désactiver librement pendant 24h.`,
    });
  };

  return (
    <>
      <div className={cn(
        "relative overflow-hidden rounded-2xl border p-4 transition-all",
        isActive
          ? "border-purple-500/40 bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent"
          : "border-border/30 bg-muted/40"
      )}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
            isActive
              ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30"
              : "bg-muted text-muted-foreground"
          )}>
            {isActive ? <MapPinOff className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-[15px] text-foreground leading-tight">
                Masquer ma position
              </h4>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 inline-flex items-center gap-0.5">
                <Coins className="w-2.5 h-2.5" />
                {HIDE_COST}
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
              {isActive
                ? 'Tu n\'apparais plus dans la proximité.'
                : hasTimeLeft
                  ? 'Période en pause — tu apparais sur la carte.'
                  : `${HIDE_COST} crédits pour 24h cumulables (pause/reprise libre).`
              }
            </p>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground flex-shrink-0 mt-1" />
          ) : (
            <Switch
              checked={isActive}
              onCheckedChange={handleToggleSwitch}
              disabled={acting}
              className="flex-shrink-0 mt-1"
            />
          )}
        </div>

        {/* Countdown */}
        {hasTimeLeft && (
          <div className={cn(
            "mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium",
            isActive
              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
              : "bg-muted/60 text-muted-foreground"
          )}>
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {isActive ? 'Expire dans' : 'Temps restant en pause'} :{' '}
              <strong>{formatRemaining(status.remaining_seconds)}</strong>
            </span>
          </div>
        )}

        {/* Repurchase hint when expired */}
        {!hasTimeLeft && status.has_period === false && status.expires_at && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-muted/60 text-[12px] text-muted-foreground">
            ⏱️ Période écoulée. Active à nouveau pour racheter 24h.
          </div>
        )}

        {/* Purchase button when no period */}
        {!loading && !hasTimeLeft && (
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-3 h-9 text-[13px] border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
            onClick={() => setConfirmOpen(true)}
            disabled={acting}
          >
            {acting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Coins className="w-4 h-4 mr-1.5" />}
            Acheter 24h pour {HIDE_COST} crédits
          </Button>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MapPinOff className="w-5 h-5 text-purple-500" />
              Masquer ta position
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-1">
              <span className="block">
                Tu vas dépenser <strong className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />{HIDE_COST} crédits
                </strong> pour masquer ta position pendant <strong>24 heures</strong>.
              </span>
              <span className="block text-xs">
                💡 Tu peux activer/désactiver librement le masquage pendant ces 24h sans coût supplémentaire.
                Le temps restant est conservé en pause. Une fois écoulé, il faudra racheter 30 crédits.
              </span>
              <span className="block text-xs text-muted-foreground italic">
                Note : ce coût élevé est volontaire — Gay Social privilégie les rencontres réelles, pas la discrétion permanente.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPurchase}
              disabled={acting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {acting && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Confirmer ({HIDE_COST} crédits)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LocationHideCard;
