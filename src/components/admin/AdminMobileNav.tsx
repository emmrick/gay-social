import { memo, useCallback } from 'react';
import { 
  Shield, Wallet, Euro, ArrowUpRight, PieChart, BarChart3, Users, Filter, 
  MessageSquare, IdCard, Ticket, Ban, Coins, History, ChevronLeft, Bell, 
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
  { id: 'credit-purchases', label: 'Achats', icon: ShoppingCart, group: 'users' },
  { id: 'blocked', label: 'Bloqués', icon: Ban, group: 'users' },
  { id: 'pending-tasks', label: 'File missions', icon: ListOrdered, group: 'moderation' },
  { id: 'reports', label: 'Signalements', icon: Filter, group: 'moderation' },
  { id: 'support', label: 'Support', icon: Headphones, group: 'moderation' },
  { id: 'support-ratings', label: 'Mes avis', icon: Star, group: 'moderation' },
  { id: 'ai-moderation', label: 'Modération IA', icon: Bot, group: 'moderation' },
  { id: 'moderation', label: 'Contenu', icon: MessageSquare, group: 'moderation' },
  { id: 'verification', label: 'Vérifications', icon: IdCard, group: 'moderation' },
  { id: 'screenshot-sanctions', label: 'Captures', icon: Camera, group: 'moderation' },
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
  { id: 'error-logs', label: "Logs erreurs", icon: Activity, group: 'settings' },
];

const groupLabels: Record<string, string> = {
  finances: '💰 Finances',
  users: '👥 Utilisateurs',
  moderation: '🛡️ Modération',
  settings: '⚙️ Paramètres',
};

const groupColors: Record<string, string> = {
  finances: 'from-emerald-500/10 to-emerald-500/5',
  users: 'from-blue-500/10 to-blue-500/5',
  moderation: 'from-amber-500/10 to-amber-500/5',
  settings: 'from-violet-500/10 to-violet-500/5',
};

const AdminMobileNav = ({ 
  activeSection, 
  onSectionChange, 
  pendingReports = 0,
  blockedCount = 0,
  pendingPurchases = 0,
  pendingVerifications = 0 
}: AdminMobileNavProps) => {

  const getBadge = useCallback((id: AdminSection) => {
    switch (id) {
      case 'reports': return pendingReports > 0 ? pendingReports : undefined;
      case 'blocked': return blockedCount > 0 ? blockedCount : undefined;
      case 'credit-purchases': return pendingPurchases > 0 ? pendingPurchases : undefined;
      case 'verification': return pendingVerifications > 0 ? pendingVerifications : undefined;
      default: return undefined;
    }
  }, [pendingReports, blockedCount, pendingPurchases, pendingVerifications]);

  const activeItem = navItems.find(item => item.id === activeSection);
  const isHome = !activeItem || activeSection === 'wallet';

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  // If a section is selected (not home), show a slim back header
  if (activeSection !== '__home__' as any && activeItem) {
    const ActiveIcon = activeItem.icon;
    return (
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onSectionChange('__home__' as any)}
            className="h-9 w-9 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
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
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-5 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.history.back()}
            className="gap-1.5 text-muted-foreground -ml-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base">Admin</span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      {/* Dashboard Grid */}
      <ScrollArea className="h-[calc(100dvh-60px)]">
        <div className="px-4 py-5 space-y-6 pb-safe-area-bottom pb-8">
          {Object.entries(groupedItems).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                {groupLabels[group]}
              </h3>
              <div className={cn("rounded-2xl p-3 bg-gradient-to-b", groupColors[group])}>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const badge = getBadge(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSectionChange(item.id)}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 p-3 rounded-xl",
                          "bg-card/80 backdrop-blur-sm border border-border/50",
                          "active:scale-95 transition-all duration-150",
                          "hover:shadow-md hover:border-primary/20"
                        )}
                      >
                        <div className="w-9 h-9 rounded-xl bg-muted/80 flex items-center justify-center">
                          <Icon className="w-4.5 h-4.5 text-foreground/70" />
                        </div>
                        <span className="text-[11px] font-medium text-foreground/80 text-center leading-tight line-clamp-2">
                          {item.label}
                        </span>
                        {badge !== undefined && badge > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] text-center"
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
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default memo(AdminMobileNav);
