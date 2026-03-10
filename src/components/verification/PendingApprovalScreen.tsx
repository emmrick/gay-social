import { Clock, LogOut, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const PendingApprovalScreen = () => {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl border-primary/30">
        <CardContent className="p-6 space-y-6">
          {/* Animated icon */}
          <div className="flex justify-center">
            <div className="relative w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-primary" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-display font-bold">
              Compte en attente d'approbation
            </h1>
            <p className="text-muted-foreground text-sm">
              Tes documents ont bien été reçus ! Un modérateur les examine actuellement.
            </p>
          </div>

          {/* Status card */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold">Vérification en cours</p>
                <p className="text-xs text-muted-foreground">
                  Le traitement prend généralement quelques heures.
                </p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Que se passe-t-il ensuite ?</p>
                <ul className="text-muted-foreground mt-2 space-y-1.5 text-xs">
                  <li>• Tu recevras une notification dès que ta vérification sera validée.</li>
                  <li>• Si tes documents ne sont pas conformes, tu pourras soumettre une nouvelle demande.</li>
                  <li>• Tu peux fermer cette page et revenir plus tard.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </Button>
          </div>

          {/* Username */}
          {profile && (
            <p className="text-center text-xs text-muted-foreground">
              Connecté en tant que <span className="font-medium">{profile.username}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApprovalScreen;
