import { useState } from 'react';
import {
  Coins, Gift, ShoppingCart, Users, MessageCircle, Camera,
  FolderOpen, Heart, Eye, MapPin, Loader2, Sparkles, Shield,
  Clock, Zap, HelpCircle, TrendingUp, Bot, ChevronRight,
  ArrowDownUp, CreditCard, Rocket, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCredits, CREDIT_COSTS, CREDIT_REWARDS } from '@/hooks/useCredits';
import { useDynamicCreditCosts } from '@/hooks/useDynamicCreditCosts';
import CreditBalanceBar from './CreditBalanceBar';
import CreditHistorySheet from './CreditHistorySheet';
import CreditReferralSection from './CreditReferralSection';
import BuyCreditDialog from './BuyCreditDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion, AnimatePresence } from 'framer-motion';

const CreditsPage = () => {
  const { isLoading, totalCredits, dailyCredits, bonusCredits, purchasedCredits, passiveCredits, maxDailyCredits } = useCredits();
  const { data: dynamicCosts } = useDynamicCreditCosts();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const creditBreakdown = [
    { label: 'Passif', value: passiveCredits, icon: Zap, gradient: 'from-amber-500 to-orange-500' },
    { label: 'Quotidien', value: dailyCredits, icon: Clock, gradient: 'from-emerald-500 to-green-500' },
    { label: 'Bonus', value: bonusCredits, icon: Gift, gradient: 'from-blue-500 to-indigo-500' },
    { label: 'Achetés', value: purchasedCredits, icon: CreditCard, gradient: 'from-violet-500 to-purple-500' },
  ];

  const costSections = [
    {
      id: 'messages',
      title: 'Messages',
      icon: MessageCircle,
      gradient: 'from-primary to-blue-500',
      items: [
        { icon: MessageCircle, label: 'Message texte', cost: CREDIT_COSTS.private_message_text, note: 'Message privé' },
        { icon: Camera, label: 'Photo / Vidéo', cost: CREDIT_COSTS.private_message_media, note: 'Média permanent' },
        { icon: Sparkles, label: 'Média éphémère', cost: CREDIT_COSTS.ephemeral_media, note: 'Disparaît après visionnage' },
        { icon: Users, label: 'Média groupe', cost: CREDIT_COSTS.group_message_media },
      ],
    },
    {
      id: 'social',
      title: 'Profil & Social',
      icon: Heart,
      gradient: 'from-pink-500 to-rose-500',
      items: [
        { icon: Eye, label: 'Consulter un profil', cost: CREDIT_COSTS.profile_view },
        { icon: Heart, label: 'Réaction profil', cost: CREDIT_COSTS.profile_reaction },
        { icon: Heart, label: 'Like (swipe)', cost: CREDIT_COSTS.swipe_like },
        { icon: MessageCircle, label: 'Démarrer conversation', cost: CREDIT_COSTS.swipe_start_conversation, note: 'Après un match' },
      ],
    },
    {
      id: 'albums',
      title: 'Albums',
      icon: FolderOpen,
      gradient: 'from-amber-500 to-yellow-500',
      items: [
        { icon: FolderOpen, label: 'Partage d\'album', cost: CREDIT_COSTS.album_share },
        { icon: FolderOpen, label: 'Créer un album (2ème+)', cost: CREDIT_COSTS.album_create, note: '1er album gratuit' },
      ],
    },
    {
      id: 'nearby',
      title: 'Proximité',
      icon: MapPin,
      gradient: 'from-emerald-500 to-teal-500',
      items: [
        { icon: MapPin, label: '+30 profils proches', cost: CREDIT_COSTS.nearby_unlock_30, note: '72 heures' },
        { icon: MapPin, label: '+130 profils proches', cost: CREDIT_COSTS.nearby_unlock_130, note: '7 jours' },
      ],
    },
    {
      id: 'chatbot',
      title: 'ChatBot & Groupes',
      icon: Bot,
      gradient: 'from-cyan-500 to-sky-500',
      items: [
        { icon: Bot, label: 'Message chatbot', cost: CREDIT_COSTS.chatbot_message },
        { icon: Bot, label: 'Activer le chatbot', cost: CREDIT_COSTS.chatbot_activate },
        { icon: Users, label: 'Rejoindre un groupe', cost: CREDIT_COSTS.join_extra_group, note: 'Hors département' },
      ],
    },
  ];

  const earnMethods = [
    { icon: Rocket, label: 'Inscription', reward: CREDIT_REWARDS.signup, gradient: 'from-green-500 to-emerald-500' },
    { icon: Shield, label: 'Vérification d\'identité', reward: CREDIT_REWARDS.identity_verification, gradient: 'from-blue-500 to-indigo-500' },
    { icon: Clock, label: 'Crédits quotidiens', reward: CREDIT_REWARDS.daily_claim, suffix: '/jour', gradient: 'from-amber-500 to-orange-500' },
    { icon: Users, label: 'Parrainage réussi', reward: dynamicCosts?.referral_reward ?? CREDIT_REWARDS.referral_success, suffix: ' chacun', gradient: 'from-purple-500 to-violet-500' },
  ];


  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ── HERO ──────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-20 -right-20 w-[200px] h-[200px] rounded-full bg-accent/15 blur-[80px]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative px-5 pt-10 pb-8"
        >
          {/* Animated coin icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30 mb-5"
          >
            <Coins className="w-10 h-10 text-primary-foreground" />
          </motion.div>

          {/* Balance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="text-center"
          >
            <div className="text-5xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {totalCredits.toFixed(1)}
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-medium">crédits disponibles</p>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex items-center justify-center gap-3 mt-5"
          >
            <CreditHistorySheet />
            <BuyCreditDialog
              trigger={
                <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground gap-2 shadow-lg shadow-primary/25 px-5 h-10 rounded-xl font-semibold">
                  <ShoppingCart className="w-4 h-4" />
                  Acheter
                </Button>
              }
            />
          </motion.div>
        </motion.div>
      </div>

      <div className="px-4 space-y-5 -mt-2">
        {/* ── BALANCE BREAKDOWN ───────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CreditBalanceBar showLabel={false} showDetails={false} compact />
          <div className="grid grid-cols-4 gap-2 mt-3">
            {creditBreakdown.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="relative overflow-hidden rounded-2xl bg-card border border-border/50 p-3 text-center"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-[0.06]`} />
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-1.5`}>
                  <item.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-lg font-bold tabular-nums relative">{item.value.toFixed(1)}</div>
                <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{item.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── RECHARGE CHIPS ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        >
          {[
            { icon: Clock, text: `+${maxDailyCredits}/jour`, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { icon: Zap, text: '+0.1 passif / 6h', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { icon: ArrowDownUp, text: 'Quotidien → Passif → Bonus → Achetés', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
          ].map((chip, i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full ${chip.bg} border ${chip.border} text-xs font-medium whitespace-nowrap shrink-0`}
            >
              <chip.icon className={`w-3.5 h-3.5 ${chip.color}`} />
              <span>{chip.text}</span>
            </div>
          ))}
        </motion.div>

        {/* ── GAGNER ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl bg-card border border-border/50 overflow-hidden"
        >
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Gift className="w-4.5 h-4.5 text-white" />
              </div>
              <p className="font-bold text-sm">Gagner des crédits gratuits</p>
            </div>

            <div className="space-y-2">
              {earnMethods.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center shrink-0`}>
                    <m.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{m.label}</p>
                  </div>
                  <Badge className="bg-background border border-border/60 text-foreground text-xs font-bold px-2.5 py-1 shadow-sm">
                    +{m.reward}{m.suffix || ''}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>


        {/* ── COÛTS DES ACTIONS ──────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl bg-card border border-border/50 overflow-hidden"
        >
          <div className="p-5 pb-3">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <TrendingUp className="w-4.5 h-4.5 text-white" />
              </div>
              <p className="font-bold text-sm">Coût des actions</p>
            </div>

            <div className="space-y-2">
              {costSections.map((section) => (
                <div key={section.id}>
                  <button
                    onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-all"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${section.gradient} flex items-center justify-center shrink-0`}>
                      <section.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold flex-1 text-left">{section.title}</span>
                    <Badge variant="secondary" className="text-[10px] font-bold mr-1">
                      {section.items.length}
                    </Badge>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${activeSection === section.id ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {activeSection === section.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-1.5 pb-1 px-1 space-y-1">
                          {section.items.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-background/60"
                            >
                              <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium leading-tight">{item.label}</p>
                                {item.note && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.note}</p>
                                )}
                              </div>
                              <span className="text-xs font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                                -{item.cost}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── FAQ ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-3xl bg-card border border-border/50 overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <HelpCircle className="w-4.5 h-4.5 text-white" />
              </div>
              <p className="font-bold text-sm">Questions fréquentes</p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-1.5">
              {[
                { id: 'how', q: 'Comment fonctionne le système de crédits ?', a: 'Chaque action sur GayConnect consomme des crédits. Vous recevez 15 crédits bonus à l\'inscription et 5 crédits gratuits automatiquement chaque jour.' },
                { id: 'order', q: 'Dans quel ordre les crédits sont-ils utilisés ?', a: 'Les crédits quotidiens sont utilisés en premier, puis les passifs, les bonus, et enfin les achetés. Vous pouvez verrouiller certains types pour les économiser.' },
                { id: 'album', q: 'Le premier album est-il gratuit ?', a: 'Oui ! La création de votre premier album privé est entièrement gratuite. Seuls les albums suivants coûtent 10 crédits.' },
                { id: 'daily', q: 'Comment fonctionnent les crédits quotidiens ?', a: 'Vous recevez automatiquement jusqu\'à 5 crédits gratuits chaque jour (complément). Les crédits passifs se régénèrent à 0.1 toutes les 6h (max 10).' },
                { id: 'referral', q: 'Comment fonctionne le parrainage ?', a: 'Partagez votre code unique. Quand un filleul s\'inscrit et complète sa vérification d\'identité, vous recevez tous les deux des crédits bonus.' },
              ].map((faq) => (
                <AccordionItem key={faq.id} value={faq.id} className="border rounded-2xl px-3 overflow-hidden data-[state=open]:bg-muted/30">
                  <AccordionTrigger className="text-[13px] font-semibold py-3 hover:no-underline">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-[13px] text-muted-foreground pb-3 leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreditsPage;
