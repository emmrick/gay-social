import { useState, useCallback, memo } from 'react';
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
  ChevronDown,
  Bell,
  Activity,
  Bot,
  ShoppingCart,
  Camera,
  Heart,
  UserCog,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
  
  // Paramètres
  { id: 'moderators', label: 'Modérateurs', icon: UserCog, group: 'settings' },
  { id: 'credit-costs', label: 'Tarifs crédits', icon: Coins, group: 'settings' },
  { id: 'promo', label: 'Codes promo', icon: Ticket, group: 'settings' },
  { id: 'broadcast', label: 'Notifications', icon: Bell, group: 'settings' },
  { id: 'swipe-stats', label: 'Stats Swipe', icon: Heart, group: 'settings' },
];

const groupLabels: Record<string, string> = {
  finances: 'Finances',
  users: 'Utilisateurs',
  moderation: 'Modération',
  settings: 'Paramètres',
};

const groupIcons: Record<string, React.ElementType> = {
  finances: Wallet,
  users: Users,
  moderation: Shield,
  settings: Ticket,
};

// Memoized nav item component for better performance
const NavItemButton = memo(({ 
  item, 
  isActive, 
  badge, 
  onSelect 
}: { 
  item: NavItem; 
  isActive: boolean; 
  badge?: number;
  onSelect: () => void;
}) => {
  const Icon = item.icon;
  
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center gap-2 p-4 rounded-xl text-sm font-medium",
        "border active:scale-95 transition-transform duration-150",
        isActive 
          ? "bg-primary text-primary-foreground border-primary shadow-lg" 
          : "bg-card border-border active:bg-muted"
      )}
    >
      <Icon className={cn("w-6 h-6", isActive && "text-primary-foreground")} />
      <span className="text-center text-xs leading-tight">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge 
          variant={isActive ? "secondary" : "destructive"} 
          className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5 min-w-[20px] text-center"
        >
          {badge}
        </Badge>
      )}
    </button>
  );
});

NavItemButton.displayName = 'NavItemButton';

const AdminMobileNav = ({ 
  activeSection, 
  onSectionChange, 
  pendingReports = 0,
  blockedCount = 0,
  pendingPurchases = 0,
  pendingVerifications = 0 
}: AdminMobileNavProps) => {
  const [sheetOpen, setSheetOpen] = useState(false);

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
  const ActiveIcon = activeItem?.icon || Shield;

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const handleSelect = useCallback((section: AdminSection) => {
    // Close sheet first for snappier feel
    setSheetOpen(false);
    // Then update section after a micro-delay
    requestAnimationFrame(() => {
      onSectionChange(section);
    });
  }, [onSectionChange]);

  const totalBadges = pendingReports + pendingPurchases + pendingVerifications;

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 safe-area-top">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => window.history.back()}
          className="gap-1 text-muted-foreground active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </Button>
        
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-display font-bold">Admin</span>
        </div>

        <div className="w-16" />
      </div>

      {/* Section Selector */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <button className="w-full px-4 py-3 flex items-center justify-between bg-muted/50 border-t border-border active:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <ActiveIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{activeItem?.label || 'Menu'}</p>
                <p className="text-xs text-muted-foreground">
                  {groupLabels[activeItem?.group || 'finances']}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalBadges > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {totalBadges}
                </Badge>
              )}
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </div>
          </button>
        </SheetTrigger>

        <SheetContent 
          side="bottom" 
          className="h-[80vh] rounded-t-3xl"
        >
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Navigation Admin
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(80vh-100px)] mt-4">
            <div className="space-y-6 pb-safe-area-bottom pb-8">
              {Object.entries(groupedItems).map(([group, items]) => {
                const GroupIcon = groupIcons[group];
                return (
                  <div key={group}>
                    <div className="flex items-center gap-2 px-2 mb-3">
                      <GroupIcon className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {groupLabels[group]}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {items.map((item) => (
                        <NavItemButton
                          key={item.id}
                          item={item}
                          isActive={activeSection === item.id}
                          badge={getBadge(item.id)}
                          onSelect={() => handleSelect(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default memo(AdminMobileNav);