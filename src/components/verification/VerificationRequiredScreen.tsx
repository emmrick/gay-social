import { useState, useEffect } from 'react';
import { Shield, Clock, AlertTriangle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useVerificationDeadline } from '@/hooks/useVerificationDeadline';
import IdentityVerificationDialog from './IdentityVerificationDialog';

const VerificationRequiredScreen = () => {
  const { signOut, profile } = useAuth();
  const { hoursRemaining, minutesRemaining, isDeadlinePassed, deadlineDate } = useVerificationDeadline();
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: hoursRemaining || 0, minutes: minutesRemaining || 0 });

  // Update countdown every minute
  useEffect(() => {
    if (isDeadlinePassed || !deadlineDate) return;

    const updateTime = () => {
      const now = new Date();
      const diff = deadlineDate.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0 });
        return;
      }
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [deadlineDate, isDeadlinePassed]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/30 shadow-xl">
        <CardContent className="p-6 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              isDeadlinePassed 
                ? 'bg-destructive/20' 
                : 'bg-yellow-500/20'
            }`}>
              {isDeadlinePassed ? (
                <AlertTriangle className="w-10 h-10 text-destructive" />
              ) : (
                <Clock className="w-10 h-10 text-yellow-500" />
              )}
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-display font-bold">
              {isDeadlinePassed ? 'Accès temporairement bloqué' : 'Vérification requise'}
            </h1>
            <p className="text-muted-foreground">
              {isDeadlinePassed 
                ? 'Tu dois compléter la vérification de ton identité pour accéder à GayConnect.'
                : 'Complete ta vérification d\'identité pour continuer à utiliser GayConnect.'
              }
            </p>
          </div>

          {/* Countdown */}
          {!isDeadlinePassed && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    Temps restant
                  </p>
                  <p className="text-2xl font-bold font-mono">
                    {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}min
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Pourquoi cette vérification ?</p>
                <p className="text-muted-foreground mt-1">
                  Pour garantir un espace sécurisé et réservé aux adultes, nous devons vérifier 
                  que tous nos membres ont bien 18 ans ou plus.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              variant="hero" 
              className="w-full gap-2"
              onClick={() => setShowVerificationDialog(true)}
            >
              <Shield className="w-4 h-4" />
              {isDeadlinePassed ? 'Compléter la vérification' : 'Reprendre la vérification'}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </Button>
          </div>

          {/* Username hint */}
          {profile && (
            <p className="text-center text-xs text-muted-foreground">
              Connecté en tant que <span className="font-medium">{profile.username}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <IdentityVerificationDialog 
        open={showVerificationDialog} 
        onOpenChange={setShowVerificationDialog}
      />
    </div>
  );
};

export default VerificationRequiredScreen;
