import { useState } from 'react';
import { 
  Coins, 
  Check, 
  Camera, 
  Users, 
  MessageCircle, 
  Eye, 
  FolderOpen, 
  Loader2,
  Sparkles,
  ExternalLink,
  Gift,
  Heart,
  MapPin,
  Image,
  Share2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCredits, CREDIT_COSTS } from '@/hooks/useCredits';
import { REVOLUT_PAYMENT_LINK } from '@/hooks/useSubscription';
import ReferralSection from './ReferralSection';
import CreditBalanceBar from '../credits/CreditBalanceBar';
import ContactCreditIssueDialog from '../credits/ContactCreditIssueDialog';

// Promotional offer
const PROMO_OFFER = {
  credits: 250,
  price: 10.99,
  originalPrice: 15.99,
  paymentLink: 'https://checkout.revolut.com/pay/45dd2e98-7ab4-40e7-ad01-5a64dedee6dd',
};

interface CreditCostItemProps {
  icon: React.ReactNode;
  label: string;
  cost: number;
}

const CreditCostItem = ({ icon, label, cost }: CreditCostItemProps) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <Badge variant="secondary" className="text-xs font-mono">
      {cost} crédit{cost !== 1 ? 's' : ''}
    </Badge>
  </div>
);

interface FreeCreditsItemProps {
  icon: React.ReactNode;
  label: string;
  credits: number;
  description?: string;
}

const FreeCreditsItem = ({ icon, label, credits, description }: FreeCreditsItemProps) => (
  <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{label}</span>
        <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
          +{credits} crédits
        </Badge>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  </div>
);

