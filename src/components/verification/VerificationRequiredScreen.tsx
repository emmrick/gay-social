import { useState } from 'react';
import { Shield, AlertTriangle, LogOut, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useIdentityVerification } from '@/hooks/useIdentityVerification';
import { useVerificationDeadline } from '@/hooks/useVerificationDeadline';
import IdentityVerificationDialog from './IdentityVerificationDialog';

const VerificationRequiredScreen = () => {
  const { signOut, profile } = useAuth();
  const { verification } = useIdentityVerification();
  const { daysUntilPurge } = useVerificationDeadline();
  const isVerificationRejected = verification?.status === 'rejected';
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className={`max-w-md w-full shadow-xl ${isVerificationRejected ? 'border-destructive/50' : 'border-primary/30'}`}>
        <CardContent className="p-6 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              isVerificationRejected
                ? 'bg-destructive/20'
                : 'bg-primary/20'
            }`}>
              {isVerificationRejected ? (
                <XCircle className="w-10 h-10 text-destructive" />
              ) : (
                <Shield className="w-10 h-10 text-primary" />
              )}
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-display font-bold">
              {isVerificationRejected 
                ? 'Vérification refusée' 
                : 'Vérification d\'identité obligatoire'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isVerificationRejected 
                ? 'Ta demande de vérification n\'a pas pu être validée. Tu peux soumettre une nouvelle demande.'
                : 'Avant d\'accéder à GaySocial, tu dois vérifier ton identité.'
              }
            </p>
          </div>

          {/* Rejection reason */}
          {isVerificationRejected && verification?.rejection_reason && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Motif du refus</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {verification.rejection_reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Purge warning */}
          {daysUntilPurge !== null && daysUntilPurge <= 30 && (
            <div className={`rounded-xl p-4 border ${
              daysUntilPurge <= 3 
                ? 'bg-destructive/10 border-destructive/40' 
                : daysUntilPurge <= 7 
                  ? 'bg-yellow-500/10 border-yellow-500/40' 
                  : 'bg-orange-500/10 border-orange-500/30'
            }`}>
              <div className="flex items-start gap-3">
                <Trash2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  daysUntilPurge <= 3 ? 'text-destructive' : 'text-orange-500'
                }`} />
                <div>
                  <p className={`text-sm font-bold ${
                    daysUntilPurge <= 3 ? 'text-destructive' : 'text-orange-600 dark:text-orange-400'
                  }`}>
                    {daysUntilPurge <= 0 
                      ? '🚨 Suppression imminente !' 
                      : `⏰ Suppression dans ${daysUntilPurge} jour${daysUntilPurge > 1 ? 's' : ''}`
                    }
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Si tu ne vérifies pas ton identité, toutes tes données (profil, messages, photos, albums) seront <strong>définitivement supprimées</strong> de tous nos serveurs sans possibilité de récupération.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Explanation box */}
          <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">
                  {isVerificationRejected ? 'Comment réessayer ?' : 'Pourquoi cette étape ?'}
                </p>
                <p className="text-muted-foreground mt-1">
                  {isVerificationRejected 
                    ? 'Assure-toi que tes photos soient nettes, bien éclairées et que ton visage soit clairement visible sur le selfie.'
                    : 'La vérification d\'identité est une étape essentielle pour empêcher les mineurs de s\'inscrire. Notre site étant axé sur du contenu adulte, nous avons l\'obligation de nous assurer que tous nos membres ont bien 18 ans ou plus. Nous ne pouvons être tenus responsables de toute navigation non protégée.'
                  }
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
              {isVerificationRejected 
                ? 'Nouvelle vérification'
                : 'Vérifier mon identité'}
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