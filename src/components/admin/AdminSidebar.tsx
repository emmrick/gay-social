import { 
  Shield, 
  Wallet, 
  Euro, 
  ArrowUpRight, 
  PieChart, 
  BarChart3, 
  Users, 
  Filter, 
  MessageSquare, 
  IdCard, 
  Ticket, 
  Ban, 
  Coins,
  History,
  ChevronLeft,
  Menu,
  Bell,
  Activity,
  Bot,
  ShoppingCart,
  Camera,
  Heart,
  UserCog,
  Wrench,
  ListOrdered
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export type AdminSection = 
  | 'wallet' 
  | 'withdrawals' 
  | 'rates' 
  | 'global' 
  | 'stats' 
  | 'users' 
  | 'reports' 
  | 'moderation' 
  | 'blocked' 
  | 'verification' 
  | 'promo' 
  | 'history' 
  | 'credits'
  | 'credits-surveillance'
  | 'credit-purchases'
  | 'broadcast'
  | 'ai-moderation'
  | 'screenshot-sanctions'
  | 'moderators'
  | 'swipe-stats'
  | 'credit-costs'
  | 'maintenance'
  | 'pending-tasks';

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
  badge?: number;
  group: 'finances' | 'users' | 'moderation' | 'settings';
}

const navItems: NavItem[] = [
  // Finances
  { id: 'wallet', label: 'Portefeuille', icon: Wallet, group: 'finances' },
  { id: 'rates', label: 'Tarifs', icon: Euro, group: 'finances' },
  { id: 'withdrawals', label: 'Retraits', icon: ArrowUpRight, group: 'finances' },
  { id: 'global', label: 'Gains globaux', icon: PieChart, group: 'finances' },
  
  // Utilisateurs
  { id: 'stats', label: 'Statistiques', icon: BarChart3, group: 'users' },
  { id: 'users', label: 'Utilisateurs', icon: Users, group: 'users' },
  { id: 'credits', label: 'Crédits', icon: Coins, group: 'users' },
  { id: 'credits-surveillance', label: 'Surveillance', icon: Activity, group: 'users' },
  { id: 'credit-purchases', label: 'Achats', icon: ShoppingCart, group: 'users' },
  { id: 'blocked', label: 'Bloqués', icon: Ban, group: 'users' },
  
  // Modération
  { id: 'reports', label: 'Signalements', icon: Filter, group: 'moderation' },
  { id: 'ai-moderation', label: 'Modération IA', icon: Bot, group: 'moderation' },
  { id: 'moderation', label: 'Contenu', icon: MessageSquare, group: 'moderation' },
  { id: 'verification', label: 'Vérifications', icon: IdCard, group: 'moderation' },
  { id: 'screenshot-sanctions', label: 'Captures écran', icon: Camera, group: 'moderation' },
  { id: 'history', label: 'Historique', icon: History, group: 'moderation' },
  { id: 'pending-tasks', label: 'File d\'attente', icon: ListOrdered, group: 'moderation' },
  
  // Paramètres
  { id: 'moderators', label: 'Modérateurs', icon: UserCog, group: 'settings' },
  { id: 'credit-costs', label: 'Tarifs crédits', icon: Coins, group: 'settings' },
  { id: 'promo', label: 'Codes promo', icon: Ticket, group: 'settings' },
  { id: 'broadcast', label: 'Notifications', icon: Bell, group: 'settings' },
  { id: 'swipe-stats', label: 'Stats Swipe', icon: Heart, group: 'settings' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, group: 'settings' },
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
        "h-full border-r flex flex-col transition-all duration-300",
        "bg-card dark:bg-card border-border",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-lg">Admin</span>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("flex-shrink-0", collapsed && "mx-auto")}
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-4">
          {Object.entries(groupedItems).map(([group, items]) => (
            <div key={group}>
              {!collapsed && (
                <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {groupLabels[group]}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                        "hover:bg-muted",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-md" 
                          : "text-foreground/70 hover:text-foreground",
                        collapsed && "justify-center px-2"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary-foreground")} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <Badge 
                              variant={isActive ? "secondary" : "destructive"} 
                              className="text-xs px-1.5 py-0.5 min-w-[20px] text-center"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                      {collapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
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
        <div className="p-4 border-t border-border">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminSidebar;
