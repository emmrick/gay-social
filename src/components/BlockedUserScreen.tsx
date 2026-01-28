import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShieldX, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

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
          <p className="text-sm text-muted-foreground">
            Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support.
          </p>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BlockedUserScreen;
