/**
 * AdminBottomTabs — Bottom tab bar mobile pour l'espace admin/modération.
 *
 * 5 onglets fixes accessibles au pouce :
 *  - Accueil (dashboard)
 *  - Modération (signalements + contenu agrégés)
 *  - Membres
 *  - Finances
 *  - Plus (drawer avec toutes les autres sections)
 *
 * L'onglet actif est déduit de la section courante via un mapping.
 */
import { memo, useMemo, useState } from 'react';
import { Home, Shield, Users, Wallet, MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AdminSection, ModPermissions } from './AdminSidebar';
import {
  ListOrdered, Headphones, Star, IdCard, MessageSquare, Bot, Camera, Filter,
  BarChart3, UserCog, Activity, ShoppingCart, Euro, ArrowUpRight, PieChart,
  Bell, HelpCircle, FileImage, Sparkles, Rocket, Ticket, Megaphone, Coins,
  Heart, Wrench, ToggleLeft, ShieldAlert, Radio, Lightbulb, Mail, Clock,
} from 'lucide-react';

interface AdminBottomTabsProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  pendingReports?: number;
  pendingPurchases?: number;
  pendingVerifications?: number;
  isAdmin?: boolean;
  modPermissions?: ModPermissions | null;
}

type TabId = 'home' | 'moderation' | 'members' | 'finances' | 'more';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  /** sections appartenant à cet onglet (pour calculer l'état actif) */
  sections: AdminSection[];
  /** section vers laquelle on navigue au tap */
  target: AdminSection;
}

const TABS: Tab[] = [
  { id: 'home',       label: 'Accueil',    icon: Home,   sections: ['dashboard'], target: 'dashboard' },
  { id: 'moderation', label: 'Modération', icon: Shield, sections: ['reports', 'moderation', 'ai-moderation', 'screenshot-sanctions', 'verification', 'pending-tasks', 'support', 'support-ratings', 'live-content', 'suggestions'], target: 'reports' },
  { id: 'members',    label: 'Membres',    icon: Users,  sections: ['users', 'stats', 'moderators'], target: 'users' },
  { id: 'finances',   label: 'Finances',   icon: Wallet, sections: ['wallet', 'credits-surveillance', 'credit-purchases', 'rates', 'withdrawals', 'global'], target: 'wallet' },
  { id: 'more',       label: 'Plus',       icon: MoreHorizontal, sections: [], target: 'dashboard' },
];

/* --- Sections détaillées dans le drawer "Plus" --- */
interface MoreItem {
  id: AdminSection;
  label: string;
  icon: React.ElementType;
  group: 'communication' | 'config' | 'logs';
  adminOnly?: boolean;
  permissionKey?: keyof ModPermissions;
}

const MORE_ITEMS: MoreItem[] = [
  { id: 'live-content',    label: 'Direct',       icon: Radio,       group: 'communication', permissionKey: 'can_manage_content' },
  { id: 'suggestions',     label: 'Idées',        icon: Lightbulb,   group: 'communication', permissionKey: 'can_manage_content' },
  { id: 'broadcast',       label: 'Push',         icon: Bell,        group: 'communication', adminOnly: true, permissionKey: 'can_broadcast' },
  { id: 'popups',          label: 'Pop-ups',      icon: Bell,        group: 'communication', adminOnly: true, permissionKey: 'can_manage_popups' },
  { id: 'faq',             label: 'Aide',         icon: HelpCircle,  group: 'communication', adminOnly: true, permissionKey: 'can_manage_faq' },
  { id: 'flyers',          label: 'Flyers',       icon: FileImage,   group: 'communication', adminOnly: true, permissionKey: 'can_manage_flyers' },
  { id: 'promo-images',    label: 'Visuels',      icon: Sparkles,    group: 'communication', adminOnly: true, permissionKey: 'can_manage_promo' },
  { id: 'site-updates',    label: 'Updates',      icon: Rocket,      group: 'communication', adminOnly: true, permissionKey: 'can_broadcast' },
  { id: 'promo',           label: 'Promos',       icon: Ticket,      group: 'communication', adminOnly: true, permissionKey: 'can_manage_promo' },
  { id: 'ads',             label: 'Annonces',     icon: Megaphone,   group: 'communication', permissionKey: 'can_manage_content' },
  { id: 'credit-costs',    label: 'Coûts crédit', icon: Coins,       group: 'config',        adminOnly: true, permissionKey: 'can_manage_credits' },
  { id: 'swipe-stats',     label: 'Swipe',        icon: Heart,       group: 'config',        adminOnly: true, permissionKey: 'can_view_stats' },
  { id: 'maintenance',     label: 'Maintenance',  icon: Wrench,      group: 'config',        adminOnly: true },
  { id: 'feature-toggles', label: 'Toggles',      icon: ToggleLeft,  group: 'config',        adminOnly: true },
  { id: 'error-logs',      label: 'Erreurs',      icon: Activity,    group: 'logs',          adminOnly: true, permissionKey: 'can_view_logs' },
  { id: 'security',        label: 'Sécurité',     icon: ShieldAlert, group: 'logs',          adminOnly: true, permissionKey: 'can_view_logs' },
  { id: 'emails',          label: 'E-mails',      icon: Mail,        group: 'logs',          adminOnly: true, permissionKey: 'can_view_logs' },
  { id: 'cron-logs',       label: 'Cron',         icon: Clock,       group: 'logs',          adminOnly: true, permissionKey: 'can_view_logs' },
];

