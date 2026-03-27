import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield, Heart } from 'lucide-react';

interface AgeFilterBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxAge: number;
  minAge: number;
  onReactToProfile?: () => void;
}

const AgeFilterBlockedDialog = ({ open, onOpenChange, maxAge, minAge, onReactToProfile }: AgeFilterBlockedDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl max-w-[90vw]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-base">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            Filtre d'âge actif
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-3 pt-2">
            <p className="text-sm">
              Votre correspondant a activé le filtre d'âge et ne souhaite pas recevoir de messages de personnes en dehors de la tranche <strong>{minAge} – {maxAge} ans</strong>.
            </p>
            <div className="p-3 rounded-xl bg-secondary/50 space-y-2">
              <p className="text-xs text-muted-foreground">
                <strong>💡 Vous pouvez :</strong>
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Réagir à son profil — il recevra une notification</li>
                <li>Si cette personne vous envoie un message, le filtre sera levé pour vous</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {onReactToProfile && (
            <AlertDialogAction
              onClick={onReactToProfile}
              className="rounded-xl bg-pink-500 hover:bg-pink-600"
            >
              <Heart className="w-4 h-4 mr-1.5" />
              Réagir au profil
            </AlertDialogAction>
          )}
          <AlertDialogAction onClick={() => onOpenChange(false)} className="rounded-xl">
            Compris
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AgeFilterBlockedDialog;
