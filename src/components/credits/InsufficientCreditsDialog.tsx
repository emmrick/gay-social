import { Coins, ShoppingCart, AlertTriangle, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useCredits } from '@/hooks/useCredits';
import { motion } from 'framer-motion';

interface InsufficientCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredCredits: number;
  actionName: string;
  hasLockedCredits?: boolean;
}

const InsufficientCreditsDialog = ({
  open,
  onOpenChange,
  requiredCredits,
  actionName,
  hasLockedCredits = false,
}: InsufficientCreditsDialogProps) => {
  const { totalCredits, dailyCredits, maxDailyCredits, availableCredits } = useCredits();
  const missing = requiredCredits - (availableCredits ?? totalCredits);
  const isCompletelyOut = (availableCredits ?? totalCredits) <= 0;
  const hasCreditsButLocked = hasLockedCredits && totalCredits >= requiredCredits && (availableCredits ?? 0) < requiredCredits;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="text-center">
          {hasCreditsButLocked ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-2"
              >
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </motion.div>
              <AlertDialogTitle className="text-xl text-center">
                Crédits verrouillés
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 text-center">
                <p>
                  Vous avez <strong className="text-primary">{totalCredits.toFixed(1)} crédits</strong> au total,
                  mais certains types de crédits sont verrouillés.
                </p>
                <p>
                  L'action "<strong>{actionName}</strong>" coûte{' '}
                  <strong className="text-primary">{requiredCredits} crédit{requiredCredits > 1 ? 's' : ''}</strong>.
                </p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    💡 Débloquez vos crédits pour continuer :
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Rendez-vous dans la barre de crédits et déverrouillez les types de crédits
                    (Passif, Bonus ou Achetés) pour les utiliser.
                  </p>
                </div>
              </AlertDialogDescription>
            </>
          ) : isCompletelyOut ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2"
              >
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </motion.div>
              <AlertDialogTitle className="text-xl text-center">
                Vous êtes à court de crédits !
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4 text-center">
                <p className="text-base">
                  Vous ne pouvez plus effectuer d'actions sur le site tant que vous n'avez pas de crédits.
                </p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Pour continuer, vous pouvez :
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-500" />
                      Attendre minuit pour recevoir <strong>{maxDailyCredits} crédits gratuits</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-primary" />
                      Acheter des crédits maintenant
                    </li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-2"
              >
                <Coins className="w-8 h-8 text-amber-500" />
              </motion.div>
              <AlertDialogTitle className="text-xl text-center">
                Crédits insuffisants
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 text-center">
                <p>
                  L'action "<strong>{actionName}</strong>" coûte{' '}
                  <strong className="text-primary">{requiredCredits} crédit{requiredCredits > 1 ? 's' : ''}</strong>.
                </p>
                <p>
                  Vous avez actuellement{' '}
                  <strong className="text-amber-600 dark:text-amber-400">{(availableCredits ?? totalCredits).toFixed(1)} crédits disponibles</strong>.
                  <br />
                  Il vous manque{' '}
                  <strong className="text-destructive">{missing.toFixed(1)} crédits</strong>.
                </p>
                {hasLockedCredits && (
                  <p className="text-xs text-muted-foreground italic">
                    ⚠️ Certains de vos crédits sont verrouillés. Débloquez-les pour les utiliser.
                  </p>
                )}
              </AlertDialogDescription>
            </>
          )}
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-4">
          <Button
            className="w-full justify-center gap-2 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600"
            onClick={() => {
              onOpenChange(false);
              window.location.href = '/?tab=credits';
            }}
          >
            <ShoppingCart className="w-4 h-4" />
            Acheter des crédits
          </Button>
          
          {!isCompletelyOut && (
            <AlertDialogCancel className="w-full">Annuler</AlertDialogCancel>
          )}
          
          <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            {maxDailyCredits} crédits gratuits se rechargent automatiquement à minuit
          </p>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default InsufficientCreditsDialog;
