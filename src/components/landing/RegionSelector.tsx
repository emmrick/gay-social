import { useChatRooms } from '@/hooks/useChatRooms';
import { useOnlineMemberCounts } from '@/hooks/useOnlineMemberCounts';
import { useFavoriteRegions } from '@/hooks/useFavoriteRegions';
import { useState } from 'react';
import { MapPin, Users, ArrowRight, Search, Loader2, X, Star } from 'lucide-react';
import FavoriteRegions from './FavoriteRegions';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface RegionSelectorProps {
  onSelectRegion: (regionCode: string) => void;
}

const RegionSelector = ({ onSelectRegion }: RegionSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: rooms, isLoading } = useChatRooms();
  const { data: onlineCounts } = useOnlineMemberCounts();
  const { toggleFavorite, isFavorite } = useFavoriteRegions();
  
  const filteredRegions = rooms?.filter(room => 
    room.region_code.includes(searchQuery) || 
    room.region_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <section className="py-12 px-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement des régions...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 px-4">
      <div className="container max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            Choisis ta <span className="gradient-text">région</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Rejoins le groupe de ton département
          </p>
        </div>
        
        {/* Search */}
        <div className="relative max-w-md mx-auto mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par code ou nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 pr-10 h-11 bg-secondary/50 border-border/50 rounded-xl focus:bg-secondary transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Results count */}
        {searchQuery && (
          <p className="text-center text-sm text-muted-foreground mb-4">
            {filteredRegions.length} résultat{filteredRegions.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Favorites section */}
        {!searchQuery && (
          <FavoriteRegions onSelectRegion={onSelectRegion} />
        )}
        
        {/* All regions label */}
        {!searchQuery && (
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Toutes les régions
          </h3>
        )}
        
        {/* Regions grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredRegions.map((room, index) => {
            const onlineCount = onlineCounts?.[room.region_code] || 0;
            return (
              <div
                key={room.id}
                className={cn(
                  "relative overflow-hidden rounded-xl p-4 text-left transition-all duration-300 group",
                  "bg-secondary/50 border border-border/50",
                  "hover:bg-secondary hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                  "animate-fade-in",
                  isFavorite(room.region_code) && "border-yellow-500/30 bg-yellow-500/5"
                )}
                style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
              >
                {/* Favorite button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(room.region_code);
                  }}
                  className={cn(
                    "absolute top-3 right-3 p-1.5 rounded-full transition-all z-10",
                    "hover:bg-yellow-500/20",
                    isFavorite(room.region_code) 
                      ? "text-yellow-500" 
                      : "text-muted-foreground hover:text-yellow-500"
                  )}
                >
                  <Star 
                    className={cn(
                      "w-4 h-4 transition-all",
                      isFavorite(room.region_code) && "fill-yellow-500"
                    )} 
                  />
                </button>

                {/* Online indicator */}
                {onlineCount > 0 && (
                  <div className="absolute top-3 right-10">
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  </div>
                )}

                <button
                  onClick={() => onSelectRegion(room.region_code)}
                  className="w-full text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display font-bold text-white text-sm shadow-md">
                      {room.region_code}
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-foreground mb-1.5 text-sm line-clamp-1 group-hover:text-primary transition-colors">
                    {room.region_name}
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>
                        {onlineCount > 0 ? (
                          <span className="text-green-500 font-medium">{onlineCount} en ligne</span>
                        ) : (
                          'Rejoindre'
                        )}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
        
        {/* Empty state */}
        {filteredRegions.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-2">Aucune région trouvée</h3>
            <p className="text-sm text-muted-foreground">
              Essaie avec un autre code postal ou nom de département
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RegionSelector;
