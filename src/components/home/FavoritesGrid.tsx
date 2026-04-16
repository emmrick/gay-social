import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserFavorites } from '@/hooks/useUserFavorites';
import { isUserTrulyOnline } from '@/hooks/useOnlineStatus';
import { useLivePresence } from '@/hooks/useLivePresence';
import { cn } from '@/lib/utils';
import { SecureAvatarImg } from '@/components/ui/secure-avatar';

interface FavoritesGridProps {
  onStartChat: (userId: string) => void;
}

const FavoriteCard = ({ profile, onClick }: { profile: any; onClick: () => void }) => {
  const live = useLivePresence(profile);
  const online = live.isOnline;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative aspect-[3/4] rounded-2xl overflow-hidden group',
        'bg-gradient-to-br from-card to-secondary/50',
        'border-2 transition-all duration-200',
        online
          ? 'border-green-500/40 shadow-lg shadow-green-500/10'
          : 'border-border/20 hover:border-primary/25 active:scale-[0.98]'
      )}
    >
      <div className="absolute inset-0">
        {profile.avatar_url ? (
          <SecureAvatarImg src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
            <span className="text-3xl font-black text-primary/40" style={{ fontFamily: 'Syne, sans-serif' }}>
              {profile.username.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

      <div className="absolute top-2 left-2">
        <div className="w-6 h-6 rounded-lg bg-accent/20 backdrop-blur-sm flex items-center justify-center border border-accent/30">
          <Star className="w-3 h-3 text-accent fill-accent" />
        </div>
      </div>

      <div className="absolute top-2 right-2">
        {online ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-white/30" />
          </span>
        ) : (
          <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 block" />
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-2">
        <div className="flex items-baseline gap-1">
          <span className="text-white font-bold text-sm truncate">{profile.username}</span>
          {profile.age && <span className="text-white/60 text-xs">{profile.age}</span>}
        </div>
        <div className="text-[10px] text-white/50 font-medium">
          {online ? 'En ligne' : live.lastSeenText || 'Hors ligne'}
        </div>
      </div>
    </button>
  );
};

const FavoritesGrid = ({ onStartChat }: FavoritesGridProps) => {
  const navigate = useNavigate();
  const { favorites, isLoading } = useUserFavorites();

  const sortedFavorites = useMemo(() => {
    return favorites
      .filter((f) => f.profile)
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
          <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-card/50 border border-border/20">
            <Skeleton className="absolute inset-0" />
          </div>
        ))}
      </div>
    );
  }

  if (sortedFavorites.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl bg-card border border-border/30">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center">
          <Heart className="w-7 h-7 text-primary/40" />
        </div>
        <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>Aucun favori</p>
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
        return (
          <FavoriteCard
            key={fav.id}
            profile={profile}
            onClick={() => navigate(`/profile/${profile.user_id}`)}
          />
        );
      })}
    </div>
  );
};

export default FavoritesGrid;
