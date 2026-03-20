import { useState } from 'react';
import {
  MessageCircle, Image, Camera, Eye, Heart, ThumbsUp, ThumbsDown,
  EyeOff, MessageSquarePlus, Share2, FolderOpen, Users, MapPin,
  Bookmark, PenLine, Zap, Search, ChevronDown
} from 'lucide-react';
import { CREDIT_COSTS } from '@/hooks/useCredits';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CostRow {
  icon: React.ReactNode;
  label: string;
  cost: number | string;
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
      { icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'Texte (privé / groupe)', cost: CREDIT_COSTS.private_message_text },
      { icon: <Image className="w-3.5 h-3.5" />, label: 'Photo / Vidéo', cost: CREDIT_COSTS.private_message_media },
      { icon: <Camera className="w-3.5 h-3.5" />, label: 'Média éphémère', cost: CREDIT_COSTS.ephemeral_media },
    ],
  },
  {
    id: 'profiles', emoji: '👤', title: 'Profils & Social',
    items: [
      { icon: <Eye className="w-3.5 h-3.5" />, label: 'Consulter un profil', cost: CREDIT_COSTS.profile_view },
      { icon: <Heart className="w-3.5 h-3.5" />, label: 'Réaction sur profil', cost: CREDIT_COSTS.profile_reaction },
    ],
  },
  {
    id: 'swipe', emoji: '✨', title: 'Swipe',
    items: [
      { icon: <ThumbsUp className="w-3.5 h-3.5" />, label: 'Aimer', cost: CREDIT_COSTS.swipe_like },
      { icon: <ThumbsDown className="w-3.5 h-3.5" />, label: 'Passer', cost: CREDIT_COSTS.swipe_dislike },
      { icon: <EyeOff className="w-3.5 h-3.5" />, label: 'Masquer', cost: CREDIT_COSTS.swipe_hide },
      { icon: <MessageSquarePlus className="w-3.5 h-3.5" />, label: 'Engager conversation', cost: CREDIT_COSTS.swipe_start_conversation },
    ],
  },
  {
    id: 'albums', emoji: '📁', title: 'Albums & Groupes',
    items: [
      { icon: <Share2 className="w-3.5 h-3.5" />, label: 'Partage d\'album', cost: CREDIT_COSTS.album_share },
      { icon: <FolderOpen className="w-3.5 h-3.5" />, label: 'Créer un album (2e+)', cost: CREDIT_COSTS.album_create },
      { icon: <Users className="w-3.5 h-3.5" />, label: 'Groupe supplémentaire', cost: CREDIT_COSTS.join_extra_group },
    ],
  },
  {
    id: 'saved', emoji: '📌', title: 'Messages enregistrés',
    items: [
      { icon: <Bookmark className="w-3.5 h-3.5" />, label: '1er message', cost: 0, free: true },
      { icon: <Bookmark className="w-3.5 h-3.5" />, label: '2e et suivants', cost: '5, 10, 15…' },
      { icon: <PenLine className="w-3.5 h-3.5" />, label: 'Modifier', cost: 2.0 },
    ],
  },
  {
    id: 'nearby', emoji: '📍', title: 'Proximité',
    items: [
      { icon: <MapPin className="w-3.5 h-3.5" />, label: '+30 profils (72h)', cost: CREDIT_COSTS.nearby_unlock_30 },
      { icon: <MapPin className="w-3.5 h-3.5" />, label: '+130 profils (7j)', cost: CREDIT_COSTS.nearby_unlock_130 },
    ],
  },
  {
    id: 'chatbot', emoji: '🤖', title: 'Chatbot',
    items: [
      { icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'Message', cost: CREDIT_COSTS.chatbot_message },
      { icon: <PenLine className="w-3.5 h-3.5" />, label: 'Info (1-10)', cost: CREDIT_COSTS.chatbot_info },
      { icon: <PenLine className="w-3.5 h-3.5" />, label: 'Info (11+)', cost: CREDIT_COSTS.chatbot_info_extra },
      { icon: <Zap className="w-3.5 h-3.5" />, label: 'Activer', cost: CREDIT_COSTS.chatbot_activate },
    ],
  },
];

const CreditCostsAccordion = () => {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? categories.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.label.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : categories;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">💰</span>
        <h2 className="text-sm font-semibold">Coût des actions</h2>
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
        {filtered.map(cat => (
          <AccordionItem key={cat.id} value={cat.id} className="border rounded-xl overflow-hidden border-border/60">
            <AccordionTrigger className="text-[13px] font-medium px-3 py-2.5 hover:no-underline hover:bg-muted/30">
              <span className="flex items-center gap-2">
                <span>{cat.emoji}</span>
                {cat.title}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-0.5">
                {cat.items.map((item, j) => (
                  <div
                    key={j}
                    className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-muted-foreground">{item.icon}</span>
                      <span className="text-[12px]">{item.label}</span>
                    </div>
                    <span className={cn(
                      "text-[11px] font-mono font-semibold tabular-nums",
                      item.free ? "text-emerald-500" : "text-muted-foreground"
                    )}>
                      {item.free ? 'Gratuit' : typeof item.cost === 'number' ? `-${item.cost}` : item.cost}
                    </span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default CreditCostsAccordion;
