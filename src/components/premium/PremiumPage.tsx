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
  CheckCircle,
  EyeOff,
  Clock,
  Diamond
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
  vipValue?: string;
}

const FeatureComparison = ({ feature, icon, freeValue, premiumValue, vipValue }: FeatureComparisonProps) => (
  <div className="grid grid-cols-4 gap-2 py-3 border-b border-border/50 last:border-0">
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
    <div className="flex items-center justify-center col-span-1">
      <span className="text-xs text-purple-500 font-medium">{vipValue || premiumValue}</span>
    </div>
  </div>
);

const PremiumPage = () => {
  const { isPremium, isVip, subscribed, subscriptionEnd, startCheckout, openCustomerPortal, isLoading, validatePromoCode } = useSubscription();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<'premium' | 'vip' | null>(null);
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

  const handleSubscribe = async (tier: 'premium' | 'vip') => {
    setIsCheckingOut(true);
    setCheckoutTier(tier);
    try {
      await startCheckout(tier, promoValidation?.valid ? promoCode.trim() : undefined);
    } finally {
      setIsCheckingOut(false);
      setCheckoutTier(null);
    }
  };

  const features = [
    {
      feature: 'Médias éphémères',
      icon: <Camera className="w-3 h-3 text-primary" />,
      freeValue: '1/sem',
      premiumValue: '∞',
      vipValue: '∞',
    },
    {
      feature: 'Photos profil',
      icon: <Eye className="w-3 h-3 text-primary" />,
      freeValue: '10/jour',
      premiumValue: '∞',
      vipValue: '∞',
    },
    {
      feature: 'Groupes',
      icon: <Users className="w-3 h-3 text-primary" />,
      freeValue: '3',
      premiumValue: 'Tous',
      vipValue: 'Tous',
    },
    {
      feature: 'Conversations',
      icon: <MessageCircle className="w-3 h-3 text-primary" />,
      freeValue: '10/sem',
      premiumValue: '∞',
      vipValue: '∞',
    },
    {
      feature: 'Albums',
      icon: <FolderOpen className="w-3 h-3 text-primary" />,
      freeValue: '1',
      premiumValue: '∞',
      vipValue: '∞',
    },
    {
      feature: 'Statut en ligne',
      icon: <EyeOff className="w-3 h-3 text-purple-500" />,
      freeValue: 'Visible',
      premiumValue: 'Visible',
      vipValue: 'Masqué ✨',
    },
    {
      feature: 'Dernière connexion',
      icon: <Clock className="w-3 h-3 text-purple-500" />,
      freeValue: 'Visible',
      premiumValue: 'Visible',
      vipValue: 'Masquée ✨',
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
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-purple-500/10 to-primary/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.15),transparent_50%)]" />
        
        <div className="relative px-4 py-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-purple-500 to-purple-600 mb-4 shadow-lg shadow-purple-500/30">
            <Diamond className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold font-display mb-2">
            GayConnect <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-purple-500 to-purple-600">Abonnements</span>
          </h1>
          
          <p className="text-muted-foreground max-w-sm mx-auto">
            Débloquez toutes les fonctionnalités et profitez d'une expérience sans limites
          </p>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Current Status */}
        {(isPremium || isVip) && subscribed && (
          <Card className={`${isVip ? 'border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-purple-600/5' : 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/5'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isVip ? 'bg-gradient-to-br from-purple-400 to-purple-600' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                  {isVip ? <Diamond className="w-6 h-6 text-white" /> : <Crown className="w-6 h-6 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{isVip ? 'Vous êtes VIP !' : 'Vous êtes Premium !'}</p>
                    <Sparkles className={`w-4 h-4 ${isVip ? 'text-purple-500' : 'text-amber-500'}`} />
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

        {/* Promo Code Input (Premium only) */}
        {!isPremium && !isVip && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Vous avez un code promo ?</p>
                  <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-600">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium uniquement
                  </Badge>
                </div>
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
                
                <p className="text-xs text-muted-foreground">
                  Les codes promotionnels sont valables uniquement pour l'offre Premium à 4,50€/mois.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Cards */}
        {!isPremium && !isVip && (
          <div className="space-y-4">
            {/* Premium Card */}
            <Card className="border-2 border-amber-500/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                POPULAIRE
              </div>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl flex items-center justify-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  Premium
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <div>
                  <span className="text-3xl font-bold">4,50 €</span>
                  <span className="text-muted-foreground">/mois</span>
                </div>
                
                <ul className="text-sm text-left space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Médias éphémères illimités</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Accès à tous les groupes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Conversations illimitées</span>
                  </li>
                </ul>
                
                <Button 
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                  onClick={() => handleSubscribe('premium')}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut && checkoutTier === 'premium' ? (
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
              </CardContent>
            </Card>

            {/* VIP Card */}
            <Card className="border-2 border-purple-500/50 relative overflow-hidden bg-gradient-to-br from-purple-500/5 to-purple-600/10">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                CONFIDENTIALITÉ
              </div>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl flex items-center justify-center gap-2">
                  <Diamond className="w-5 h-5 text-purple-500" />
                  VIP
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <div>
                  <span className="text-3xl font-bold">15 €</span>
                  <span className="text-muted-foreground">/mois</span>
                </div>
                
                <ul className="text-sm text-left space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Tout Premium inclus</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-purple-600 font-medium">Masquer votre statut en ligne</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-purple-600 font-medium">Masquer votre dernière connexion</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span>Confidentialité maximale</span>
                  </li>
                </ul>
                
                <Button 
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold"
                  onClick={() => handleSubscribe('vip')}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut && checkoutTier === 'vip' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <Diamond className="w-4 h-4 mr-2" />
                      Devenir VIP
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upgrade to VIP for Premium users */}
        {isPremium && !isVip && subscribed && (
          <Card className="border-2 border-purple-500/50 relative overflow-hidden bg-gradient-to-br from-purple-500/5 to-purple-600/10">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Diamond className="w-5 h-5 text-purple-500" />
                Passez à VIP
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Protégez votre vie privée avec les fonctionnalités VIP exclusives
              </p>
              
              <ul className="text-sm text-left space-y-1">
                <li className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span className="text-purple-600 font-medium">Masquer votre statut en ligne</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span className="text-purple-600 font-medium">Masquer votre dernière connexion</span>
                </li>
              </ul>
              
              <div>
                <span className="text-2xl font-bold">15 €</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold"
                onClick={() => handleSubscribe('vip')}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <Diamond className="w-4 h-4 mr-2" />
                    Passer à VIP
                  </>
                )}
              </Button>
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
            <div className="grid grid-cols-4 gap-2 pb-3 border-b border-border">
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
              <div className="flex items-center justify-center col-span-1">
                <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 text-xs">
                  <Diamond className="w-3 h-3 mr-1" />
                  VIP
                </Badge>
              </div>
            </div>
            
            {/* Features */}
            {features.map((feature, index) => (
              <FeatureComparison key={index} {...feature} />
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
              <p className="font-medium text-sm">Quelle est la différence entre Premium et VIP ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Premium débloque toutes les fonctionnalités d'utilisation (médias, groupes, conversations). VIP ajoute des options de confidentialité : vous pouvez masquer votre statut en ligne et votre dernière connexion.
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-sm">Puis-je annuler à tout moment ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Oui, vous pouvez annuler votre abonnement à tout moment. Vous conserverez l'accès jusqu'à la fin de la période payée.
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-sm">Les paiements sont-ils sécurisés ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Absolument. Nous utilisons Stripe, le leader mondial du paiement en ligne.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PremiumPage;
