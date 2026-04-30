import {
  Shield, ShieldAlert, Wallet, Euro, ArrowUpRight, PieChart, BarChart3, Users, Filter,
  MessageSquare, IdCard, Ticket, Coins, ChevronLeft, ChevronsRight, Home,
  Bell, Activity, Bot, ShoppingCart, Camera, Heart, UserCog, Wrench,
  ListOrdered, HelpCircle, Star, Headphones, FileImage, LogOut, Sparkles, ToggleLeft, Rocket, Megaphone, Radio, Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import AdminCommandBar from './AdminCommandBar';
import { useIsTablet } from '@/hooks/use-tablet';

export type AdminSection =
  | 'dashboard'
  | 'wallet' | 'withdrawals' | 'rates' | 'global'
  | 'stats' | 'users' | 'reports' | 'moderation'
  | 'promo' | 'verification'
  | 'credits-surveillance' | 'credit-purchases' | 'broadcast'
  | 'ai-moderation' | 'screenshot-sanctions' | 'moderators'
  | 'swipe-stats' | 'credit-costs' | 'maintenance' | 'pending-tasks'
  | 'support' | 'support-ratings' | 'popups' | 'faq' | 'flyers'
  | 'promo-images' | 'error-logs' | 'security' | 'feature-toggles'
  | 'site-updates' | 'ads' | 'live-content' | 'emails';

export interface ModPermissions {
  can_manage_users?: boolean | null;
  can_verify_identity?: boolean | null;
  can_manage_reports?: boolean | null;
  can_manage_content?: boolean | null;
  can_manage_credits?: boolean | null;
  can_view_stats?: boolean | null;
  can_manage_blocked?: boolean | null;
  can_view_history?: boolean | null;
  can_manage_promo?: boolean | null;
  can_broadcast?: boolean | null;
  can_ai_moderation?: boolean | null;
  can_screenshot_sanctions?: boolean | null;
  can_manage_faq?: boolean | null;
  can_manage_popups?: boolean | null;
  can_view_logs?: boolean | null;
  can_manage_flyers?: boolean | null;
}

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  pendingReports?: number;
  blockedCount?: number;
  pendingPurchases?: number;
  pendingVerifications?: number;
  isAdmin?: boolean;
  modPermissions?: ModPermissions | null;
  /** Widget rendu en bas de sidebar (ex: TaskQueuePopup). Masqué quand collapsed. */
  bottomSlot?: React.ReactNode;
}

type NavGroup = 'tasks' | 'moderation' | 'users' | 'finances' | 'communication' | 'config' | 'logs';

interface NavItem {
  id: AdminSection;
  label: string;
  icon: React.ElementType;
  group: NavGroup;
  adminOnly?: boolean;
  permissionKey?: keyof ModPermissions;
}

