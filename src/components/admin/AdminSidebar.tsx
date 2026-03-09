import { 
  Shield, ShieldAlert, Wallet, Euro, ArrowUpRight, PieChart, BarChart3, Users, Filter, 
  MessageSquare, IdCard, Ticket, Ban, Coins, History, ChevronLeft, Menu, Home,
  Bell, Activity, Bot, ShoppingCart, Camera, Heart, UserCog, Wrench, 
  ListOrdered, HelpCircle, Star, Headphones, FileImage, LogOut, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type AdminSection = 
  | 'dashboard'
  | 'wallet' | 'withdrawals' | 'rates' | 'global' 
  | 'stats' | 'users' | 'reports' | 'moderation' | 'blocked' 
  | 'verification' | 'promo' | 'history' | 'credits'
  | 'credits-surveillance' | 'credit-purchases' | 'broadcast'
  | 'ai-moderation' | 'screenshot-sanctions' | 'moderators'
  | 'swipe-stats' | 'credit-costs' | 'maintenance' | 'pending-tasks'
  | 'support' | 'support-ratings' | 'popups' | 'faq' | 'flyers'
  | 'promo-images' | 'error-logs' | 'security' | 'client-dossier';

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  pendingReports?: number;
  blockedCount?: number;
  pendingPurchases?: number;
  pendingVerifications?: number;
  isAdmin?: boolean;
}

type NavGroup = 'tasks' | 'moderation' | 'users' | 'finances' | 'communication' | 'config' | 'logs';

interface NavItem {
  id: AdminSection;
  label: string;
  icon: React.ElementType;
  group: NavGroup;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  // Tâches quotidiennes (visible par tous)
  { id: 'pending-tasks', label: "File d'attente", icon: ListOrdered, group: 'tasks' },
  { id: 'support', label: 'Support client', icon: Headphones, group: 'tasks' },
  { id: 'client-dossier', label: 'Dossier client', icon: IdCard, group: 'tasks' },
  { id: 'support-ratings', label: 'Avis support', icon: Star, group: 'tasks' },

  // Modération
  { id: 'reports', label: 'Signalements', icon: Filter, group: 'moderation' },
  { id: 'verification', label: 'Vérification identité', icon: IdCard, group: 'moderation' },
  { id: 'moderation', label: 'Contenu', icon: MessageSquare, group: 'moderation' },
  { id: 'ai-moderation', label: 'Modération IA', icon: Bot, group: 'moderation' },
  { id: 'screenshot-sanctions', label: 'Captures écran', icon: Camera, group: 'moderation' },
  { id: 'history', label: 'Historique', icon: History, group: 'moderation' },

  // Utilisateurs (admin only)
  { id: 'users', label: 'Utilisateurs', icon: Users, group: 'users', adminOnly: true },
  { id: 'blocked', label: 'Bloqués', icon: Ban, group: 'users', adminOnly: true },
  { id: 'stats', label: 'Statistiques', icon: BarChart3, group: 'users', adminOnly: true },
  { id: 'moderators', label: 'Modérateurs', icon: UserCog, group: 'users', adminOnly: true },

  // Finances
  { id: 'wallet', label: 'Portefeuille', icon: Wallet, group: 'finances' },
  { id: 'credits', label: 'Gestion crédits', icon: Coins, group: 'finances', adminOnly: true },
  { id: 'credits-surveillance', label: 'Surveillance', icon: Activity, group: 'finances', adminOnly: true },
  { id: 'credit-purchases', label: 'Achats crédits', icon: ShoppingCart, group: 'finances' },
  { id: 'rates', label: 'Tarifs missions', icon: Euro, group: 'finances', adminOnly: true },
  { id: 'withdrawals', label: 'Retraits', icon: ArrowUpRight, group: 'finances', adminOnly: true },
  { id: 'global', label: 'Gains globaux', icon: PieChart, group: 'finances', adminOnly: true },

  // Communication (admin only)
  { id: 'broadcast', label: 'Notifications push', icon: Bell, group: 'communication', adminOnly: true },
  { id: 'popups', label: 'Pop-ups promo', icon: Bell, group: 'communication', adminOnly: true },
  { id: 'faq', label: "Centre d'aide", icon: HelpCircle, group: 'communication', adminOnly: true },
  { id: 'flyers', label: 'Flyers promo', icon: FileImage, group: 'communication', adminOnly: true },
  { id: 'promo-images', label: 'Visuels promo IA', icon: Sparkles, group: 'communication', adminOnly: true },
  { id: 'promo', label: 'Codes promo', icon: Ticket, group: 'communication', adminOnly: true },

