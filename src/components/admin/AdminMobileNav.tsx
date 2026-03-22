import { memo, useCallback } from 'react';
import { 
  Shield, ShieldAlert, Wallet, Euro, ArrowUpRight, PieChart, BarChart3, Users, Filter, 
  MessageSquare, IdCard, Ticket, Coins, Bell,
  Activity, Bot, ShoppingCart, Camera, Heart, UserCog, Wrench, ListOrdered, 
  Headphones, Star, HelpCircle, ArrowLeft, FileImage, Megaphone, Sparkles, ToggleLeft, Rocket,
  ChevronLeft, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdminSection, ModPermissions } from './AdminSidebar';

interface AdminMobileNavProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection | string) => void;
  pendingReports?: number;
  blockedCount?: number;
  pendingPurchases?: number;
  pendingVerifications?: number;
  isAdmin?: boolean;
  modPermissions?: ModPermissions | null;
  dashboardTopSlot?: React.ReactNode;
}

type NavGroup = 'tasks' | 'moderation' | 'users' | 'finances' | 'communication' | 'config' | 'logs';

interface NavItem {
  id: AdminSection;
  label: string;
  shortLabel?: string;
  icon: React.ElementType;
  group: NavGroup;
  adminOnly?: boolean;
  permissionKey?: keyof ModPermissions;
}

const navItems: NavItem[] = [
  { id: 'pending-tasks', label: 'Missions', icon: ListOrdered, group: 'tasks' },
  { id: 'support', label: 'Support', icon: Headphones, group: 'tasks' },
  { id: 'support-ratings', label: 'Avis', icon: Star, group: 'tasks' },
  { id: 'verification', label: 'Identité', icon: IdCard, group: 'moderation', adminOnly: true, permissionKey: 'can_verify_identity' },
  { id: 'reports', label: 'Signalements', icon: Filter, group: 'moderation', permissionKey: 'can_manage_reports' },
  { id: 'moderation', label: 'Contenu', icon: MessageSquare, group: 'moderation', permissionKey: 'can_manage_content' },
  { id: 'ai-moderation', label: 'IA', icon: Bot, group: 'moderation', permissionKey: 'can_ai_moderation' },
  { id: 'screenshot-sanctions', label: 'Captures', icon: Camera, group: 'moderation', permissionKey: 'can_screenshot_sanctions' },
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
  { id: 'popups', label: 'Pop-ups', icon: Bell, group: 'communication', adminOnly: true },
  { id: 'faq', label: 'Aide', icon: HelpCircle, group: 'communication', adminOnly: true },
  { id: 'flyers', label: 'Flyers', icon: FileImage, group: 'communication', adminOnly: true },
  { id: 'promo', label: 'Promos', icon: Ticket, group: 'communication', adminOnly: true, permissionKey: 'can_manage_promo' },
  { id: 'ads' as AdminSection, label: 'Annonces', icon: Megaphone, group: 'communication', permissionKey: 'can_manage_content' },
  { id: 'promo-images' as AdminSection, label: 'Visuels', icon: Sparkles, group: 'communication', adminOnly: true },
  { id: 'site-updates' as AdminSection, label: 'Updates', icon: Rocket, group: 'communication', adminOnly: true },
  { id: 'credit-costs', label: 'Crédits', icon: Coins, group: 'config', adminOnly: true },
  { id: 'swipe-stats', label: 'Swipe', icon: Heart, group: 'config', adminOnly: true },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, group: 'config', adminOnly: true },
  { id: 'feature-toggles' as AdminSection, label: 'Toggles', icon: ToggleLeft, group: 'config', adminOnly: true },
  { id: 'error-logs', label: 'Erreurs', icon: Activity, group: 'logs', adminOnly: true },
  { id: 'security', label: 'Sécurité', icon: ShieldAlert, group: 'logs', adminOnly: true },
];

const groupConfig: Record<NavGroup, { label: string; emoji: string }> = {
  tasks: { label: 'Tâches', emoji: '⚡' },
  moderation: { label: 'Modération', emoji: '🛡️' },
  users: { label: 'Utilisateurs', emoji: '👥' },
  finances: { label: 'Finances', emoji: '💰' },
  communication: { label: 'Communication', emoji: '📢' },
  config: { label: 'Configuration', emoji: '⚙️' },
  logs: { label: 'Monitoring', emoji: '📊' },
};

const groupOrder: NavGroup[] = ['tasks', 'moderation', 'users', 'finances', 'communication', 'config', 'logs'];

const AdminMobileNav = ({ 
  activeSection, 
  onSectionChange, 
  pendingReports = 0,
  blockedCount = 0,
  pendingPurchases = 0,
  pendingVerifications = 0,
  isAdmin = false,
  modPermissions,
  dashboardTopSlot,
}: AdminMobileNavProps) => {

  const visibleItems = navItems.filter(item => {
    if (!item.adminOnly) return true;
    if (isAdmin) return true;
    if (item.permissionKey && modPermissions?.[item.permissionKey]) return true;
    return false;
  });

  const getBadge = useCallback((id: AdminSection) => {
    switch (id) {
      case 'reports': return pendingReports > 0 ? pendingReports : undefined;
      case 'credit-purchases': return pendingPurchases > 0 ? pendingPurchases : undefined;
      default: return undefined;
    }
  }, [pendingReports, pendingPurchases]);

  const activeItem = visibleItems.find(item => item.id === activeSection);

  const groupedItems = visibleItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  // Section header when navigating into a section
  if (activeSection !== 'dashboard' && activeItem) {
    const ActiveIcon = activeItem.icon;
    return (
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 px-3 py-2.5" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onSectionChange('dashboard')}
            className="h-8 w-8 rounded-lg shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ActiveIcon className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm truncate">{activeItem.label}</span>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard home grid
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-2.5" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.history.back()}
            className="gap-1 text-muted-foreground -ml-2 h-8"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs">Retour</span>
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm">
              {isAdmin ? 'Admin' : 'Modération'}
            </span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      {/* Dashboard Grid */}
      <ScrollArea className="h-[calc(100dvh-52px)]">
        <div className="px-3 py-3 space-y-3 pb-8">
          {dashboardTopSlot}
          {groupOrder.map((group) => {
            const items = groupedItems[group];
            if (!items?.length) return null;
            const config = groupConfig[group];
            return (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-xs">{config.emoji}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {config.label}
                  </span>
                  <div className="flex-1 h-px bg-border/30" />
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const badge = getBadge(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSectionChange(item.id)}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 p-3 rounded-xl",
                          "bg-card border border-border/30",
                          "active:scale-[0.97] transition-all duration-100",
                          "hover:border-border/50 hover:shadow-sm"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight line-clamp-1">
                          {item.shortLabel || item.label}
                        </span>
                        {badge !== undefined && badge > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 text-[9px] px-1 py-0 min-w-[16px] h-4 text-center"
                          >
                            {badge}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default memo(AdminMobileNav);