const navItems: NavItem[] = [
  { id: 'pending-tasks', label: 'Missions', icon: ListOrdered, group: 'tasks' },
  { id: 'support', label: 'Support', icon: Headphones, group: 'tasks' },
  { id: 'support-ratings', label: 'Avis', icon: Star, group: 'tasks' },
  { id: 'reports', label: 'Signalements', icon: Filter, group: 'moderation', permissionKey: 'can_manage_reports' },
  { id: 'moderation', label: 'Contenu', icon: MessageSquare, group: 'moderation', permissionKey: 'can_manage_content' },
  { id: 'live-content', label: 'Direct', icon: Radio, group: 'moderation', permissionKey: 'can_manage_content' },
  { id: 'ai-moderation', label: 'IA', icon: Bot, group: 'moderation', permissionKey: 'can_ai_moderation' },
  { id: 'screenshot-sanctions', label: 'Captures', icon: Camera, group: 'moderation', permissionKey: 'can_screenshot_sanctions' },
  { id: 'verification', label: 'Identité', icon: IdCard, group: 'moderation', adminOnly: true, permissionKey: 'can_verify_identity' },
  { id: 'users', label: 'Membres', icon: Users, group: 'users', adminOnly: true, permissionKey: 'can_manage_users' },
  { id: 'stats', label: 'Stats', icon: BarChart3, group: 'users', adminOnly: true, permissionKey: 'can_view_stats' },
  { id: 'moderators', label: 'Équipe', icon: UserCog, group: 'users', adminOnly: true },
  { id: 'wallet', label: 'Portefeuille', icon: Wallet, group: 'finances' },
  { id: 'credits-surveillance', label: 'Surveillance', icon: Activity, group: 'finances', adminOnly: true, permissionKey: 'can_manage_credits' },
  { id: 'credit-purchases', label: 'Achats', icon: ShoppingCart, group: 'finances', permissionKey: 'can_manage_credits' },
  { id: 'rates', label: 'Tarifs', icon: Euro, group: 'finances', adminOnly: true },
  { id: 'withdrawals', label: 'Retraits', icon: ArrowUpRight, group: 'finances', adminOnly: true },
  { id: 'global', label: 'Gains', icon: PieChart, group: 'finances', adminOnly: true },
  { id: 'broadcast', label: 'Push', icon: Bell, group: 'communication', adminOnly: true, permissionKey: 'can_broadcast' },
  { id: 'popups', label: 'Pop-ups', icon: Bell, group: 'communication', adminOnly: true, permissionKey: 'can_manage_popups' },
  { id: 'faq', label: 'Aide', icon: HelpCircle, group: 'communication', adminOnly: true, permissionKey: 'can_manage_faq' },
  { id: 'flyers', label: 'Flyers', icon: FileImage, group: 'communication', adminOnly: true, permissionKey: 'can_manage_flyers' },
  { id: 'promo-images', label: 'Visuels', icon: Sparkles, group: 'communication', adminOnly: true, permissionKey: 'can_manage_promo' },
  { id: 'site-updates', label: 'Updates', icon: Rocket, group: 'communication', adminOnly: true, permissionKey: 'can_broadcast' },
  { id: 'promo', label: 'Promos', icon: Ticket, group: 'communication', adminOnly: true, permissionKey: 'can_manage_promo' },
  { id: 'ads', label: 'Annonces', icon: Megaphone, group: 'communication', permissionKey: 'can_manage_content' },
  { id: 'credit-costs', label: 'Crédits', icon: Coins, group: 'config', adminOnly: true, permissionKey: 'can_manage_credits' },
  { id: 'swipe-stats', label: 'Swipe', icon: Heart, group: 'config', adminOnly: true, permissionKey: 'can_view_stats' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, group: 'config', adminOnly: true },
  { id: 'feature-toggles', label: 'Toggles', icon: ToggleLeft, group: 'config', adminOnly: true },
  { id: 'error-logs', label: 'Erreurs', icon: Activity, group: 'logs', adminOnly: true, permissionKey: 'can_view_logs' },
  { id: 'security', label: 'Sécurité', icon: ShieldAlert, group: 'logs', adminOnly: true, permissionKey: 'can_view_logs' },
  { id: 'emails', label: 'E-mails', icon: Mail, group: 'logs', permissionKey: 'can_view_logs' },
];

const groupConfig: Record<NavGroup, { label: string }> = {
  tasks: { label: 'Tâches' },
  moderation: { label: 'Modération' },
  users: { label: 'Utilisateurs' },
  finances: { label: 'Finances' },
  communication: { label: 'Communication' },
  config: { label: 'Configuration' },
  logs: { label: 'Monitoring' },
};

const groupOrder: NavGroup[] = ['tasks', 'moderation', 'users', 'finances', 'communication', 'config', 'logs'];

