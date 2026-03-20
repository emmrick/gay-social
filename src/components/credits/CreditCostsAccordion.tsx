import { useState } from 'react';
import {
  MessageCircle, Image, Camera, Eye, Heart, ThumbsUp, ThumbsDown,
  EyeOff, MessageSquarePlus, Share2, FolderOpen, Users, MapPin,
  Bookmark, PenLine, Zap, Search, Percent
} from 'lucide-react';
import { CREDIT_COSTS } from '@/hooks/useCredits';
import { useDynamicCreditCosts, DEFAULT_COSTS } from '@/hooks/useDynamicCreditCosts';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CostRow {
  icon: React.ReactNode;
  label: string;
  costKey: string;
  fallbackCost: number | string;
  free?: boolean;
}

interface CostCategory {
  id: string;
  emoji: string;
  title: string;
  items: CostRow[];
}

const categories: CostCategory[] = [
  {
    id: 'messages', emoji: '💬', title: 'Messages',
    items: [
      { icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'Texte (privé / groupe)', costKey: 'private_message_text', fallbackCost: CREDIT_COSTS.private_message_text },
      { icon: <Image className="w-3.5 h-3.5" />, label: 'Photo / Vidéo', costKey: 'private_message_media', fallbackCost: CREDIT_COSTS.private_message_media },
      { icon: <Camera className="w-3.5 h-3.5" />, label: 'Média éphémère', costKey: 'ephemeral_media', fallbackCost: CREDIT_COSTS.ephemeral_media },
    ],
  },
  {
    id: 'profiles', emoji: '👤', title: 'Profils & Social',
    items: [
      { icon: <Eye className="w-3.5 h-3.5" />, label: 'Consulter un profil', costKey: 'profile_view', fallbackCost: CREDIT_COSTS.profile_view },
      { icon: <Heart className="w-3.5 h-3.5" />, label: 'Réaction sur profil', costKey: 'profile_reaction', fallbackCost: CREDIT_COSTS.profile_reaction },
    ],
  },
  {
    id: 'swipe', emoji: '✨', title: 'Swipe',
    items: [
      { icon: <ThumbsUp className="w-3.5 h-3.5" />, label: 'Aimer', costKey: 'swipe_like', fallbackCost: CREDIT_COSTS.swipe_like },
      { icon: <ThumbsDown className="w-3.5 h-3.5" />, label: 'Passer', costKey: 'swipe_dislike', fallbackCost: CREDIT_COSTS.swipe_dislike },
      { icon: <EyeOff className="w-3.5 h-3.5" />, label: 'Masquer', costKey: 'swipe_hide', fallbackCost: CREDIT_COSTS.swipe_hide },
      { icon: <MessageSquarePlus className="w-3.5 h-3.5" />, label: 'Engager conversation', costKey: 'swipe_start_conversation', fallbackCost: CREDIT_COSTS.swipe_start_conversation },
    ],
  },
  {
    id: 'albums', emoji: '📁', title: 'Albums & Groupes',
    items: [
      { icon: <Share2 className="w-3.5 h-3.5" />, label: 'Partage d\'album', costKey: 'album_share', fallbackCost: CREDIT_COSTS.album_share },
      { icon: <FolderOpen className="w-3.5 h-3.5" />, label: 'Créer un album (2e+)', costKey: 'album_create', fallbackCost: CREDIT_COSTS.album_create },
      { icon: <Users className="w-3.5 h-3.5" />, label: 'Groupe supplémentaire', costKey: 'join_extra_group', fallbackCost: CREDIT_COSTS.join_extra_group },
    ],
  },
  {
    id: 'saved', emoji: '📌', title: 'Messages enregistrés',
    items: [
      { icon: <Bookmark className="w-3.5 h-3.5" />, label: '1er message', costKey: '_saved_first', fallbackCost: 0, free: true },
      { icon: <Bookmark className="w-3.5 h-3.5" />, label: '2e et suivants', costKey: '_saved_next', fallbackCost: '5, 10, 15…' },
      { icon: <PenLine className="w-3.5 h-3.5" />, label: 'Modifier', costKey: '_saved_edit', fallbackCost: 2.0 },
    ],
  },
  {
    id: 'nearby', emoji: '📍', title: 'Proximité',
    items: [
      { icon: <MapPin className="w-3.5 h-3.5" />, label: '+30 profils (72h)', costKey: 'nearby_unlock_30', fallbackCost: CREDIT_COSTS.nearby_unlock_30 },
      { icon: <MapPin className="w-3.5 h-3.5" />, label: '+130 profils (7j)', costKey: 'nearby_unlock_130', fallbackCost: CREDIT_COSTS.nearby_unlock_130 },
    ],
  },
  {
    id: 'chatbot', emoji: '🤖', title: 'Chatbot',
    items: [
      { icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'Message', costKey: 'chatbot_message', fallbackCost: CREDIT_COSTS.chatbot_message },
      { icon: <PenLine className="w-3.5 h-3.5" />, label: 'Info (1-10)', costKey: 'chatbot_info', fallbackCost: CREDIT_COSTS.chatbot_info },
      { icon: <PenLine className="w-3.5 h-3.5" />, label: 'Info (11+)', costKey: 'chatbot_info_extra', fallbackCost: CREDIT_COSTS.chatbot_info_extra },
      { icon: <Zap className="w-3.5 h-3.5" />, label: 'Activer', costKey: 'chatbot_activate', fallbackCost: CREDIT_COSTS.chatbot_activate },
    ],
  },
];

