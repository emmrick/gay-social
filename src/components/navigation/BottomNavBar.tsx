import { memo, useMemo } from 'react';
import { MessageCircle, User, Home, Crown, Sparkles, HelpCircle, Rss } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@/hooks/useFeatureToggles';

interface BottomNavBarProps {
  activeTab: 'home' | 'swipe' | 'messages' | 'tween' | 'premium' | 'help' | 'profile';
  onTabChange: (tab: 'home' | 'swipe' | 'messages' | 'tween' | 'premium' | 'help' | 'profile') => void;
  unreadCount?: number;
  isPremium?: boolean;
}

const allTabs = [
  { id: 'home' as const, icon: Home, label: 'Accueil', premium: false, featureKey: null },
  { id: 'swipe' as const, icon: Sparkles, label: 'Swipe', premium: false, featureKey: 'swipe_page' },
  { id: 'messages' as const, icon: MessageCircle, label: 'Messages', premium: false, featureKey: null },
  { id: 'tween' as const, icon: Rss, label: 'Tween', premium: false, featureKey: null },
  { id: 'premium' as const, icon: Crown, label: 'Crédits', premium: true, featureKey: 'credits_page' },
  { id: 'profile' as const, icon: User, label: 'Profil', premium: false, featureKey: null },
] as const;

const BottomNavBar = memo(({ activeTab, onTabChange, unreadCount = 0, isPremium = false }: BottomNavBarProps) => {
  const featureFlags = useFeatureFlags();
  const messageBadge = unreadCount > 0 ? unreadCount : undefined;

  const tabs = useMemo(() => {
    return allTabs.filter(tab => {
      if (!tab.featureKey) return true;
      return featureFlags[tab.featureKey] !== false;
    });
  }, [featureFlags]);

  const handleTabClick = (tabId: typeof activeTab) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onTabChange(tabId);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none" />
      
      <nav className="relative pointer-events-auto px-3 pb-2" style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))', paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))' }}>
        <div className="mx-auto max-w-md bg-card/95 border border-border/50 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40">
          <div className="flex items-center justify-around h-[68px] px-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const badge = tab.id === 'messages' ? messageBadge : undefined;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 flex-1 h-full py-2 transition-colors duration-150 active:scale-95",
                    isActive
                      ? tab.premium ? "text-amber-500" : "text-primary"
                      : "text-muted-foreground active:text-foreground",
                    tab.premium && !isActive && "text-amber-500/50"
                  )}
                >
                  {/* Active background pill – pure CSS, no layoutId animation */}
                  {isActive && (
                    <div
                      className={cn(
                        "absolute inset-x-2 inset-y-1 rounded-xl transition-all duration-150",
                        tab.premium ? "bg-amber-500/15" : "bg-primary/15"
                      )}
                    />
                  )}
                  
                  <div className="relative z-10 flex items-center justify-center">
                    <Icon className={cn(
                      "w-6 h-6 transition-transform duration-150",
                      isActive && "scale-110"
                    )} strokeWidth={isActive ? 2.5 : 2} />
                    
                    {badge !== undefined && badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-lg">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </div>
                  
                  <span className={cn(
                    "relative z-10 text-[11px] font-medium leading-tight",
                    isActive && "font-semibold"
                  )}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
});

BottomNavBar.displayName = 'BottomNavBar';

export default BottomNavBar;
