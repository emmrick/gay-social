import { useState } from 'react';
import { 
  Coins, 
  Camera, 
  Users, 
  MessageCircle, 
  Eye, 
  FolderOpen, 
  Loader2,
  Gift,
  Heart,
  MapPin,
  Image,
  Share2,
  Clock,
  ShoppingCart,
  Timer,
  Zap,
  Shield,
  HelpCircle,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  EyeOff,
  MessageSquarePlus,
  Bookmark,
  PenLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCredits, CREDIT_COSTS, CREDIT_REWARDS } from '@/hooks/useCredits';
import ReferralSection from './ReferralSection';
import CreditBalanceBar from '../credits/CreditBalanceBar';
import CreditHistorySheet from '../credits/CreditHistorySheet';
import ContactCreditIssueDialog from '../credits/ContactCreditIssueDialog';
import BuyCreditDialog from '../credits/BuyCreditDialog';

const PremiumPage = () => {
  const { totalCredits, isLoading } = useCredits();
  const [showClaimDialog, setShowClaimDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Compact Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent" />
        <div className="relative px-4 py-5 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent mb-3 shadow-lg shadow-primary/25">
            <Coins className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-display">
            Crédits <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">GayConnect</span>
          </h1>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* 🔥 LAUNCH PROMO BANNER */}
        <div className="relative rounded-xl overflow-hidden border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
          <div className="p-3.5">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Timer className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  🎉 Prix de lancement — Offre limitée !
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Les prix affichés sont <span className="font-semibold text-foreground">temporaires</span> et bien inférieurs aux tarifs définitifs. 
                  Profitez de cette promotion de lancement, valable pendant <span className="font-semibold text-foreground">1 an</span> à compter de l'ouverture du site.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Solde actuel</p>
                  <p className="text-xl font-bold text-primary">{totalCredits.toFixed(1)}</p>
                </div>
              </div>
              <CreditHistorySheet />
            </div>
            <CreditBalanceBar showLabel={false} />
          </CardContent>
        </Card>

        {/* Buy Credits Button */}
        <BuyCreditDialog 
          trigger={
            <Button className="w-full h-12 text-base gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold">
              <ShoppingCart className="w-5 h-5" />
              Acheter des crédits
            </Button>
          }
        />

        {/* Claim Credits Button - Red */}
        <Button 
          variant="outline"
          className="w-full h-11 gap-2 border-2 border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-semibold"
          onClick={() => setShowClaimDialog(true)}
        >
          <AlertTriangle className="w-4 h-4" />
          Réclamer mes crédits achetés
        </Button>

        <ContactCreditIssueDialog 
          open={showClaimDialog} 
          onOpenChange={setShowClaimDialog} 
        />

        {/* Free Credits - Compact */}
        <Card>
          <CardHeader className="pb-2 pt-3.5 px-3.5">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gift className="w-4 h-4 text-green-500" />
              Gagner des crédits gratuits
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5 space-y-1.5">
            {[
              { icon: <Zap className="w-4 h-4 text-green-500" />, label: 'Inscription', credits: CREDIT_REWARDS.signup, bg: 'bg-green-500/10' },
              { icon: <Shield className="w-4 h-4 text-blue-500" />, label: 'Vérification d\'identité', credits: CREDIT_REWARDS.identity_verification, bg: 'bg-blue-500/10' },
              { icon: <Clock className="w-4 h-4 text-amber-500" />, label: 'Crédits quotidiens (auto)', credits: CREDIT_REWARDS.daily_claim, bg: 'bg-amber-500/10', suffix: '/jour' },
              { icon: <Users className="w-4 h-4 text-purple-500" />, label: 'Parrainage réussi', credits: CREDIT_REWARDS.referral_success, bg: 'bg-purple-500/10', suffix: ' chacun' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center justify-between py-2 px-2.5 rounded-lg ${item.bg}`}>
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  +{item.credits}{item.suffix || ''}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Referral moved to header icon */}

        {/* Credit Costs */}
        <Card>
          <CardHeader className="pb-2 pt-3.5 px-3.5">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              Coût des actions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5 space-y-4">
            {/* Messages */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">💬 Messages</p>
              <div className="space-y-0">
                {[
                  { icon: <MessageCircle className="w-4 h-4 text-primary" />, label: 'Message texte (privé ou groupe)', cost: CREDIT_COSTS.private_message_text },
                  { icon: <Image className="w-4 h-4 text-primary" />, label: 'Photo / Vidéo (privé ou groupe)', cost: CREDIT_COSTS.private_message_media },
                  { icon: <Camera className="w-4 h-4 text-purple-500" />, label: 'Média éphémère', cost: CREDIT_COSTS.ephemeral_media },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono text-red-500 border-red-500/30">-{item.cost}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Profils & Social */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">👤 Profils & Social</p>
              <div className="space-y-0">
                {[
                  { icon: <Eye className="w-4 h-4 text-primary" />, label: 'Consulter un profil', cost: CREDIT_COSTS.profile_view },
                  { icon: <Heart className="w-4 h-4 text-pink-500" />, label: 'Réaction sur un profil', cost: CREDIT_COSTS.profile_reaction },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono text-red-500 border-red-500/30">-{item.cost}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Swipe */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">✨ Swipe</p>
              <div className="space-y-0">
                {[
                  { icon: <ThumbsUp className="w-4 h-4 text-green-500" />, label: 'Aimer (swipe droite)', cost: CREDIT_COSTS.swipe_like },
                  { icon: <ThumbsDown className="w-4 h-4 text-red-400" />, label: 'Passer (swipe gauche)', cost: CREDIT_COSTS.swipe_dislike },
                  { icon: <EyeOff className="w-4 h-4 text-muted-foreground" />, label: 'Masquer définitivement', cost: CREDIT_COSTS.swipe_hide },
                  { icon: <MessageSquarePlus className="w-4 h-4 text-primary" />, label: 'Engager la conversation', cost: CREDIT_COSTS.swipe_start_conversation },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono text-red-500 border-red-500/30">-{item.cost}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Albums & Groupes */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">📁 Albums & Groupes</p>
              <div className="space-y-0">
                {[
                  { icon: <Share2 className="w-4 h-4 text-primary" />, label: 'Partage d\'album', cost: CREDIT_COSTS.album_share },
                  { icon: <FolderOpen className="w-4 h-4 text-amber-500" />, label: 'Créer un album (2ème+)', cost: CREDIT_COSTS.album_create },
                  { icon: <Users className="w-4 h-4 text-primary" />, label: 'Rejoindre un groupe supplémentaire', cost: CREDIT_COSTS.join_extra_group },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono text-red-500 border-red-500/30">-{item.cost}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Messages enregistrés */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">📌 Messages enregistrés</p>
              <div className="space-y-0">
                {[
                  { icon: <Bookmark className="w-4 h-4 text-blue-500" />, label: 'Créer un message enregistré', cost: 3.5 },
                  { icon: <PenLine className="w-4 h-4 text-amber-500" />, label: 'Modifier un message enregistré', cost: 2.0 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono text-red-500 border-red-500/30">-{item.cost}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Proximité */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">📍 Déblocages Proximité</p>
              <div className="space-y-0">
                {[
                  { icon: <MapPin className="w-4 h-4 text-emerald-500" />, label: '+30 profils (72h)', cost: CREDIT_COSTS.nearby_unlock_30 },
                  { icon: <MapPin className="w-4 h-4 text-emerald-500" />, label: '+130 profils (7 jours)', cost: CREDIT_COSTS.nearby_unlock_130 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono text-red-500 border-red-500/30">-{item.cost}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ - Accordion */}
        <Card>
          <CardHeader className="pb-2 pt-3.5 px-3.5">
            <CardTitle className="text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              Questions fréquentes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5 pb-3.5">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="how" className="border-b-0">
                <AccordionTrigger className="text-xs py-2.5">Comment fonctionne le système ?</AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground pb-2">
                  Chaque action consomme des crédits. Vous recevez 15 crédits à l'inscription et 5 crédits gratuits automatiquement chaque jour. Ordre d'utilisation : Quotidiens → Bonus → Achetés.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="daily" className="border-b-0">
                <AccordionTrigger className="text-xs py-2.5">Les crédits quotidiens ?</AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground pb-2">
                  5 crédits rechargés automatiquement chaque jour à minuit. Non cumulables — ils sont remplacés chaque jour.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="expiry" className="border-b-0">
                <AccordionTrigger className="text-xs py-2.5">Expiration des crédits ?</AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground pb-2">
                  Les crédits achetés et bonus n'expirent jamais. Seuls les crédits quotidiens sont remplacés chaque jour.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="prices" className="border-b-0">
                <AccordionTrigger className="text-xs py-2.5">Pourquoi ces prix si bas ?</AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground pb-2">
                  Il s'agit de nos tarifs de lancement, valables pendant 1 an. Les prix définitifs seront sensiblement plus élevés. Profitez-en maintenant !
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="referral" className="border-b-0">
                <AccordionTrigger className="text-xs py-2.5">Le parrainage ?</AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground pb-2">
                  Partagez votre code. Quand votre filleul s'inscrit ET vérifie son identité, vous recevez 10 crédits chacun.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PremiumPage;
