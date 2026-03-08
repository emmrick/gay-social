import { 
  Shield, ShieldAlert, Wallet, Euro, ArrowUpRight, PieChart, BarChart3, Users, Filter, 
  MessageSquare, IdCard, Ticket, Ban, Coins, History, ChevronLeft, Menu, 
  Bell, Activity, Bot, ShoppingCart, Camera, Heart, UserCog, Wrench, 
  ListOrdered, HelpCircle, Star, Headphones, FileImage, LogOut
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
  | 'wallet' | 'withdrawals' | 'rates' | 'global' 
  | 'stats' | 'users' | 'reports' | 'moderation' | 'blocked' 
  | 'verification' | 'promo' | 'history' | 'credits'
  | 'credits-surveillance' | 'credit-purchases' | 'broadcast'
  | 'ai-moderation' | 'screenshot-sanctions' | 'moderators'
  | 'swipe-stats' | 'credit-costs' | 'maintenance' | 'pending-tasks'
  | 'support' | 'support-ratings' | 'popups' | 'faq' | 'flyers'
  | 'error-logs' | 'security';

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  pendingReports?: number;
  blockedCount?: number;
  pendingPurchases?: number;
  pendingVerifications?: number;
}

interface NavItem {
  id: AdminSection;
  label: string;
  icon: React.ElementType;
  group: 'finances' | 'users' | 'moderation' | 'help' | 'settings';
}

const navItems: NavItem[] = [
  // Finances
  { id: 'wallet', label: 'Portefeuille', icon: Wallet, group: 'finances' },
  { id: 'rates', label: 'Tarifs missions', icon: Euro, group: 'finances' },
  { id: 'withdrawals', label: 'Demandes de retrait', icon: ArrowUpRight, group: 'finances' },
  { id: 'global', label: 'Gains globaux', icon: PieChart, group: 'finances' },
  // Users
  { id: 'stats', label: 'Statistiques', icon: BarChart3, group: 'users' },
  { id: 'users', label: 'Utilisateurs', icon: Users, group: 'users' },
  { id: 'credits', label: 'Gestion crédits', icon: Coins, group: 'users' },
  { id: 'credits-surveillance', label: 'Surveillance crédits', icon: Activity, group: 'users' },
  { id: 'credit-purchases', label: 'Achats crédits', icon: ShoppingCart, group: 'users' },
  { id: 'blocked', label: 'Bloqués', icon: Ban, group: 'users' },
  // Moderation
  { id: 'pending-tasks', label: "File d'attente", icon: ListOrdered, group: 'moderation' },
  { id: 'reports', label: 'Signalements', icon: Filter, group: 'moderation' },
  { id: 'ai-moderation', label: 'Modération IA', icon: Bot, group: 'moderation' },
  { id: 'moderation', label: 'Contenu', icon: MessageSquare, group: 'moderation' },
  { id: 'verification', label: 'Vérification identité', icon: IdCard, group: 'moderation' },
  { id: 'screenshot-sanctions', label: 'Captures écran', icon: Camera, group: 'moderation' },
  { id: 'history', label: 'Historique actions', icon: History, group: 'moderation' },
  // Help
  { id: 'support', label: 'Support client', icon: Headphones, group: 'help' },
  { id: 'support-ratings', label: 'Avis support', icon: Star, group: 'help' },
  { id: 'faq', label: "Centre d'aide", icon: HelpCircle, group: 'help' },
  // Settings
  { id: 'moderators', label: 'Gestion modérateurs', icon: UserCog, group: 'settings' },
  { id: 'credit-costs', label: 'Tarifs crédits', icon: Coins, group: 'settings' },
  { id: 'promo', label: 'Codes promo', icon: Ticket, group: 'settings' },
  { id: 'broadcast', label: 'Notifications push', icon: Bell, group: 'settings' },
  { id: 'swipe-stats', label: 'Stats Swipe', icon: Heart, group: 'settings' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, group: 'settings' },
  { id: 'popups', label: 'Pop-ups', icon: Bell, group: 'settings' },
  { id: 'flyers', label: 'Flyers promo', icon: FileImage, group: 'settings' },
  { id: 'error-logs', label: "Logs d'erreurs", icon: Activity, group: 'settings' },
  { id: 'security', label: 'Événements sécurité', icon: ShieldAlert, group: 'settings' },
];

const groupConfig: Record<string, { label: string; color: string }> = {
  finances: { label: 'Finances', color: 'text-emerald-500' },
  users: { label: 'Utilisateurs', color: 'text-blue-500' },
  moderation: { label: 'Modération', color: 'text-amber-500' },
  help: { label: 'Aide & Support', color: 'text-violet-500' },
  settings: { label: 'Configuration', color: 'text-muted-foreground' },
};

const AdminSidebar = ({ 
  activeSection, 
  onSectionChange, 
  pendingReports = 0,
  blockedCount = 0,
  pendingPurchases = 0,
  pendingVerifications = 0 
}: AdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const getBadge = (id: AdminSection) => {
    if (id === 'reports' && pendingReports > 0) return pendingReports;
    if (id === 'blocked' && blockedCount > 0) return blockedCount;
    if (id === 'credit-purchases' && pendingPurchases > 0) return pendingPurchases;
    if (id === 'verification' && pendingVerifications > 0) return pendingVerifications;
    return undefined;
  };

  const groupedItems = navItems.reduce((acc, item) => {
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
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Tableau de bord</span>
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

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className={cn("py-3", collapsed ? "px-1" : "px-2")}>
            {Object.entries(groupedItems).map(([group, items], groupIndex) => (
              <div key={group} className={groupIndex > 0 ? "mt-5" : ""}>
                {!collapsed ? (
                  <div className="flex items-center gap-1.5 px-3 mb-1.5">
                    <span className={cn("text-[10px] font-bold uppercase tracking-[0.08em]", groupConfig[group]?.color || 'text-muted-foreground')}>
                      {groupConfig[group]?.label || group}
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
            ))}
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