const GROUP_LABELS = {
  communication: 'Communication',
  config: 'Configuration',
  logs: 'Monitoring',
} as const;

const AdminBottomTabs = ({
  activeSection,
  onSectionChange,
  pendingReports = 0,
  pendingPurchases = 0,
  pendingVerifications = 0,
  isAdmin = false,
  modPermissions,
}: AdminBottomTabsProps) => {
  const [moreOpen, setMoreOpen] = useState(false);

  const activeTab: TabId = useMemo(() => {
    const found = TABS.find(t => t.sections.includes(activeSection));
    return found?.id ?? 'more';
  }, [activeSection]);

  const tabBadges: Record<TabId, number> = {
    home: 0,
    moderation: pendingReports + pendingVerifications,
    members: 0,
    finances: pendingPurchases,
    more: 0,
  };

  const handleTabClick = (tab: Tab) => {
    if (tab.id === 'more') {
      setMoreOpen(true);
      return;
    }
    onSectionChange(tab.target);
  };

  const handleMoreItemClick = (id: AdminSection) => {
    setMoreOpen(false);
    onSectionChange(id);
  };

  const visibleMoreItems = MORE_ITEMS.filter(item => {
    if (!item.adminOnly) return true;
    if (isAdmin) return true;
    if (item.permissionKey && modPermissions?.[item.permissionKey]) return true;
    return false;
  });

  const groupedMoreItems = visibleMoreItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<MoreItem['group'], MoreItem[]>);

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Navigation admin"
      >
        <div className="grid grid-cols-5 h-[64px] max-w-md mx-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badge = tabBadges[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 transition-colors active:bg-secondary/40 min-h-[44px]',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary" />
                )}
                <div className="relative">
                  <Icon
                    className={cn('w-[22px] h-[22px] transition-transform', isActive && 'scale-110')}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  {badge > 0 && (
                    <Badge className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground border-2 border-card text-[9px] font-bold flex items-center justify-center leading-none">
                      {badge > 99 ? '99+' : badge}
                    </Badge>
                  )}
                </div>
                <span className={cn('text-[10px] font-medium tracking-tight', isActive && 'font-semibold')}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="max-h-[88vh] flex flex-col">
          <DrawerHeader className="flex-shrink-0 flex flex-row items-center justify-between border-b border-border/30 px-4 py-3">
            <DrawerTitle className="font-display text-base font-semibold">Plus d'options</DrawerTitle>
            <button
              onClick={() => setMoreOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-secondary/60 flex items-center justify-center text-muted-foreground"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </DrawerHeader>
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
            data-vaul-no-drag
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="p-3 space-y-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
              {(Object.keys(GROUP_LABELS) as Array<keyof typeof GROUP_LABELS>).map(groupKey => {
                const items = groupedMoreItems[groupKey];
                if (!items?.length) return null;
                return (
                  <div key={groupKey}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                        {GROUP_LABELS[groupKey]}
                      </span>
                      <div className="flex-1 h-px bg-border/30" />
                    </div>
                    <div className="grid grid-cols-2 xs:grid-cols-3 gap-2.5">
                      {items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleMoreItemClick(item.id)}
                            className="flex flex-col items-center justify-center gap-2 p-3.5 min-h-[88px] rounded-2xl bg-secondary/40 hover:bg-secondary/70 active:scale-[0.97] transition-all border border-border/20"
                          >
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Icon className="w-[18px] h-[18px] text-primary" />
                            </div>
                            <span className="text-[11px] font-medium text-center leading-tight">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default memo(AdminBottomTabs);
