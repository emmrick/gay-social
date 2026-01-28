import { useFavoriteRegions } from '@/hooks/useFavoriteRegions';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useOnlineMemberCounts } from '@/hooks/useOnlineMemberCounts';
import { Star, Users, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface FavoriteRegionsProps {
  onSelectRegion: (regionCode: string) => void;
}

const FavoriteRegions = ({ onSelectRegion }: FavoriteRegionsProps) => {
  const { favorites, isLoading: favoritesLoading } = useFavoriteRegions();
  const { data: rooms } = useChatRooms();
  const { data: onlineCounts } = useOnlineMemberCounts();

  const favoriteRooms = rooms?.filter(room => 
    favorites.includes(room.region_code)
  ) || [];

  if (favoritesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (favoriteRooms.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        <h3 className="font-semibold text-foreground">Mes favoris</h3>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {favoriteRooms.map((room, index) => {
          const onlineCount = onlineCounts?.[room.region_code] || 0;
          return (
            <motion.button
              key={room.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectRegion(room.region_code)}
              className={cn(
                "flex-shrink-0 w-36 rounded-xl p-3 text-left transition-all duration-200 group",
                "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20",
                "hover:border-yellow-500/40 hover:shadow-lg hover:shadow-yellow-500/5",
                "active:scale-[0.98]"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center font-display font-bold text-white text-xs shadow-md">
                  {room.region_code}
                </div>
                {onlineCount > 0 && (
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                )}
              </div>
              
              <h4 className="font-medium text-foreground text-sm line-clamp-1 mb-1 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                {room.region_name}
              </h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>
                    {onlineCount > 0 ? (
                      <span className="text-green-500">{onlineCount}</span>
                    ) : (
                      '0'
                    )}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-yellow-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default FavoriteRegions;
