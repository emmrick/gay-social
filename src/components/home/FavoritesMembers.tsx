import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserFavorites } from '@/hooks/useUserFavorites';
import { usePremiumUsers } from '@/hooks/usePremiumUsers';
import { isUserTrulyOnline, getLastSeenText as getOnlineStatusText } from '@/hooks/useOnlineStatus';
import PremiumUserBadge from '@/components/premium/PremiumUserBadge';
import { cn } from '@/lib/utils';

interface FavoritesMembersProps {
  onStartChat: (userId: string) => void;
}

const FavoritesMembers = ({ onStartChat }: FavoritesMembersProps) => {
  const navigate = useNavigate();
  const { favorites, isLoading } = useUserFavorites();

  // Filter out favorites without profiles and sort by online status
  const sortedFavorites = useMemo(() => {
    return favorites
      .filter(f => f.profile)
      .sort((a, b) => {
        // Truly online first (using the 5-minute threshold)
        const aOnline = isUserTrulyOnline(a.profile);
        const bOnline = isUserTrulyOnline(b.profile);
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
        // Then by last_seen
        const aTime = a.profile?.last_seen ? new Date(a.profile.last_seen).getTime() : 0;
        const bTime = b.profile?.last_seen ? new Date(b.profile.last_seen).getTime() : 0;
        return bTime - aTime;
      });
  }, [favorites]);

  // Get user IDs for premium check
  const userIds = useMemo(() => sortedFavorites.map(f => f.profile!.user_id), [sortedFavorites]);
  const { data: premiumMap = {} } = usePremiumUsers(userIds);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-20 h-24 rounded-xl bg-secondary/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (sortedFavorites.length === 0) {
    return null; // Don't show section if no favorites
  }

  const getLastSeenText = (profile: any) => {
    if (isUserTrulyOnline(profile)) return 'En ligne';
    const text = getOnlineStatusText(profile);
    return text || 'Hors ligne';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-500" />
        <h2 className="font-display font-semibold text-foreground text-sm">Mes favoris</h2>
        <span className="text-xs text-muted-foreground">({sortedFavorites.length})</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {sortedFavorites.map((fav, index) => {
          const profile = fav.profile!;
          return (
            <motion.div
              key={fav.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0 w-20"
            >
              <button
                onClick={() => navigate(`/profile/${profile.user_id}`)}
                className="relative w-full"
              >
                <div className={cn(
                  "relative w-20 h-24 rounded-xl overflow-hidden",
                  "border-2 transition-all duration-200",
                  isUserTrulyOnline(profile) 
                    ? "border-green-500 shadow-lg shadow-green-500/20" 
                    : "border-border/30"
                )}>
                  {/* Avatar/Photo */}
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white/80">
                        {profile.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  {/* Online indicator */}
                  <div className="absolute top-1.5 right-1.5">
                    {isUserTrulyOnline(profile) ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 block shadow-lg shadow-green-500/50" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-400 block" />
                    )}
                  </div>

                  {/* Star badge */}
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    {premiumMap[profile.user_id] && (
                      <PremiumUserBadge size="sm" />
                    )}
                  </div>

                  {/* Name */}
                  <div className="absolute bottom-1 left-1 right-1">
                    <p className="text-white text-xs font-medium truncate text-center">
                      {profile.username}
                    </p>
                  </div>
                </div>
              </button>

              {/* Quick message button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 mt-1 text-xs"
                onClick={() => onStartChat(profile.user_id)}
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                MP
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default FavoritesMembers;
