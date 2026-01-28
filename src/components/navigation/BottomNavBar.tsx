import { Users, MessageCircle, User, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavBarProps {
  activeTab: 'home' | 'groups' | 'messages' | 'profile';
  onTabChange: (tab: 'home' | 'groups' | 'messages' | 'profile') => void;
  unreadCount?: number;
}

const BottomNavBar = ({ activeTab, onTabChange, unreadCount = 0 }: BottomNavBarProps) => {
  // Only show badge if there are unread messages (> 0)
  const messageBadge = unreadCount > 0 ? unreadCount : undefined;
  
  const tabs = [
    { id: 'home' as const, icon: Home, label: 'Accueil' },
    { id: 'groups' as const, icon: Users, label: 'Groupes' },
    { id: 'messages' as const, icon: MessageCircle, label: 'Messages', badge: messageBadge },
    { id: 'profile' as const, icon: User, label: 'Profil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 pointer-events-none">
      {/* Gradient fade for content behind */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
      
      <nav className="relative pointer-events-auto mx-auto max-w-md">
        <div className="bg-secondary/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/30">
          <div className="flex items-center justify-around h-16 px-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition-all duration-200",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Active background indicator */}
                  {isActive && (
                    <div className="absolute inset-1 bg-primary/10 rounded-lg" />
                  )}
                  
                  <div className="relative z-10 flex items-center justify-center">
                    <Icon className={cn(
                      "w-5 h-5 transition-transform duration-200",
                      isActive && "scale-110"
                    )} />
                    
                    {/* Badge - only show when there are unread messages */}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute -top-2 -right-3 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-md">
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    )}
                  </div>
                  
                  <span className={cn(
                    "relative z-10 text-[10px] font-medium leading-tight mt-0.5",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {tab.label}
                  </span>
                  
                  {/* Active dot indicator */}
                  {isActive && (
                    <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default BottomNavBar;
