import { useState } from 'react';
import { 
  Crown, 
  Check, 
  X, 
  Camera, 
  Users, 
  MessageCircle, 
  Eye, 
  FolderOpen, 
  Bookmark, 
  Shield, 
  Headphones,
  Zap,
  Loader2,
  Sparkles,
  Ticket,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface FeatureComparisonProps {
  feature: string;
  icon: React.ReactNode;
  freeValue: string;
  premiumValue: string;
}

const FeatureComparison = ({ feature, icon, freeValue, premiumValue }: FeatureComparisonProps) => (
  <div className="grid grid-cols-3 gap-4 py-3 border-b border-border/50 last:border-0">
    <div className="flex items-center gap-2 col-span-1">
      {icon}
      <span className="text-sm font-medium">{feature}</span>
    </div>
    <div className="flex items-center justify-center col-span-1">
      <span className="text-sm text-muted-foreground">{freeValue}</span>
    </div>
    <div className="flex items-center justify-center col-span-1">
      <span className="text-sm text-primary font-medium">{premiumValue}</span>
    </div>
  </div>
);

const PremiumPage = () => {
  const { isPremium, subscribed, subscriptionEnd, startCheckout, openCustomerPortal, isLoading, validatePromoCode } = useSubscription();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoValidation, setPromoValidation] = useState<{
    valid: boolean;
    description?: string;
    message?: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) return;
    
    setIsValidating(true);
    const result = await validatePromoCode(promoCode.trim());
    setPromoValidation(result);
    setIsValidating(false);
    
    if (result.valid) {
      toast.success(`Code promo valide: ${result.description}`);
    } else {
      toast.error(result.message || 'Code promo invalide');
    }
  };

  const handleSubscribe = async () => {
    setIsCheckingOut(true);
    try {
      await startCheckout(promoValidation?.valid ? promoCode.trim() : undefined);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const features = [
    {
      feature: 'Médias éphémères',
      icon: <Camera className="w-4 h-4 text-primary" />,
      freeValue: '1 / semaine',
      premiumValue: 'Illimité ✨',
    },
    {
      feature: 'Photos de profil',
      icon: <Eye className="w-4 h-4 text-primary" />,
      freeValue: '10 / jour',
      premiumValue: 'Illimité ✨',
    },
    {
      feature: 'Groupes',
      icon: <Users className="w-4 h-4 text-primary" />,
      freeValue: '3 max',
      premiumValue: 'Tous les groupes',
    },
    {
      feature: 'Profils à proximité',
      icon: <Users className="w-4 h-4 text-primary" />,
      freeValue: '30 profils',
      premiumValue: 'Illimité ✨',
    },
    {
      feature: 'Conversations',
      icon: <MessageCircle className="w-4 h-4 text-primary" />,
      freeValue: '10 / semaine',
      premiumValue: 'Illimité ✨',
    },
    {
      feature: 'Albums',
      icon: <FolderOpen className="w-4 h-4 text-primary" />,
      freeValue: '1 album',
      premiumValue: 'Illimité ✨',
    },
    {
      feature: 'Messages enregistrés',
      icon: <Bookmark className="w-4 h-4 text-primary" />,
      freeValue: '1 message',
      premiumValue: 'Illimité ✨',
    },
    {
      feature: 'Taille photos',
      icon: <Zap className="w-4 h-4 text-primary" />,
      freeValue: '20 Mo',
      premiumValue: '500 Mo',
    },
    {
      feature: 'Taille vidéos',
      icon: <Zap className="w-4 h-4 text-primary" />,
      freeValue: '500 Mo',
      premiumValue: '1 Go',
    },
    {
      feature: 'Support client',
      icon: <Headphones className="w-4 h-4 text-primary" />,
      freeValue: 'Standard',
      premiumValue: 'Prioritaire 🔥',
    },
    {
      feature: 'Sécurité',
      icon: <Shield className="w-4 h-4 text-primary" />,
      freeValue: 'Basique',
      premiumValue: 'Renforcée + Vérification',
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
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-primary/20" />
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
            <CardContent className="p-4">
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
                      Renouvellement le {format(new Date(subscriptionEnd), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={openCustomerPortal}>
                  Gérer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Card */}
        {!isPremium && (
          <Card className="border-2 border-primary/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              POPULAIRE
            </div>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Crown className="w-6 h-6 text-amber-500" />
                Premium
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>
                <span className="text-4xl font-bold">4,50 €</span>
                <span className="text-muted-foreground">/mois</span>
              </div>

              {/* Promo Code Input */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Code promo"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        setPromoValidation(null);
                      }}
                      className="pl-9 uppercase"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleValidatePromo}
                    disabled={!promoCode.trim() || isValidating}
                  >
                    {isValidating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Valider'
                    )}
                  </Button>
                </div>
                
                {promoValidation && (
                  <div className={`flex items-center gap-2 text-sm ${
                    promoValidation.valid ? 'text-green-500' : 'text-destructive'
                  }`}>
                    {promoValidation.valid ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {promoValidation.description}
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        {promoValidation.message}
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                size="lg"
                onClick={handleSubscribe}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 mr-2" />
                    Devenir Premium
                  </>
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Annulation possible à tout moment
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
            <div className="grid grid-cols-3 gap-4 pb-3 border-b border-border">
              <div className="col-span-1">
                <span className="text-sm font-semibold text-muted-foreground">Fonctionnalité</span>
              </div>
              <div className="flex items-center justify-center col-span-1">
                <Badge variant="secondary">Gratuit</Badge>
              </div>
              <div className="flex items-center justify-center col-span-1">
                <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0">
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

        {/* Benefits List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Avantages Premium</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              'Envoyez des photos et vidéos éphémères sans limite',
              'Consultez tous les profils de votre région',
              'Rejoignez tous les groupes qui vous intéressent',
              'Conversations illimitées avec qui vous voulez',
              'Créez autant d\'albums que vous le souhaitez',
              'Support client prioritaire sous 24h',
              'Sécurité renforcée et vérification d\'identité',
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Questions fréquentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-sm">Puis-je annuler à tout moment ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Oui, vous pouvez annuler votre abonnement à tout moment depuis votre espace de gestion. Vous conserverez l'accès Premium jusqu'à la fin de la période payée.
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-sm">Les paiements sont-ils sécurisés ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Absolument. Nous utilisons Stripe, le leader mondial du paiement en ligne, pour sécuriser toutes les transactions.
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-sm">Puis-je changer d'offre ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Vous pouvez gérer votre abonnement à tout moment depuis le portail client accessible dans vos paramètres.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PremiumPage;
