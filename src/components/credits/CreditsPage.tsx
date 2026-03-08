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
  Loader2,
  Sparkles,
  Shield,
  Clock,
  Zap,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCredits, CREDIT_COSTS, CREDIT_REWARDS } from '@/hooks/useCredits';
import { useDynamicCreditCosts } from '@/hooks/useDynamicCreditCosts';
import CreditBalanceBar from './CreditBalanceBar';
import CreditHistorySheet from './CreditHistorySheet';
import CreditReferralSection from './CreditReferralSection';
import BuyCreditDialog from './BuyCreditDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

interface CostRowProps {
  icon: React.ReactNode;
  label: string;
  cost: number;
  note?: string;
}

const CostRow = ({ icon, label, cost, note }: CostRowProps) => (
  <div className="flex items-center gap-3 py-2.5 group">
    <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium leading-tight">{label}</p>
      {note && <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{note}</p>}
    </div>
    <span className="text-xs font-semibold font-mono text-muted-foreground bg-muted/60 px-2 py-1 rounded-md shrink-0">
      -{cost}
    </span>
  </div>
);

const CreditsPage = () => {
  const { isLoading, totalCredits, dailyCredits, bonusCredits, purchasedCredits, passiveCredits, maxDailyCredits } = useCredits();
  const { data: dynamicCosts } = useDynamicCreditCosts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Hero Balance ─────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/12 via-primary/4 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/8 blur-[100px]" />

        <motion.div {...fadeUp} className="relative px-5 pt-8 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-3 shadow-lg shadow-primary/25">
            <Coins className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="text-4xl font-extrabold tracking-tight">
            {totalCredits.toFixed(1)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">crédits disponibles</p>
          
          <div className="flex items-center justify-center gap-3 mt-4">
            <CreditHistorySheet />
            <BuyCreditDialog
              trigger={
                <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground gap-1.5 shadow-md shadow-primary/20">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Acheter
                </Button>
              }
            />
          </div>
        </motion.div>
      </div>

      <div className="px-4 space-y-5">
        {/* ── Balance Breakdown ──────────────────────── */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <CreditBalanceBar showLabel={false} showDetails={false} compact />
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  { label: 'Passif', value: passiveCredits, color: 'text-amber-500' },
                  { label: 'Quotidien', value: dailyCredits, color: 'text-green-500' },
                  { label: 'Bonus', value: bonusCredits, color: 'text-blue-500' },
                  { label: 'Achetés', value: purchasedCredits, color: 'text-sky-500' },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value.toFixed(1)}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Quick Info Chips ───────────────────────── */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-medium whitespace-nowrap shrink-0">
            <Clock className="w-3.5 h-3.5 text-green-500" />
            <span>+{maxDailyCredits}/jour à minuit</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium whitespace-nowrap shrink-0">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>+0.1 passif / 2h</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium whitespace-nowrap shrink-0">
            <ArrowRight className="w-3.5 h-3.5 text-primary" />
            <span>Ordre : Passif → Quotidien → Bonus → Achetés</span>
          </div>
        </motion.div>

        {/* ── Acheter ────────────────────────────────── */}
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <Card className="border-primary/20 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <ShoppingCart className="w-4.5 h-4.5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Acheter des crédits</p>
                  <p className="text-[11px] text-muted-foreground">Permanents, sans expiration</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { amount: 50, price: '4,99 €' },
                  { amount: 120, price: '9,99 €' },
                  { amount: 300, price: '19,99 €' },
                  { amount: 700, price: '39,99 €', best: true },
                ].map((p) => (
                  <div
                    key={p.amount}
                    className={`rounded-xl p-2.5 text-center border transition-colors ${
                      p.best
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-muted/40 border-border/50'
                    }`}
                  >
                    <div className={`text-base font-bold ${p.best ? 'text-primary' : ''}`}>{p.amount}</div>
                    <div className="text-[10px] text-muted-foreground">{p.price}</div>
                  </div>
                ))}
              </div>

              <BuyCreditDialog
                trigger={
                  <Button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold h-11 shadow-md shadow-primary/20">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Acheter des crédits
                  </Button>
                }
              />
              <p className="text-[10px] text-center text-muted-foreground">
                Crédits ajoutés après validation administrateur
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Gagner des crédits ─────────────────────── */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4.5 h-4.5 text-green-500" />
                <p className="font-semibold text-sm">Gagner des crédits gratuits</p>
              </div>

              {[
                { icon: <Zap className="w-4 h-4 text-green-500" />, label: 'Inscription', reward: CREDIT_REWARDS.signup, bg: 'bg-green-500/10' },
                { icon: <Shield className="w-4 h-4 text-blue-500" />, label: 'Vérification d\'identité', reward: CREDIT_REWARDS.identity_verification, bg: 'bg-blue-500/10' },
                { icon: <Clock className="w-4 h-4 text-amber-500" />, label: 'Crédits quotidiens', reward: CREDIT_REWARDS.daily_claim, bg: 'bg-amber-500/10', suffix: '/jour' },
                { icon: <Users className="w-4 h-4 text-purple-500" />, label: 'Parrainage réussi', reward: dynamicCosts?.referral_reward ?? CREDIT_REWARDS.referral_success, bg: 'bg-purple-500/10', suffix: ' chacun' },
              ].map((r) => (
                <div key={r.label} className={`flex items-center justify-between p-3 rounded-xl ${r.bg}`}>
                  <div className="flex items-center gap-2.5">
                    {r.icon}
                    <span className="text-sm font-medium">{r.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs font-bold bg-background/80">
                    +{r.reward}{r.suffix || ''} crédits
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Parrainage ─────────────────────────────── */}
        <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
          <CreditReferralSection />
        </motion.div>

        {/* ── Coûts & FAQ (Tabs) ─────────────────────── */}
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <Tabs defaultValue="costs" className="w-full">
            <TabsList className="w-full mb-3">
              <TabsTrigger value="costs" className="flex-1 gap-1.5 text-xs">
                <TrendingUp className="w-3.5 h-3.5" />
                Coût des actions
              </TabsTrigger>
              <TabsTrigger value="faq" className="flex-1 gap-1.5 text-xs">
                <HelpCircle className="w-3.5 h-3.5" />
                FAQ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="costs">
              <Card className="shadow-sm">
                <CardContent className="p-4 space-y-1 divide-y divide-border/40">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2">Messages</p>
                  <CostRow icon={<MessageCircle className="w-4 h-4 text-primary" />} label="Message texte" cost={CREDIT_COSTS.private_message_text} note="Message privé" />
                  <CostRow icon={<Camera className="w-4 h-4 text-primary" />} label="Photo / Vidéo" cost={CREDIT_COSTS.private_message_media} note="Média permanent" />
                  <CostRow icon={<Sparkles className="w-4 h-4 text-purple-500" />} label="Média éphémère" cost={CREDIT_COSTS.ephemeral_media} note="Disparaît après visionnage" />
                  <CostRow icon={<Users className="w-4 h-4 text-primary" />} label="Média groupe" cost={CREDIT_COSTS.group_message_media} />

                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4 pb-2">Profil & Social</p>
                  <CostRow icon={<Eye className="w-4 h-4 text-primary" />} label="Consulter un profil" cost={CREDIT_COSTS.profile_view} />
                  <CostRow icon={<Heart className="w-4 h-4 text-pink-500" />} label="Réaction profil" cost={CREDIT_COSTS.profile_reaction} />
                  <CostRow icon={<Heart className="w-4 h-4 text-pink-500" />} label="Like (swipe)" cost={CREDIT_COSTS.swipe_like} />
                  <CostRow icon={<MessageCircle className="w-4 h-4 text-primary" />} label="Démarrer conversation" cost={CREDIT_COSTS.swipe_start_conversation} note="Après un match" />

                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4 pb-2">Albums</p>
                  <CostRow icon={<FolderOpen className="w-4 h-4 text-primary" />} label="Partage d'album" cost={CREDIT_COSTS.album_share} />
                  <CostRow icon={<FolderOpen className="w-4 h-4 text-amber-500" />} label="Créer un album (2ème+)" cost={CREDIT_COSTS.album_create} note="1er album gratuit" />

                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4 pb-2">Proximité</p>
                  <CostRow icon={<MapPin className="w-4 h-4 text-emerald-500" />} label="+30 profils proches" cost={CREDIT_COSTS.nearby_unlock_30} note="72 heures" />
                  <CostRow icon={<MapPin className="w-4 h-4 text-emerald-500" />} label="+130 profils proches" cost={CREDIT_COSTS.nearby_unlock_130} note="7 jours" />

                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4 pb-2">ChatBot & Groupes</p>
                  <CostRow icon={<Bot className="w-4 h-4 text-cyan-500" />} label="Message chatbot" cost={CREDIT_COSTS.chatbot_message} />
                  <CostRow icon={<Bot className="w-4 h-4 text-cyan-500" />} label="Activer le chatbot" cost={CREDIT_COSTS.chatbot_activate} />
                  <CostRow icon={<Users className="w-4 h-4 text-indigo-500" />} label="Rejoindre un groupe" cost={CREDIT_COSTS.join_extra_group} note="Hors département" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="faq">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="how">
                      <AccordionTrigger className="text-sm">Comment fonctionne le système de crédits ?</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        Chaque action sur GayConnect consomme des crédits. Vous recevez 15 crédits bonus à l'inscription et 5 crédits gratuits automatiquement chaque jour à minuit. Les crédits quotidiens non utilisés sont remplacés le lendemain.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="order">
                      <AccordionTrigger className="text-sm">Dans quel ordre les crédits sont-ils utilisés ?</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        Les crédits passifs sont utilisés en premier, puis les quotidiens, les bonus, et enfin les achetés. Cela vous permet de préserver vos crédits payants le plus longtemps possible.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="album">
                      <AccordionTrigger className="text-sm">Le premier album est-il gratuit ?</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        Oui ! La création de votre premier album privé est entièrement gratuite. Seuls les albums suivants coûtent 10 crédits.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="daily">
                      <AccordionTrigger className="text-sm">Comment fonctionnent les crédits quotidiens ?</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        Vous recevez automatiquement 5 crédits gratuits chaque jour à minuit. Ces crédits sont utilisés en priorité après les crédits passifs. Si vous ne les utilisez pas, ils seront remplacés le lendemain.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="referral">
                      <AccordionTrigger className="text-sm">Comment fonctionne le parrainage ?</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        Partagez votre code de parrainage unique. Lorsqu'un filleul s'inscrit avec votre code ET complète sa vérification d'identité, vous recevez tous les deux des crédits bonus. Les deux parties doivent être vérifiées.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default CreditsPage;
