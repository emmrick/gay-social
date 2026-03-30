import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Heart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserFavorites } from '@/hooks/useUserFavorites';
import { isUserTrulyOnline, getLastSeenText as getOnlineStatusText } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';

interface FavoritesGridProps {
  onStartChat: (userId: string) => void;
}

const FavoritesGrid = ({ onStartChat }: FavoritesGridProps) => {
  const navigate = useNavigate();
  const { favorites, isLoading } = useUserFavorites();

  const sortedFavorites = useMemo(() => {
    return favorites
      .filter(f => f.profile)
      .sort((a, b) => {
        const aOnline = isUserTrulyOnline(a.profile);
        const bOnline = isUserTrulyOnline(b.profile);
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
        const aTime = a.profile?.last_seen ? new Date(a.profile.last_seen).getTime() : 0;
        const bTime = b.profile?.last_seen ? new Date(b.profile.last_seen).getTime() : 0;
        return bTime - aTime;
      });
  }, [favorites]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-secondary/50">
            <Skeleton className="absolute inset-0" />
          </div>
        ))}
      </div>
    );
  }

  if (sortedFavorites.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl bg-secondary/30">
        <Heart className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Aucun favori pour le moment</p>
        <p className="text-xs text-muted-foreground mt-1">
          Ajoutez des membres en favoris depuis leur profil
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {sortedFavorites.map((fav) => {
        const profile = fav.profile!;
        const online = isUserTrulyOnline(profile);

        return (
          <button
            key={fav.id}
            onClick={() => navigate(`/profile/${profile.user_id}`)}
            className={cn(
              "relative aspect-[3/4] rounded-xl overflow-hidden group",
              "bg-gradient-to-br from-secondary to-secondary/50",
              "border-2 transition-colors duration-150",
              online
                ? "border-green-500/50 shadow-lg shadow-green-500/10"
                : "border-border/30 active:border-primary/50"
            )}
          >
            {/* Photo */}
            <div className="absolute inset-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white/80">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Favorite star */}
            <div className="absolute top-2 left-2">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </div>

            {/* Online indicator */}
            <div className="absolute top-2 right-2">
              {online ? (
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 block shadow-lg shadow-green-500/50" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400 block" />
              )}
            </div>

            {/* Info */}
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <div className="flex items-baseline gap-1">
                <span className="text-white font-medium text-sm truncate">
                  {profile.username}
                </span>
                {(profile as any).age && (
                  <span className="text-white/70 text-xs">{(profile as any).age}</span>
                )}
              </div>
              <div className="text-[10px] text-white/60">
                {online ? 'En ligne' : getOnlineStatusText(profile) || 'Hors ligne'}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default FavoritesGrid;