const PremiumPage = () => {
  const { totalCredits, isLoading } = useCredits();
  const [showContactDialog, setShowContactDialog] = useState(false);

  const handleBuyCredits = () => {
    window.open(REVOLUT_PAYMENT_LINK, '_blank');
  };

  const handleBuyPromo = () => {
    window.open(PROMO_OFFER.paymentLink, '_blank');
  };

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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_50%)]" />
        
        <div className="relative px-4 py-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent mb-4 shadow-lg shadow-primary/30">
            <Coins className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold font-display mb-2">
            Système de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Crédits</span>
          </h1>
          
          <p className="text-muted-foreground max-w-sm mx-auto">
            Utilisez des crédits pour accéder aux fonctionnalités de GayConnect
          </p>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Current Balance */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Votre solde</p>
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-primary">
                  {totalCredits.toFixed(1)} crédits
                </p>
              </div>
            </div>
            
            <CreditBalanceBar showLabel={false} />
          </CardContent>
        </Card>

        {/* Promo Offer Card */}
        <Card className="border-2 border-green-500/50 relative overflow-hidden bg-gradient-to-br from-green-500/10 to-emerald-500/10">
          <div className="absolute top-0 right-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            🔥 OFFRE SPÉCIALE
          </div>
          <CardHeader className="text-center pb-2 pt-6">
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-green-500" />
              Offre promotionnelle
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div>
              <span className="text-4xl font-bold text-green-600">{PROMO_OFFER.credits}</span>
              <span className="text-xl text-muted-foreground ml-2">crédits</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-semibold text-green-600">{PROMO_OFFER.price.toFixed(2).replace('.', ',')} €</span>
              <span className="text-lg text-muted-foreground line-through">{PROMO_OFFER.originalPrice.toFixed(2).replace('.', ',')} €</span>
            </div>
            <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
              Un prix plus agréable !
            </Badge>
            
            <ul className="text-sm text-left space-y-2">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Économisez 5€ sur cette offre</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Crédits sans date d'expiration</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Paiement sécurisé via Revolut</span>
              </li>
            </ul>
            
            <Button 
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white font-semibold"
              onClick={handleBuyPromo}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Profiter de l'offre
            </Button>
          </CardContent>
        </Card>

        {/* Standard Offer Card */}
        <Card className="border border-border/50">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg flex items-center justify-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Offre standard
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div>
              <span className="text-3xl font-bold">100</span>
              <span className="text-lg text-muted-foreground ml-2">crédits</span>
            </div>
            <div className="text-xl font-semibold text-primary">5,99 €</div>
            
            <Button 
              variant="outline"
              className="w-full"
              onClick={handleBuyCredits}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Acheter
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Activation manuelle sous 24h après vérification du paiement.
            </p>
          </CardContent>
        </Card>

        {/* Contact for credit issues */}
        <Card className="border-dashed border-2 border-muted-foreground/30">
          <CardContent className="p-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Vous avez acheté des crédits mais ils n'apparaissent pas ?
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowContactDialog(true)}
            >
              Contacter un administrateur
            </Button>
          </CardContent>
        </Card>

        <ContactCreditIssueDialog 
          open={showContactDialog} 
          onOpenChange={setShowContactDialog} 
        />

        {/* Free Credits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-500" />
              Crédits gratuits
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <FreeCreditsItem
              icon={<Users className="w-4 h-4 text-green-500" />}
              label="Inscription"
              credits={15}
              description="Bonus de bienvenue à l'inscription"
            />
            <FreeCreditsItem
              icon={<Check className="w-4 h-4 text-green-500" />}
              label="Vérification d'identité"
              credits={30}
              description="Après validation de votre identité"
            />
            <FreeCreditsItem
              icon={<Heart className="w-4 h-4 text-green-500" />}
              label="Parrainage"
              credits={10}
              description="Pour vous et votre filleul (si vérifié)"
            />
            <FreeCreditsItem
              icon={<Clock className="w-4 h-4 text-green-500" />}
              label="Crédits quotidiens"
              credits={5}
              description="Max 7 jours/mois, non cumulables"
            />
          </CardContent>
        </Card>

        {/* Credit Costs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Coût des fonctionnalités
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <CreditCostItem
              icon={<MessageCircle className="w-4 h-4 text-primary" />}
              label="Message texte"
              cost={CREDIT_COSTS.private_message_text}
            />
            <CreditCostItem
              icon={<Image className="w-4 h-4 text-primary" />}
              label="Photo/Vidéo simple"
              cost={CREDIT_COSTS.private_message_media}
            />
            <CreditCostItem
              icon={<Users className="w-4 h-4 text-primary" />}
              label="Média en groupe"
              cost={CREDIT_COSTS.group_message_media}
            />
            <CreditCostItem
              icon={<Camera className="w-4 h-4 text-primary" />}
              label="Média éphémère"
              cost={CREDIT_COSTS.ephemeral_media}
            />
            <CreditCostItem
              icon={<Share2 className="w-4 h-4 text-primary" />}
              label="Partage d'album"
              cost={CREDIT_COSTS.album_share}
            />
            <CreditCostItem
              icon={<FolderOpen className="w-4 h-4 text-primary" />}
              label="Nouvel album"
              cost={CREDIT_COSTS.album_create}
            />
            <CreditCostItem
              icon={<Sparkles className="w-4 h-4 text-primary" />}
              label="Réaction sur profil"
              cost={CREDIT_COSTS.profile_reaction}
            />
            <CreditCostItem
              icon={<Eye className="w-4 h-4 text-primary" />}
              label="Consultation de profil"
              cost={CREDIT_COSTS.profile_view}
            />
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Déblocages Proximité</p>
              <CreditCostItem
                icon={<MapPin className="w-4 h-4 text-primary" />}
                label="30 profils (72h)"
                cost={CREDIT_COSTS.nearby_unlock_30}
              />
              <CreditCostItem
                icon={<MapPin className="w-4 h-4 text-primary" />}
                label="130 profils (7 jours)"
                cost={CREDIT_COSTS.nearby_unlock_130}
              />
            </div>
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
              <p className="font-medium text-sm">Comment fonctionne le système de crédits ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Chaque action sur GayConnect coûte un certain nombre de crédits. Vous pouvez gagner des crédits gratuits ou en acheter.
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-sm">Comment obtenir des crédits gratuits ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Réclamez vos 5 crédits quotidiens (max 7 fois/mois), faites vérifier votre identité (+30), ou parrainez des amis (+10 chacun).
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-sm">Les crédits expirent-ils ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Les crédits quotidiens doivent être réclamés chaque jour et ne sont pas cumulables. Les crédits achetés et bonus n'expirent jamais.
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-sm">Dans quel ordre sont utilisés mes crédits ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Priorité : Quotidiens → Bonus → Achetés. Vos crédits achetés sont donc préservés le plus longtemps possible.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PremiumPage;
