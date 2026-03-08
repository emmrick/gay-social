import { useState } from 'react';
import {
  Coins,
  Camera,
  Users,
  MessageCircle,
  Eye,
  FolderOpen,
  Loader2,
  Heart,
  MapPin,
  Image,
  Share2,
  ShoppingCart,
  Timer,
  HelpCircle,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  EyeOff,
  MessageSquarePlus,
  Bookmark,
  PenLine,
  ChevronRight,
  Zap,
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCredits, CREDIT_COSTS } from '@/hooks/useCredits';
import CreditBalanceBar from '../credits/CreditBalanceBar';
import CreditHistorySheet from '../credits/CreditHistorySheet';
import ContactCreditIssueDialog from '../credits/ContactCreditIssueDialog';
import BuyCreditDialog from '../credits/BuyCreditDialog';
import EarnCreditsSection from '../credits/EarnCreditsSection';
import CreditCostSection from '../credits/CreditCostSection';

interface PremiumPageProps {
  onNavigateToSupport?: (ticket: any) => void;
}

const PremiumPage = ({ onNavigateToSupport }: PremiumPageProps = {}) => {
  const { totalCredits, isLoading } = useCredits();
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [showCosts, setShowCosts] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header — ultra compact */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight">Crédits</h1>
      </div>

      <div className="px-5 space-y-6">
        {/* Balance */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/8 to-accent/5 border border-primary/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Solde disponible</p>
              <p className="text-3xl font-bold tracking-tight">{totalCredits.toFixed(1)}</p>
            </div>
            <CreditHistorySheet />
          </div>
          <CreditBalanceBar showLabel={false} />
          <div className="mt-4 flex gap-2">
            <BuyCreditDialog
              trigger={
                <Button size="sm" className="flex-1 gap-1.5 h-9 text-xs font-medium">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Acheter
                </Button>
              }
            />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9 text-xs font-medium text-red-500 border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10"
              onClick={() => setShowClaimDialog(true)}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Réclamer
            </Button>
          </div>
        </div>

        <ContactCreditIssueDialog
          open={showClaimDialog}
          onOpenChange={setShowClaimDialog}
          onTicketCreated={onNavigateToSupport}
        />

        {/* Launch promo — subtle banner */}
        <div className="flex items-start gap-3 rounded-xl bg-amber-500/5 border border-amber-500/15 p-3.5">
          <Timer className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Prix de lancement</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Tarifs temporaires, valables 1 an après l'ouverture. Les prix définitifs seront plus élevés.
            </p>
          </div>
        </div>

        {/* Earn section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-green-500" />
            <h2 className="text-sm font-semibold">Gagner des crédits</h2>
          </div>
          <EarnCreditsSection />
        </section>

        {/* Cost section — collapsible */}
        <section>
          <button
            onClick={() => setShowCosts(!showCosts)}
            className="w-full flex items-center justify-between py-1 group"
          >
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Coût des actions</h2>
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showCosts ? 'rotate-90' : ''}`} />
          </button>

          {showCosts && (
            <div className="mt-4 space-y-6">
              <CreditCostSection
                title="💬 Messages"
                items={[
                  { icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'Texte (privé / groupe)', cost: CREDIT_COSTS.private_message_text },
                  { icon: <Image className="w-3.5 h-3.5" />, label: 'Photo / Vidéo', cost: CREDIT_COSTS.private_message_media },
                  { icon: <Camera className="w-3.5 h-3.5" />, label: 'Média éphémère', cost: CREDIT_COSTS.ephemeral_media },
                ]}
              />
              <CreditCostSection
                title="👤 Profils & Social"
                items={[
                  { icon: <Eye className="w-3.5 h-3.5" />, label: 'Consulter un profil', cost: CREDIT_COSTS.profile_view },
                  { icon: <Heart className="w-3.5 h-3.5" />, label: 'Réaction sur profil', cost: CREDIT_COSTS.profile_reaction },
                ]}
              />
              <CreditCostSection
                title="✨ Swipe"
                items={[
                  { icon: <ThumbsUp className="w-3.5 h-3.5" />, label: 'Aimer', cost: CREDIT_COSTS.swipe_like },
                  { icon: <ThumbsDown className="w-3.5 h-3.5" />, label: 'Passer', cost: CREDIT_COSTS.swipe_dislike },
                  { icon: <EyeOff className="w-3.5 h-3.5" />, label: 'Masquer', cost: CREDIT_COSTS.swipe_hide },
                  { icon: <MessageSquarePlus className="w-3.5 h-3.5" />, label: 'Engager conversation', cost: CREDIT_COSTS.swipe_start_conversation },
                ]}
              />
              <CreditCostSection
                title="📁 Albums & Groupes"
                items={[
                  { icon: <Share2 className="w-3.5 h-3.5" />, label: 'Partage d\'album', cost: CREDIT_COSTS.album_share },
                  { icon: <FolderOpen className="w-3.5 h-3.5" />, label: 'Créer un album (2e+)', cost: CREDIT_COSTS.album_create },
                  { icon: <Users className="w-3.5 h-3.5" />, label: 'Groupe supplémentaire', cost: CREDIT_COSTS.join_extra_group },
                ]}
              />
              <CreditCostSection
                title="📌 Messages enregistrés"
                items={[
                  { icon: <Bookmark className="w-3.5 h-3.5" />, label: '1er message', cost: 0, free: true },
                  { icon: <Bookmark className="w-3.5 h-3.5" />, label: '2e et suivants', cost: '5, 10, 15…' },
                  { icon: <PenLine className="w-3.5 h-3.5" />, label: 'Modifier', cost: 2.0 },
                ]}
              />
              <CreditCostSection
                title="📍 Proximité"
                items={[
                  { icon: <MapPin className="w-3.5 h-3.5" />, label: '+30 profils (72h)', cost: CREDIT_COSTS.nearby_unlock_30 },
                  { icon: <MapPin className="w-3.5 h-3.5" />, label: '+130 profils (7j)', cost: CREDIT_COSTS.nearby_unlock_130 },
                ]}
              />
              <CreditCostSection
                title="🤖 Chatbot"
                items={[
                  { icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'Message', cost: CREDIT_COSTS.chatbot_message },
                  { icon: <PenLine className="w-3.5 h-3.5" />, label: 'Info (1-10)', cost: CREDIT_COSTS.chatbot_info },
                  { icon: <PenLine className="w-3.5 h-3.5" />, label: 'Info (11+)', cost: CREDIT_COSTS.chatbot_info_extra },
                  { icon: <Zap className="w-3.5 h-3.5" />, label: 'Activer', cost: CREDIT_COSTS.chatbot_activate },
                ]}
              />
            </div>
          )}
        </section>

        {/* FAQ */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Questions fréquentes</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {[
              { id: 'how', q: 'Comment fonctionne le système ?', a: 'Chaque action consomme des crédits. 15 crédits à l\'inscription, 5 gratuits chaque jour. Ordre : Quotidiens → Bonus → Achetés.' },
              { id: 'daily', q: 'Les crédits quotidiens ?', a: '5 crédits rechargés chaque jour à minuit. Non cumulables.' },
              { id: 'expiry', q: 'Expiration des crédits ?', a: 'Les crédits achetés et bonus n\'expirent jamais. Seuls les quotidiens sont remplacés.' },
              { id: 'prices', q: 'Pourquoi ces prix bas ?', a: 'Tarifs de lancement valables 1 an. Les prix définitifs seront plus élevés.' },
              { id: 'referral', q: 'Le parrainage ?', a: 'Partagez votre code. Quand votre filleul vérifie son identité, vous recevez 10 crédits chacun.' },
            ].map(faq => (
              <AccordionItem key={faq.id} value={faq.id} className="border-b-0">
                <AccordionTrigger className="text-[13px] py-2.5 hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-[12px] text-muted-foreground pb-2">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>
    </div>
  );
};

export default PremiumPage;
