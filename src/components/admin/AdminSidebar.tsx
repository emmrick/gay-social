import { 
  Shield, Wallet, Euro, ArrowUpRight, PieChart, BarChart3, Users, Filter, 
  MessageSquare, IdCard, Ticket, Ban, Coins, History, ChevronLeft, Menu, 
  Bell, Activity, Bot, ShoppingCart, Camera, Heart, UserCog, Wrench, 
  ListOrdered, HelpCircle, Star, Headphones, FileImage
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';

export type AdminSection = 
  | 'wallet' | 'withdrawals' | 'rates' | 'global' 
  | 'stats' | 'users' | 'reports' | 'moderation' | 'blocked' 
  | 'verification' | 'promo' | 'history' | 'credits'
  | 'credits-surveillance' | 'credit-purchases' | 'broadcast'
  | 'ai-moderation' | 'screenshot-sanctions' | 'moderators'
  | 'swipe-stats' | 'credit-costs' | 'maintenance' | 'pending-tasks'
  | 'support' | 'support-ratings' | 'popups' | 'faq' | 'flyers'
  | 'error-logs';

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
  group: 'finances' | 'users' | 'moderation' | 'settings';
}

const navItems: NavItem[] = [
  { id: 'wallet', label: 'Portefeuille', icon: Wallet, group: 'finances' },
  { id: 'rates', label: 'Tarifs', icon: Euro, group: 'finances' },
  { id: 'withdrawals', label: 'Retraits', icon: ArrowUpRight, group: 'finances' },
  { id: 'global', label: 'Gains globaux', icon: PieChart, group: 'finances' },
  { id: 'stats', label: 'Statistiques', icon: BarChart3, group: 'users' },
  { id: 'users', label: 'Utilisateurs', icon: Users, group: 'users' },
  { id: 'credits', label: 'Crédits', icon: Coins, group: 'users' },
  { id: 'credits-surveillance', label: 'Surveillance', icon: Activity, group: 'users' },
  { id: 'credit-purchases', label: 'Achats crédits', icon: ShoppingCart, group: 'users' },
  { id: 'blocked', label: 'Bloqués', icon: Ban, group: 'users' },
  { id: 'pending-tasks', label: "File d'attente", icon: ListOrdered, group: 'moderation' },
  { id: 'reports', label: 'Signalements', icon: Filter, group: 'moderation' },
  { id: 'support', label: 'Support client', icon: Headphones, group: 'moderation' },
  { id: 'support-ratings', label: 'Mes avis support', icon: Star, group: 'moderation' },
  { id: 'ai-moderation', label: 'Modération IA', icon: Bot, group: 'moderation' },
  { id: 'moderation', label: 'Contenu', icon: MessageSquare, group: 'moderation' },
  { id: 'verification', label: 'Vérifications', icon: IdCard, group: 'moderation' },
  { id: 'screenshot-sanctions', label: 'Captures écran', icon: Camera, group: 'moderation' },
  { id: 'history', label: 'Historique', icon: History, group: 'moderation' },
  { id: 'moderators', label: 'Modérateurs', icon: UserCog, group: 'settings' },
  { id: 'credit-costs', label: 'Tarifs crédits', icon: Coins, group: 'settings' },
  { id: 'promo', label: 'Codes promo', icon: Ticket, group: 'settings' },
  { id: 'broadcast', label: 'Notifications', icon: Bell, group: 'settings' },
  { id: 'swipe-stats', label: 'Stats Swipe', icon: Heart, group: 'settings' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, group: 'settings' },
  { id: 'popups', label: 'Pop-ups', icon: Bell, group: 'settings' },
  { id: 'faq', label: "Centre d'aide", icon: HelpCircle, group: 'settings' },
  { id: 'flyers', label: 'Flyers', icon: FileImage, group: 'settings' },
  { id: 'error-logs', label: "Logs d'erreurs", icon: Activity, group: 'settings' },
];

const groupLabels: Record<string, string> = {
  finances: 'Finances',
  users: 'Utilisateurs',
  moderation: 'Modération',
  settings: 'Paramètres',
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

  return (
    <div 
      className={cn(
        "h-screen border-r flex flex-col transition-all duration-300 bg-card border-border",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center border-b border-border h-14 px-3", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">Administration</span>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className={cn("space-y-4", collapsed ? "px-1.5" : "px-2")}>
          {Object.entries(groupedItems).map(([group, items], groupIndex) => (
            <div key={group}>
              {groupIndex > 0 && <Separator className="mb-3" />}
              {!collapsed && (
                <p className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">
                  {groupLabels[group]}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        "relative w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                        collapsed ? "justify-center p-2" : "px-2.5 py-2",
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-destructive rounded-full" />
                      )}
                      {isActive && !collapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-border">
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground text-xs"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Retour à l'app
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminSidebar;
