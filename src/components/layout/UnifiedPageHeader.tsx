import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CreditBalanceCompact from '@/components/credits/CreditBalanceCompact';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import { User } from 'lucide-react';
import logoSrc from '@/assets/logo.png';


interface UnifiedPageHeaderProps {
  onNavigateToCredits: () => void;
  onNavigateToProfile: () => void;
  onlineCount?: number;
  rightContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
}

const UnifiedPageHeader = ({
  onNavigateToCredits,
  onNavigateToProfile,
  onlineCount,
  rightContent,
  bottomContent,
}: UnifiedPageHeaderProps) => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile-header', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div
      className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="px-5 pb-4 flex items-center justify-between w-full">
        <div className="min-w-0 flex items-center gap-2.5">
          <img src={logoSrc} alt="Gay Social" className="w-9 h-9 rounded-full object-cover shadow-md ring-2 ring-primary/30 flex-shrink-0" />
          <h1 className="font-display text-xl font-extrabold rainbow-text leading-tight">
            Gay Social
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CreditBalanceCompact onClick={onNavigateToCredits} />
          {onlineCount !== undefined && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                {onlineCount || 0}
              </span>
            </div>
          )}
          {rightContent}
          <NotificationsDropdown />
          <button
            onClick={onNavigateToProfile}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors overflow-hidden border-2 border-primary/20"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profil" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
      {bottomContent}
    </div>
  );
};

export default UnifiedPageHeader;
