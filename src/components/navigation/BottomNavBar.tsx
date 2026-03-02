import { MessageCircle, User, Home, Crown, Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface BottomNavBarProps {
  activeTab: 'home' | 'swipe' | 'messages' | 'premium' | 'help' | 'profile';
  onTabChange: (tab: 'home' | 'swipe' | 'messages' | 'premium' | 'help' | 'profile') => void;
  unreadCount?: number;
  isPremium?: boolean;
}

const BottomNavBar = ({ activeTab, onTabChange, unreadCount = 0, isPremium = false }: BottomNavBarProps) => {
  // Only show badge if there are unread messages (> 0)
  const messageBadge = unreadCount > 0 ? unreadCount : undefined;
  
  const tabs = [
    { id: 'home' as const, icon: Home, label: 'Accueil' },
    { id: 'swipe' as const, icon: Sparkles, label: 'Swipe' },
    { id: 'messages' as const, icon: MessageCircle, label: 'Messages', badge: messageBadge },
    { id: 'premium' as const, icon: Crown, label: 'Premium', premium: true },
    { id: 'help' as const, icon: HelpCircle, label: 'Aide' },
    { id: 'profile' as const, icon: User, label: 'Profil' },
  ];

  const handleTabClick = (tabId: typeof activeTab) => {
    // Trigger haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onTabChange(tabId);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Gradient fade for content behind */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none" />
      
      <nav className="relative pointer-events-auto px-3 pb-2" style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))', paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))' }}>
        <div className="mx-auto max-w-md bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40">
          <div className="flex items-center justify-around h-[68px] px-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 flex-1 h-full py-2 transition-colors duration-200",
                    isActive
                      ? tab.premium ? "text-amber-500" : "text-primary"
                      : "text-muted-foreground active:text-foreground",
                    tab.premium && !isActive && "text-amber-500/50"
                  )}
                >
                  {/* Active background pill */}
                  {isActive && (
                    <motion.div 
                      layoutId="activeTab"
                      className={cn(
                        "absolute inset-x-2 inset-y-1 rounded-xl",
                        tab.premium ? "bg-amber-500/15" : "bg-primary/15"
                      )}
                      transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
                    />
                  )}
                  
                  <div className="relative z-10 flex items-center justify-center">
                    <Icon className={cn(
                      "w-6 h-6 transition-all duration-200",
                      isActive && "scale-110"
                    )} strokeWidth={isActive ? 2.5 : 2} />
                    
                    {/* Badge - only show when there are unread messages */}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-lg"
                      >
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </motion.span>
                    )}
                  </div>
                  
                  <span className={cn(
                    "relative z-10 text-[11px] font-medium leading-tight",
                    isActive && "font-semibold"
                  )}>
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default BottomNavBar;
