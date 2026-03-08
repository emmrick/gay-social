import { memo, useCallback } from 'react';
import { 
  Shield, ShieldAlert, Wallet, Euro, ArrowUpRight, PieChart, BarChart3, Users, Filter, 
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
  shortLabel?: string;
  icon: React.ElementType;
  group: 'finances' | 'users' | 'moderation' | 'help' | 'settings';
}

const navItems: NavItem[] = [
  { id: 'wallet', label: 'Portefeuille', icon: Wallet, group: 'finances' },
  { id: 'rates', label: 'Tarifs missions', shortLabel: 'Tarifs', icon: Euro, group: 'finances' },
  { id: 'withdrawals', label: 'Retraits', icon: ArrowUpRight, group: 'finances' },
  { id: 'global', label: 'Gains globaux', shortLabel: 'Gains', icon: PieChart, group: 'finances' },
  { id: 'stats', label: 'Statistiques', shortLabel: 'Stats', icon: BarChart3, group: 'users' },
  { id: 'users', label: 'Utilisateurs', icon: Users, group: 'users' },
  { id: 'credits', label: 'Crédits', icon: Coins, group: 'users' },
  { id: 'credits-surveillance', label: 'Surveillance', icon: Activity, group: 'users' },
  { id: 'credit-purchases', label: 'Achats crédits', shortLabel: 'Achats', icon: ShoppingCart, group: 'users' },
  { id: 'blocked', label: 'Bloqués', icon: Ban, group: 'users' },
  { id: 'pending-tasks', label: 'File missions', shortLabel: 'Missions', icon: ListOrdered, group: 'moderation' },
  { id: 'reports', label: 'Signalements', icon: Filter, group: 'moderation' },
  { id: 'ai-moderation', label: 'Modération IA', shortLabel: 'IA Modé.', icon: Bot, group: 'moderation' },
  { id: 'moderation', label: 'Contenu', icon: MessageSquare, group: 'moderation' },
  { id: 'verification', label: 'Vérifications', shortLabel: 'Vérif.', icon: IdCard, group: 'moderation' },
  { id: 'screenshot-sanctions', label: 'Captures écran', shortLabel: 'Captures', icon: Camera, group: 'moderation' },
  { id: 'history', label: 'Historique', icon: History, group: 'moderation' },
  { id: 'support', label: 'Support client', shortLabel: 'Support', icon: Headphones, group: 'help' },
  { id: 'support-ratings', label: 'Avis support', shortLabel: 'Avis', icon: Star, group: 'help' },
  { id: 'faq', label: "Centre d'aide", shortLabel: 'Aide', icon: HelpCircle, group: 'help' },
  { id: 'moderators', label: 'Modérateurs', shortLabel: 'Modéra.', icon: UserCog, group: 'settings' },
  { id: 'credit-costs', label: 'Tarifs crédits', shortLabel: 'Tarifs', icon: Coins, group: 'settings' },
  { id: 'promo', label: 'Codes promo', shortLabel: 'Promo', icon: Ticket, group: 'settings' },
  { id: 'broadcast', label: 'Notifications', shortLabel: 'Notifs', icon: Bell, group: 'settings' },
  { id: 'swipe-stats', label: 'Stats Swipe', shortLabel: 'Swipe', icon: Heart, group: 'settings' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, group: 'settings' },
  { id: 'popups', label: 'Pop-ups', icon: Bell, group: 'settings' },
  { id: 'faq', label: "Centre d'aide", shortLabel: 'Aide', icon: HelpCircle, group: 'settings' },
  { id: 'flyers', label: 'Flyers', icon: FileImage, group: 'settings' },
  { id: 'error-logs', label: "Logs erreurs", shortLabel: 'Logs', icon: Activity, group: 'settings' },
  { id: 'security', label: 'Sécurité', icon: ShieldAlert, group: 'settings' },
];

// Deduplicate by id (faq appears twice above, keep first)
const uniqueNavItems = navItems.filter((item, index, self) => 
  index === self.findIndex(t => t.id === item.id)
);

const groupConfig: Record<string, { label: string; emoji: string; accent: string; bg: string }> = {
  finances: { label: 'Finances', emoji: '💰', accent: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
  users: { label: 'Utilisateurs', emoji: '👥', accent: 'border-blue-500/30', bg: 'bg-blue-500/5' },
  moderation: { label: 'Modération', emoji: '🛡️', accent: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  help: { label: 'Aide & Support', emoji: '🎧', accent: 'border-violet-500/30', bg: 'bg-violet-500/5' },
  settings: { label: 'Configuration', emoji: '⚙️', accent: 'border-muted-foreground/20', bg: 'bg-muted/30' },
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

  const activeItem = uniqueNavItems.find(item => item.id === activeSection);

  const groupedItems = uniqueNavItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  // Section header when navigating into a section
  if (activeSection !== '__home__' as any && activeItem) {
    const ActiveIcon = activeItem.icon;
    return (
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-3 py-2.5" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onSectionChange('__home__' as any)}
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
              <span className="font-bold text-sm leading-none">Admin</span>
              <span className="text-[9px] text-muted-foreground leading-none mt-0.5">Tableau de bord</span>
            </div>
          </div>
          <div className="w-16" />
        </div>
      </div>

      {/* Dashboard Grid */}
      <ScrollArea className="h-[calc(100dvh-56px)]">
        <div className="px-3 py-4 space-y-4 pb-8">
          {Object.entries(groupedItems).map(([group, items]) => {
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
