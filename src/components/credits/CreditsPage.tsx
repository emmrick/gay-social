import { 
  Coins, 
  Gift, 
  ShoppingCart, 
  Users, 
  MessageCircle,
  Camera,
  FolderOpen,
  Heart,
  Eye,
  MapPin,
  ExternalLink,
  Loader2,
  Sparkles,
  Shield,
  Clock,
  TrendingDown,
  Zap,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCredits, CREDIT_COSTS, CREDIT_REWARDS } from '@/hooks/useCredits';
import CreditBalanceBar from './CreditBalanceBar';
import DailyCreditsClaimCard from './DailyCreditsClaimCard';
import CreditHistorySheet from './CreditHistorySheet';
import CreditReferralSection from './CreditReferralSection';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion } from 'framer-motion';

// Revolut payment link for credits
const REVOLUT_CREDITS_LINK = 'https://checkout.revolut.com/pay/bd94a983-605b-47d8-b221-b4d9bf7da627';

interface CreditCostItemProps {
  icon: React.ReactNode;
  action: string;
  cost: number;
  description?: string;
}

const CreditCostItem = ({ icon, action, cost, description }: CreditCostItemProps) => (
  <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 group hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <div>
        <span className="text-sm font-medium">{action}</span>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
    <Badge variant="secondary" className="text-xs font-mono bg-muted">
      -{cost} crédit{cost !== 1 ? 's' : ''}
    </Badge>
  </div>
);

