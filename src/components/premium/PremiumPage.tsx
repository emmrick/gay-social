import { 
  Crown, 
  Check, 
  Camera, 
  Users, 
  MessageCircle, 
  Eye, 
  FolderOpen, 
  Shield, 
  Loader2,
  Sparkles,
  ExternalLink,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSubscription, REVOLUT_PAYMENT_LINK } from '@/hooks/useSubscription';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReferralSection from './ReferralSection';

interface FeatureComparisonProps {
  feature: string;
  icon: React.ReactNode;
  freeValue: string;
  premiumValue: string;
}

const FeatureComparison = ({ feature, icon, freeValue, premiumValue }: FeatureComparisonProps) => (
  <div className="grid grid-cols-3 gap-2 py-3 border-b border-border/50 last:border-0">
    <div className="flex items-center gap-2 col-span-1">
      {icon}
      <span className="text-xs font-medium">{feature}</span>
    </div>
    <div className="flex items-center justify-center col-span-1">
      <span className="text-xs text-muted-foreground">{freeValue}</span>
    </div>
    <div className="flex items-center justify-center col-span-1">
      <span className="text-xs text-primary font-medium">{premiumValue}</span>
    </div>
  </div>
);

const PremiumPage = () => {
  const { isPremium, subscribed, subscriptionEnd, isLoading, startCheckout } = useSubscription();

  const features = [
    {
      feature: 'Médias éphémères',
      icon: <Camera className="w-3 h-3 text-primary" />,
      freeValue: '1/jour',
      premiumValue: '∞',
    },
    {
      feature: 'Photos profil',
      icon: <Eye className="w-3 h-3 text-primary" />,
      freeValue: '10/jour',
      premiumValue: '∞',
    },
    {
      feature: 'Groupes',
      icon: <Users className="w-3 h-3 text-primary" />,
      freeValue: '3',
      premiumValue: 'Tous',
    },
    {
      feature: 'Conversations',
      icon: <MessageCircle className="w-3 h-3 text-primary" />,
      freeValue: '10/sem',
      premiumValue: '∞',
    },
    {
      feature: 'Albums',
      icon: <FolderOpen className="w-3 h-3 text-primary" />,
      freeValue: '1',
      premiumValue: '∞',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-primary/10 to-primary/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.15),transparent_50%)]" />
        
        <div className="relative px-4 py-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-4 shadow-lg shadow-amber-500/30">
            <Crown className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold font-display mb-2">
            GayConnect <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Premium</span>
          </h1>
          
          <p className="text-muted-foreground max-w-sm mx-auto">
            Débloquez toutes les fonctionnalités et profitez d'une expérience sans limites
          </p>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Current Status */}
        {isPremium && subscribed && (
          <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">Vous êtes Premium !</p>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  {subscriptionEnd && (
                    <p className="text-sm text-muted-foreground">
                      Valide jusqu'au {format(new Date(subscriptionEnd), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="flex flex-col gap-2">
                <Alert className="border-amber-500/30 bg-amber-500/5">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <AlertDescription className="text-sm">
                    Pour renouveler votre abonnement, cliquez sur le bouton ci-dessous avant l'expiration.
                  </AlertDescription>
                </Alert>
                <Button 
                  variant="outline" 
                  className="w-full border-amber-500/50 hover:bg-amber-500/10"
                  onClick={startCheckout}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Renouveler mon abonnement
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Notice */}
        {!isPremium && (
          <Alert className="border-primary/30 bg-primary/5">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-sm">
              Après votre paiement via Revolut, votre abonnement sera activé sous 24h maximum par notre équipe.
            </AlertDescription>
          </Alert>
        )}

        {/* Pricing Card */}
        {!isPremium && (
          <Card className="border-2 border-amber-500/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            5,99 €/MOIS
          </div>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Premium
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
            <div>
              <span className="text-3xl font-bold">5,99 €</span>
              <span className="text-muted-foreground">/mois</span>
            </div>
              
              <ul className="text-sm text-left space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Médias éphémères illimités</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Accès à tous les groupes (101 départements)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Conversations privées illimitées</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Albums photo illimités</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Badge Premium visible</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Support prioritaire</span>
                </li>
              </ul>
              
              <Button 
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                onClick={startCheckout}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Payer avec Revolut
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Paiement sécurisé via Revolut. Votre abonnement sera activé manuellement après vérification du paiement.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Feature Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Comparaison des fonctionnalités
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {/* Header row */}
            <div className="grid grid-cols-3 gap-2 pb-3 border-b border-border">
              <div className="col-span-1">
                <span className="text-xs font-semibold text-muted-foreground">Fonction</span>
              </div>
              <div className="flex items-center justify-center col-span-1">
                <Badge variant="secondary" className="text-xs">Gratuit</Badge>
              </div>
              <div className="flex items-center justify-center col-span-1">
                <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 text-xs">
                  <Crown className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              </div>
            </div>
            
            {/* Features */}
            {features.map((feature, index) => (
              <FeatureComparison key={index} {...feature} />
            ))}
          </CardContent>
        </Card>

        {/* Referral Section */}
        <ReferralSection />

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Questions fréquentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-sm">Comment fonctionne le paiement ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cliquez sur "Payer avec Revolut" pour effectuer un paiement de 5,99€. Après réception, notre équipe activera votre abonnement Premium pour 30 jours.
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-sm">Comment renouveler mon abonnement ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Avant l'expiration de votre abonnement, revenez sur cette page et effectuez un nouveau paiement pour prolonger votre Premium de 30 jours supplémentaires.
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-sm">Combien de temps dure l'activation ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Votre abonnement est généralement activé dans les 24 heures suivant votre paiement. Une notification vous sera envoyée.
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-sm">Les paiements sont-ils sécurisés ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Oui, nous utilisons Revolut, une plateforme bancaire européenne réglementée et sécurisée.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PremiumPage;