const AdminSidebar = ({
  activeSection, onSectionChange, pendingReports = 0,
  pendingPurchases = 0, pendingVerifications = 0, isAdmin = false, modPermissions,
  bottomSlot,
}: AdminSidebarProps) => {
  const isTablet = useIsTablet();
  // Persistance de l'état collapsed dans localStorage
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('admin-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Collapse automatique en mode tablette pour préserver l'espace de contenu
  useEffect(() => {
    if (isTablet) setCollapsed(true);
  }, [isTablet]);

  // Sauvegarde de l'état collapsed
  useEffect(() => {
    try {
      localStorage.setItem('admin-sidebar-collapsed', String(collapsed));
    } catch {
      /* ignore quota errors */
    }
  }, [collapsed]);

  const visibleItems = navItems.filter((item) => {
    if (!item.adminOnly) return true;
    if (isAdmin) return true;
    if (item.permissionKey && modPermissions?.[item.permissionKey]) return true;
    return false;
  });

  const getBadge = (id: AdminSection) => {
    if (id === 'reports' && pendingReports > 0) return pendingReports;
    if (id === 'credit-purchases' && pendingPurchases > 0) return pendingPurchases;
    if (id === 'verification' && pendingVerifications > 0) return pendingVerifications;
    return undefined;
  };

  const groupedItems = visibleItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push({ ...item, badge: getBadge(item.id) });
    return acc;
  }, {} as Record<string, (NavItem & { badge?: number })[]>);

  const NavButton = ({ item, isActive }: { item: NavItem & { badge?: number }; isActive: boolean }) => {
    const Icon = item.icon;
    const content = (
      <button
        onClick={() => onSectionChange(item.id)}
        className={cn(
          'relative w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 group',
          collapsed ? 'justify-center p-2' : 'px-2.5 py-1.5',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
        )}
      >
        {/* Active indicator bar */}
        {isActive && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-primary" />
        )}
        <Icon
          className={cn(
            'w-4 h-4 flex-shrink-0 transition-colors',
            isActive ? 'text-primary' : 'text-muted-foreground/80 group-hover:text-foreground',
          )}
        />
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className={cn(
                  'flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1.5',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-destructive/15 text-destructive',
                )}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </>
        )}
        {collapsed && item.badge !== undefined && item.badge > 0 && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-destructive rounded-full" />
        )}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">
            {item.label}
            {item.badge ? ` · ${item.badge}` : ''}
          </TooltipContent>
        </Tooltip>
      );
    }
    return content;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'h-screen border-r flex flex-col transition-[width] duration-200 ease-out bg-card border-border/50',
          collapsed ? 'w-[60px]' : 'w-[232px]',
        )}
      >
        {/* Header — logo + collapse */}
        <div
          className={cn(
            'flex items-center h-14 border-b border-border/50 flex-shrink-0',
            collapsed ? 'justify-center px-1.5' : 'justify-between px-3',
          )}
        >
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-display font-semibold text-[13px] leading-tight truncate">
                    {isAdmin ? 'Admin' : 'Modération'}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight">Gay Social</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(true)}
                className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
                aria-label="Réduire"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Déployer"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-2.5 pt-2.5 pb-1.5 border-b border-border/50 flex-shrink-0">
            <AdminCommandBar onNavigate={onSectionChange} className="w-full" />
          </div>
        )}

        {/* Dashboard pinned */}
        <div className={cn('flex-shrink-0', collapsed ? 'p-1.5' : 'px-2.5 pt-2.5 pb-1')}>
          <NavButton
            item={{ id: 'dashboard', label: 'Tableau de bord', icon: Home, group: 'tasks' }}
            isActive={activeSection === 'dashboard'}
          />
        </div>

        {/* Navigation scrollable */}
        <ScrollArea className="flex-1">
          <nav className={cn('pb-3', collapsed ? 'px-1.5 pt-1' : 'px-2.5 pt-1')}>
            {groupOrder.map((group, groupIndex) => {
              const items = groupedItems[group];
              if (!items?.length) return null;
              return (
                <div key={group} className={groupIndex > 0 ? 'mt-3' : 'mt-2'}>
                  {!collapsed ? (
                    <div className="px-2.5 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                        {groupConfig[group]?.label}
                      </span>
                    </div>
                  ) : (
                    groupIndex > 0 && <div className="h-px bg-border/40 mx-2 my-2" />
                  )}
                  <div className="space-y-px">
                    {items.map((item) => (
                      <NavButton key={item.id} item={item} isActive={activeSection === item.id} />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Bottom slot — TaskQueuePopup */}
        {bottomSlot && !collapsed && (
          <div className="border-t border-border/50 px-2.5 py-2 max-h-[38vh] overflow-y-auto flex-shrink-0">
            {bottomSlot}
          </div>
        )}

        {/* Footer */}
        <div className={cn('border-t border-border/50 flex-shrink-0', collapsed ? 'p-1.5' : 'p-2.5')}>
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  onClick={() => window.location.assign('/home')}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Quitter</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 text-[12px] h-8 px-2.5 rounded-md"
              onClick={() => window.location.assign('/home')}
            >
              <LogOut className="w-3.5 h-3.5" />
              Quitter l'admin
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default AdminSidebar;