const CreditsPage = () => {
  const { isLoading, totalCredits, dailyCredits, bonusCredits, purchasedCredits } = useCredits();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const creditCosts = [
    { icon: <MessageCircle className="w-5 h-5 text-primary" />, action: 'Message texte', cost: CREDIT_COSTS.private_message_text, description: 'Envoi d\'un message privé' },
    { icon: <Camera className="w-5 h-5 text-primary" />, action: 'Photo/Vidéo simple', cost: CREDIT_COSTS.private_message_media, description: 'Média visible en permanence' },
    { icon: <Sparkles className="w-5 h-5 text-purple-500" />, action: 'Média éphémère', cost: CREDIT_COSTS.ephemeral_media, description: 'Disparaît après visionnage' },
    { icon: <Users className="w-5 h-5 text-primary" />, action: 'Message groupe (média)', cost: CREDIT_COSTS.group_message_media, description: 'Partage dans un salon' },
    { icon: <Eye className="w-5 h-5 text-primary" />, action: 'Consulter un profil', cost: CREDIT_COSTS.profile_view, description: 'Voir les détails d\'un membre' },
    { icon: <Heart className="w-5 h-5 text-pink-500" />, action: 'Réaction sur profil', cost: CREDIT_COSTS.profile_reaction, description: 'Envoyer un emoji' },
    { icon: <FolderOpen className="w-5 h-5 text-primary" />, action: 'Partage d\'album', cost: CREDIT_COSTS.album_share, description: 'Partager un album privé' },
    { icon: <FolderOpen className="w-5 h-5 text-amber-500" />, action: 'Créer un album (2ème+)', cost: CREDIT_COSTS.album_create, description: 'Premier album gratuit' },
  ];

  const proximityUnlocks = [
    { icon: <MapPin className="w-5 h-5 text-emerald-500" />, action: '+30 profils proches', cost: CREDIT_COSTS.nearby_unlock_30, description: 'Valable 72 heures' },
    { icon: <MapPin className="w-5 h-5 text-emerald-500" />, action: '+130 profils proches', cost: CREDIT_COSTS.nearby_unlock_130, description: 'Valable 7 jours' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with gradient */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-primary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.2),transparent_60%)]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative px-4 py-8 text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 mb-4 shadow-xl shadow-amber-500/30">
            <Coins className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold font-display mb-2">
            Système de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Crédits</span>
          </h1>
          
          <p className="text-muted-foreground max-w-md mx-auto">
            Utilisez des crédits pour interagir sur GayConnect. Chaque action a un coût transparent.
          </p>
        </motion.div>
      </div>

      <div className="px-4 space-y-6">
        {/* Main Balance Card with Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-amber-500" />
                  Solde actuel
                </CardTitle>
                <CreditHistorySheet />
              </div>
              <CardDescription>
                Vos crédits sont consommés dans l'ordre : Quotidiens → Bonus → Achetés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CreditBalanceBar showLabel={true} showDetails={true} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3"
        >
          <Card className="text-center p-3 bg-green-500/10 border-green-500/30">
            <div className="text-2xl font-bold text-green-600">{dailyCredits.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Quotidiens</div>
          </Card>
          <Card className="text-center p-3 bg-blue-600/10 border-blue-600/30">
            <div className="text-2xl font-bold text-blue-600">{bonusCredits.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Bonus</div>
          </Card>
          <Card className="text-center p-3 bg-sky-400/10 border-sky-400/30">
            <div className="text-2xl font-bold text-sky-500">{purchasedCredits.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Achetés</div>
          </Card>
        </motion.div>

        {/* Daily Credits Claim */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <DailyCreditsClaimCard />
        </motion.div>

        {/* Purchase Credits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-2 border-sky-400/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-sky-400 to-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
              💎 OFFRE
            </div>
            <CardHeader className="text-center pb-2 pt-8">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <ShoppingCart className="w-5 h-5 text-sky-500" />
                Acheter des crédits
              </CardTitle>
              <CardDescription>
                Crédits permanents, jamais d'expiration
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <span className="text-5xl font-bold">100</span>
                  <p className="text-muted-foreground">crédits</p>
                </div>
                <ChevronRight className="w-6 h-6 text-muted-foreground" />
                <div className="text-center">
                  <span className="text-4xl font-bold text-sky-500">5,99 €</span>
                  <p className="text-muted-foreground">paiement unique</p>
                </div>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white font-semibold h-12 text-base"
                onClick={() => window.open(REVOLUT_CREDITS_LINK, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Acheter avec Revolut
              </Button>
              
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                Crédits ajoutés sous 24h après vérification
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Free Credits Ways */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-500" />
                Gagner des crédits gratuits
              </CardTitle>
              <CardDescription>
                Plusieurs façons d'obtenir des crédits sans payer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-3 px-3 rounded-xl bg-green-500/10">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">Inscription</span>
                </div>
                <Badge className="bg-green-500 text-white">+{CREDIT_REWARDS.signup} crédits</Badge>
              </div>
              <div className="flex items-center justify-between py-3 px-3 rounded-xl bg-blue-500/10">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium">Vérification d'identité</span>
                </div>
                <Badge className="bg-blue-500 text-white">+{CREDIT_REWARDS.identity_verification} crédits</Badge>
              </div>
              <div className="flex items-center justify-between py-3 px-3 rounded-xl bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <div>
                    <span className="text-sm font-medium">Crédits quotidiens</span>
                    <p className="text-xs text-muted-foreground">Max 7 fois par mois</p>
                  </div>
                </div>
                <Badge className="bg-amber-500 text-white">+{CREDIT_REWARDS.daily_claim}/jour</Badge>
              </div>
              <div className="flex items-center justify-between py-3 px-3 rounded-xl bg-purple-500/10">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-500" />
                  <div>
                    <span className="text-sm font-medium">Parrainage réussi</span>
                    <p className="text-xs text-muted-foreground">Parrain + Filleul vérifiés</p>
                  </div>
                </div>
                <Badge className="bg-purple-500 text-white">+{CREDIT_REWARDS.referral_success} chacun</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referral Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <CreditReferralSection />
        </motion.div>

        {/* Credit Costs - Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                Coût des actions
              </CardTitle>
              <CardDescription>
                Chaque interaction consomme des crédits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {creditCosts.map((item, index) => (
                <CreditCostItem key={index} {...item} />
              ))}
              
              <Separator className="my-4" />
              
              <p className="text-sm font-medium text-muted-foreground mb-2">Déblocages Proximité</p>
              {proximityUnlocks.map((item, index) => (
                <CreditCostItem key={`proximity-${index}`} {...item} />
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
                Questions fréquentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="how-it-works">
                  <AccordionTrigger className="text-sm">
                    Comment fonctionne le système de crédits ?
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Chaque action sur GayConnect consomme des crédits. Vous recevez 15 crédits bonus à l'inscription et pouvez réclamer 5 crédits gratuits par jour (maximum 7 fois par mois). Les crédits quotidiens ne sont pas cumulables.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="credit-order">
                  <AccordionTrigger className="text-sm">
                    Dans quel ordre les crédits sont-ils utilisés ?
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Les crédits quotidiens sont utilisés en premier, puis les crédits bonus (inscription, vérification, parrainage), et enfin les crédits achetés. Cela vous permet de préserver vos crédits payants le plus longtemps possible.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="first-album">
                  <AccordionTrigger className="text-sm">
                    Le premier album est-il gratuit ?
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Oui ! La création de votre premier album privé est entièrement gratuite. Seuls les albums suivants coûtent 10 crédits. La modification du contenu d'un album existant est toujours gratuite.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="daily-credits">
                  <AccordionTrigger className="text-sm">
                    Comment fonctionnent les crédits quotidiens ?
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Vous pouvez réclamer 5 crédits gratuits une fois par jour, jusqu'à 7 fois par mois. Ces crédits doivent être réclamés manuellement et ne sont pas cumulables d'un jour à l'autre. Le compteur de réclamations se réinitialise chaque mois.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="referral">
                  <AccordionTrigger className="text-sm">
                    Comment fonctionne le parrainage ?
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    Partagez votre code de parrainage unique. Lorsqu'un filleul s'inscrit avec votre code ET complète sa vérification d'identité, vous recevez tous les deux 10 crédits bonus. Les deux parties doivent être vérifiées pour recevoir la récompense.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default CreditsPage;