const CreditCostsAccordion = () => {
  const [search, setSearch] = useState('');
  const { data: dynamicCosts } = useDynamicCreditCosts();

  const getActualCost = (item: CostRow): number | string => {
    if (item.costKey.startsWith('_')) return item.fallbackCost; // non-dynamic items
    if (dynamicCosts && item.costKey in dynamicCosts) {
      return dynamicCosts[item.costKey];
    }
    return item.fallbackCost;
  };

  const isPromo = (item: CostRow): boolean => {
    if (item.costKey.startsWith('_')) return false;
    const actual = getActualCost(item);
    if (typeof actual !== 'number') return false;
    const original = DEFAULT_COSTS[item.costKey];
    if (original === undefined) return false;
    return actual < original;
  };

  const isFree = (item: CostRow): boolean => {
    const actual = getActualCost(item);
    return actual === 0 || item.free === true;
  };

  const getDiscount = (item: CostRow): number => {
    const actual = getActualCost(item);
    if (typeof actual !== 'number') return 0;
    const original = DEFAULT_COSTS[item.costKey];
    if (!original || original === 0) return 0;
    return Math.round((1 - actual / original) * 100);
  };

  const filtered = search.trim()
    ? categories.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.label.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : categories;

  // Count active promos
  const promoCount = categories.reduce(
    (count, cat) => count + cat.items.filter(i => isPromo(i)).length,
    0
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">💰</span>
          <h2 className="text-sm font-semibold">Coût des actions</h2>
        </div>
        {promoCount > 0 && (
          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px] gap-1 font-semibold">
            <Percent className="w-3 h-3" />
            {promoCount} promo{promoCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Rechercher une action…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 text-xs rounded-xl bg-muted/50 border-border/60"
        />
      </div>

      <Accordion type="multiple" className="space-y-1.5">
        {filtered.map(cat => {
          const hasPromo = cat.items.some(i => isPromo(i));
          return (
            <AccordionItem key={cat.id} value={cat.id} className="border rounded-xl overflow-hidden border-border/60">
              <AccordionTrigger className="text-[13px] font-medium px-3 py-2.5 hover:no-underline hover:bg-muted/30">
                <span className="flex items-center gap-2">
                  <span>{cat.emoji}</span>
                  {cat.title}
                  {hasPromo && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 text-[9px] px-1.5 py-0 h-4 font-bold">
                      PROMO
                    </Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <div className="space-y-0.5">
                  {cat.items.map((item, j) => {
                    const actualCost = getActualCost(item);
                    const hasDiscount = isPromo(item);
                    const itemIsFree = isFree(item);
                    const discount = getDiscount(item);
                    const originalCost = DEFAULT_COSTS[item.costKey];

                    return (
                      <motion.div
                        key={j}
                        initial={hasDiscount ? { scale: 1 } : undefined}
                        className={cn(
                          "flex items-center justify-between py-2 px-2 rounded-lg transition-colors",
                          hasDiscount
                            ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                            : "hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="text-muted-foreground">{item.icon}</span>
                          <span className="text-[12px] truncate">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasDiscount && originalCost !== undefined && (
                            <span className="text-[10px] text-muted-foreground line-through tabular-nums">
                              {originalCost}
                            </span>
                          )}
                          <span className={cn(
                            "text-[11px] font-mono font-semibold tabular-nums",
                            itemIsFree
                              ? "text-emerald-500"
                              : hasDiscount
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                          )}>
                            {itemIsFree ? 'Gratuit' : typeof actualCost === 'number' ? `-${actualCost}` : actualCost}
                          </span>
                          {hasDiscount && discount > 0 && (
                            <Badge className="bg-emerald-500 text-white text-[8px] px-1 py-0 h-3.5 font-bold">
                              -{discount}%
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
};

export default CreditCostsAccordion;