  // Config & Logs (admin only)
  { id: 'credit-costs', label: 'Tarifs crédits', icon: Coins, group: 'config', adminOnly: true },
  { id: 'swipe-stats', label: 'Stats Swipe', icon: Heart, group: 'config', adminOnly: true },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, group: 'config', adminOnly: true },
  { id: 'error-logs', label: "Logs d'erreurs", icon: Activity, group: 'logs', adminOnly: true },
  { id: 'security', label: 'Sécurité', icon: ShieldAlert, group: 'logs', adminOnly: true },
];

const groupConfig: Record<NavGroup, { label: string; color: string }> = {
  tasks: { label: 'Mes tâches', color: 'text-orange-500' },
  moderation: { label: 'Modération', color: 'text-amber-500' },
  users: { label: 'Utilisateurs', color: 'text-blue-500' },
  finances: { label: 'Finances', color: 'text-emerald-500' },
  communication: { label: 'Communication', color: 'text-violet-500' },
  config: { label: 'Configuration', color: 'text-muted-foreground' },
  logs: { label: 'Monitoring', color: 'text-red-400' },
};

const groupOrder: NavGroup[] = ['tasks', 'moderation', 'users', 'finances', 'communication', 'config', 'logs'];

const AdminSidebar = ({ 
  activeSection, 
  onSectionChange, 
  pendingReports = 0,
  blockedCount = 0,
  pendingPurchases = 0,
  pendingVerifications = 0,
  isAdmin = false,
}: AdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const getBadge = (id: AdminSection) => {
    if (id === 'reports' && pendingReports > 0) return pendingReports;
    if (id === 'blocked' && blockedCount > 0) return blockedCount;
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
          "relative w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group",
          collapsed ? "justify-center p-2.5" : "px-3 py-[7px]",
          isActive 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}
      >
        <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary-foreground" : "group-hover:text-foreground")} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className={cn(
                "flex items-center justify-center min-w-[20px] h-5 rounded-full text-[10px] font-bold px-1.5",
                isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive text-destructive-foreground"
              )}>
                {item.badge}
              </span>
            )}
          </>
        )}
        {collapsed && item.badge !== undefined && item.badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full ring-2 ring-card" />
        )}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">
            {item.label}
            {item.badge ? ` (${item.badge})` : ''}
          </TooltipContent>
        </Tooltip>
      );
    }
    return content;
  };

  return (
    <TooltipProvider>
      <div 
        className={cn(
          "h-screen border-r flex flex-col transition-all duration-200 bg-card/50 border-border/50",
          collapsed ? "w-[56px]" : "w-[250px]"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center h-14 px-3 border-b border-border/50",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none">Admin</span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  {isAdmin ? 'Administrateur' : 'Modérateur'}
                </span>
              </div>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Dashboard Home Button */}
        <div className={cn("border-b border-border/50", collapsed ? "p-1.5" : "p-2")}>
          <NavButton
            item={{ id: 'dashboard', label: 'Tableau de bord', icon: Home, group: 'tasks' }}
            isActive={activeSection === 'dashboard'}
          />
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className={cn("py-3", collapsed ? "px-1" : "px-2")}>
            {groupOrder.map((group, groupIndex) => {
              const items = groupedItems[group];
              if (!items?.length) return null;
              return (
                <div key={group} className={groupIndex > 0 ? "mt-4" : ""}>
                  {!collapsed ? (
                    <div className="flex items-center gap-1.5 px-3 mb-1.5">
                      <span className={cn("text-[10px] font-bold uppercase tracking-[0.08em]", groupConfig[group]?.color)}>
                        {groupConfig[group]?.label}
                      </span>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>
                  ) : (
                    groupIndex > 0 && <div className="h-px bg-border/50 mx-1.5 my-2" />
                  )}
                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <NavButton key={item.id} item={item} isActive={activeSection === item.id} />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className={cn("border-t border-border/50", collapsed ? "p-1.5" : "p-2")}>
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="w-full h-9 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => window.history.back()}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Retour à l'app</TooltipContent>
            </Tooltip>
          ) : (
            <Button 
              variant="ghost" 
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground text-xs h-9"
              onClick={() => window.history.back()}
            >
              <LogOut className="w-3.5 h-3.5" />
              Retour à l'app
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AdminSidebar;
