import { memo, useCallback } from 'react';
import { 
  Shield, ShieldAlert, Wallet, Euro, ArrowUpRight, PieChart, BarChart3, Users, Filter, 
  MessageSquare, IdCard, Ticket, Ban, Coins, History, ChevronLeft, Bell, Home,
  Activity, Bot, ShoppingCart, Camera, Heart, UserCog, Wrench, ListOrdered, 
  Headphones, Star, HelpCircle, ArrowLeft, FileImage
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdminSection } from './AdminSidebar';

interface AdminMobileNavProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection | string) => void;
  pendingReports?: number;
  blockedCount?: number;
  pendingPurchases?: number;
  pendingVerifications?: number;
  isAdmin?: boolean;
  /** Slot rendered at top of dashboard scroll area (for TaskQueuePopup) */
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
}

const navItems: NavItem[] = [
  // Tâches
  { id: 'pending-tasks', label: 'File missions', shortLabel: 'Missions', icon: ListOrdered, group: 'tasks' },
  { id: 'support', label: 'Support', icon: Headphones, group: 'tasks' },
  { id: 'support-ratings', label: 'Avis', icon: Star, group: 'tasks' },
  // Modération
  { id: 'reports', label: 'Signalements', icon: Filter, group: 'moderation' },
  { id: 'moderation', label: 'Contenu', icon: MessageSquare, group: 'moderation' },
  { id: 'ai-moderation', label: 'IA Modération', shortLabel: 'IA', icon: Bot, group: 'moderation' },
  { id: 'screenshot-sanctions', label: 'Captures', icon: Camera, group: 'moderation' },
  // Utilisateurs
  { id: 'users', label: 'Utilisateurs', icon: Users, group: 'users', adminOnly: true },
  { id: 'stats', label: 'Stats', icon: BarChart3, group: 'users', adminOnly: true },
  { id: 'moderators', label: 'Modérateurs', shortLabel: 'Modéra.', icon: UserCog, group: 'users', adminOnly: true },
  // Finances
  { id: 'wallet', label: 'Portefeuille', icon: Wallet, group: 'finances' },
  { id: 'credits-surveillance', label: 'Surveillance', icon: Activity, group: 'finances', adminOnly: true },
  { id: 'credit-purchases', label: 'Achats', icon: ShoppingCart, group: 'finances' },
  { id: 'rates', label: 'Tarifs', icon: Euro, group: 'finances', adminOnly: true },
  { id: 'withdrawals', label: 'Retraits', icon: ArrowUpRight, group: 'finances', adminOnly: true },
  { id: 'global', label: 'Gains', icon: PieChart, group: 'finances', adminOnly: true },
  // Communication
  { id: 'broadcast', label: 'Notifications', shortLabel: 'Notifs', icon: Bell, group: 'communication', adminOnly: true },
  { id: 'popups', label: 'Pop-ups', icon: Bell, group: 'communication', adminOnly: true },
  { id: 'faq', label: "Aide", icon: HelpCircle, group: 'communication', adminOnly: true },
  { id: 'flyers', label: 'Flyers', icon: FileImage, group: 'communication', adminOnly: true },
  { id: 'promo', label: 'Promo', icon: Ticket, group: 'communication', adminOnly: true },
  { id: 'promo-images' as AdminSection, label: 'Visuels promo', shortLabel: 'Visuels', icon: FileImage, group: 'communication', adminOnly: true },
  // Config
  { id: 'credit-costs', label: 'Tarifs crédits', shortLabel: 'Tarifs', icon: Coins, group: 'config', adminOnly: true },
  { id: 'swipe-stats', label: 'Swipe', icon: Heart, group: 'config', adminOnly: true },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, group: 'config', adminOnly: true },
  // Logs
  { id: 'error-logs', label: 'Erreurs', icon: Activity, group: 'logs', adminOnly: true },
  { id: 'security', label: 'Sécurité', icon: ShieldAlert, group: 'logs', adminOnly: true },
];

const groupConfig: Record<NavGroup, { label: string; emoji: string; accent: string; bg: string }> = {
  tasks: { label: 'Mes tâches', emoji: '⚡', accent: 'border-orange-500/30', bg: 'bg-orange-500/5' },
  moderation: { label: 'Modération', emoji: '🛡️', accent: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  users: { label: 'Utilisateurs', emoji: '👥', accent: 'border-blue-500/30', bg: 'bg-blue-500/5' },
  finances: { label: 'Finances', emoji: '💰', accent: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
  communication: { label: 'Communication', emoji: '📢', accent: 'border-violet-500/30', bg: 'bg-violet-500/5' },
  config: { label: 'Configuration', emoji: '⚙️', accent: 'border-muted-foreground/20', bg: 'bg-muted/30' },
  logs: { label: 'Monitoring', emoji: '📊', accent: 'border-red-500/20', bg: 'bg-red-500/5' },
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
  dashboardTopSlot,
}: AdminMobileNavProps) => {

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

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
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-3 py-2.5" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onSectionChange('dashboard')}
            className="h-9 w-9 rounded-xl shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ActiveIcon className="w-4 h-4 text-primary" />
            </div>
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
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-2.5" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.history.back()}
            className="gap-1 text-muted-foreground -ml-2 h-9"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-none">
                {isAdmin ? 'Admin' : 'Modérateur'}
              </span>
              <span className="text-[9px] text-muted-foreground leading-none mt-0.5">Tableau de bord</span>
            </div>
          </div>
          <div className="w-16" />
        </div>
      </div>

      {/* Dashboard Grid */}
      <ScrollArea className="h-[calc(100dvh-56px)]">
        <div className="px-3 py-4 space-y-4 pb-8">
          {/* Task queue slot at top of dashboard */}
          {dashboardTopSlot}
          {groupOrder.map((group) => {
            const items = groupedItems[group];
            if (!items?.length) return null;
            const config = groupConfig[group];
            return (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-sm">{config.emoji}</span>
                  <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                    {config.label}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
                <div className={cn(
                  "rounded-2xl border p-2",
                  config.accent,
                  config.bg
                )}>
                  <div className="grid grid-cols-4 gap-1.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const badge = getBadge(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => onSectionChange(item.id)}
                          className={cn(
                            "relative flex flex-col items-center gap-1 p-2.5 rounded-xl",
                            "bg-card/90 backdrop-blur-sm",
                            "active:scale-[0.97] transition-all duration-100",
                            "hover:shadow-sm"
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-foreground/60" />
                          </div>
                          <span className="text-[10px] font-medium text-foreground/70 text-center leading-tight line-clamp-2">
                            {item.shortLabel || item.label}
                          </span>
                          {badge !== undefined && badge > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-0.5 -right-0.5 text-[9px] px-1 py-0 min-w-[16px] h-4 text-center"
                            >
                              {badge}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
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
