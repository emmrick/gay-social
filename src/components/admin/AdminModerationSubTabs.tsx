/**
 * Sous-onglets horizontaux affichés en haut des sections groupées
 * (Modération, Membres, Finances) sur mobile. Permet de naviguer entre
 * les sections d'un même groupe sans repasser par le dashboard.
 *
 * Les items sont filtrés selon les permissions du modérateur (ou tous
 * visibles pour les admins).
 */
import { memo, useMemo } from 'react';
import {
  Filter,
  MessageSquare,
  Bot,
  Camera,
  IdCard,
  ListChecks,
  Headphones,
  Star,
  Radio,
  Lightbulb,
  Users,
  BarChart3,
  UserCog,
  Wallet,
  Activity,
  ShoppingCart,
  Euro,
  ArrowUpRight,
  PieChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminSection, ModPermissions } from './AdminSidebar';

interface SubTab {
  id: AdminSection;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  permissionKey?: keyof ModPermissions;
}

const MOD_TABS: SubTab[] = [
  { id: 'pending-tasks', label: 'Missions', icon: ListChecks },
  { id: 'support', label: 'Support', icon: Headphones, permissionKey: 'can_manage_support' as never },
  { id: 'support-ratings', label: 'Avis', icon: Star, adminOnly: true },
  { id: 'reports', label: 'Signalements', icon: Filter, permissionKey: 'can_manage_reports' },
  { id: 'moderation', label: 'Contenu', icon: MessageSquare, permissionKey: 'can_manage_content' },
  { id: 'live-content', label: 'Direct', icon: Radio, permissionKey: 'can_manage_content' },
  { id: 'ai-moderation', label: 'IA', icon: Bot, permissionKey: 'can_ai_moderation' },
  { id: 'screenshot-sanctions', label: 'Captures', icon: Camera, permissionKey: 'can_screenshot_sanctions' },
  { id: 'suggestions', label: 'Idées', icon: Lightbulb, permissionKey: 'can_manage_content' },
  { id: 'verification', label: 'Identité', icon: IdCard, adminOnly: true, permissionKey: 'can_verify_identity' },
];

const USERS_TABS: SubTab[] = [
  { id: 'users', label: 'Membres', icon: Users, adminOnly: true, permissionKey: 'can_manage_users' },
  { id: 'stats', label: 'Stats', icon: BarChart3, adminOnly: true, permissionKey: 'can_view_stats' },
  { id: 'moderators', label: 'Équipe', icon: UserCog, adminOnly: true },
];

const FINANCES_TABS: SubTab[] = [
  { id: 'wallet', label: 'Portefeuille', icon: Wallet },
  { id: 'credits-surveillance', label: 'Surveillance', icon: Activity, adminOnly: true, permissionKey: 'can_manage_credits' },
  { id: 'credit-purchases', label: 'Achats', icon: ShoppingCart, permissionKey: 'can_manage_credits' },
  { id: 'rates', label: 'Tarifs', icon: Euro, adminOnly: true },
  { id: 'withdrawals', label: 'Retraits', icon: ArrowUpRight, adminOnly: true },
  { id: 'global', label: 'Gains', icon: PieChart, adminOnly: true },
];

const MODERATION_SECTIONS: AdminSection[] = MOD_TABS.map((t) => t.id);
const USERS_SECTIONS: AdminSection[] = USERS_TABS.map((t) => t.id);
const FINANCES_SECTIONS: AdminSection[] = FINANCES_TABS.map((t) => t.id);

interface Props {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  isAdmin: boolean;
  modPermissions?: ModPermissions | null;
}

const AdminModerationSubTabs = ({
  activeSection,
  onSectionChange,
  isAdmin,
  modPermissions,
}: Props) => {
  const activeGroupTabs = useMemo<SubTab[] | null>(() => {
    if (MODERATION_SECTIONS.includes(activeSection)) return MOD_TABS;
    if (USERS_SECTIONS.includes(activeSection)) return USERS_TABS;
    if (FINANCES_SECTIONS.includes(activeSection)) return FINANCES_TABS;
    return null;
  }, [activeSection]);

  const visible = useMemo(() => {
    if (!activeGroupTabs) return [];
    return activeGroupTabs.filter((t) => {
      if (isAdmin) return true;
      if (t.adminOnly) return false;
      if (!t.permissionKey) return true;
      return Boolean(modPermissions?.[t.permissionKey as keyof ModPermissions]);
    });
  }, [activeGroupTabs, isAdmin, modPermissions]);

  if (!activeGroupTabs) return null;
  if (visible.length <= 1) return null;

  return (
    <div className="-mx-3 mb-3 border-b border-border/40">
      <div className="flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none">
        {visible.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeSection;
          return (
            <button
              key={tab.id}
              onClick={() => onSectionChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default memo(AdminModerationSubTabs);
export { MODERATION_SECTIONS, USERS_SECTIONS, FINANCES_SECTIONS };
