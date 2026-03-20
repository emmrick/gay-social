import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShieldX, LogOut, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import BlockedUserSupportChat from '@/components/support/BlockedUserSupportChat';

interface BlockedUserScreenProps {
  reason?: string | null;
  blockedAt?: string;
}

const BlockedUserScreen = ({ reason, blockedAt }: BlockedUserScreenProps) => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Compte suspendu
          </h1>
          <p className="text-muted-foreground">
            Votre compte a été suspendu pour violation des règles de la communauté.
          </p>
        </div>

        {reason && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm font-medium text-destructive mb-1">Raison :</p>
            <p className="text-sm text-foreground">{reason}</p>
          </div>
        )}

        {blockedAt && (
          <p className="text-xs text-muted-foreground">
            Date de suspension : {format(new Date(blockedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </p>
        )}

        <div className="pt-4 space-y-3">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 justify-center mb-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Besoin d'aide ?</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Contactez notre service client en cliquant sur le bouton en bas à droite pour obtenir des explications ou demander un déblocage.
            </p>
          </div>

          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </Button>
        </div>
      </div>

      {/* Support chat widget */}
      <BlockedUserSupportChat />
    </div>
  );
};

export default BlockedUserScreen;
