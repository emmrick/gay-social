import { useChatRooms } from '@/hooks/useChatRooms';
import { useOnlineMemberCounts } from '@/hooks/useOnlineMemberCounts';
import { useState } from 'react';
import { MapPin, Users, ArrowRight, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface RegionSelectorProps {
  onSelectRegion: (regionCode: string) => void;
}

const RegionSelector = ({ onSelectRegion }: RegionSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: rooms, isLoading } = useChatRooms();
  const { data: onlineCounts } = useOnlineMemberCounts();
  
  const filteredRegions = rooms?.filter(room => 
    room.region_code.includes(searchQuery) || 
    room.region_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <section className="py-20 px-4 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </section>
    );
  }

  return (
    <section className="py-20 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Choisis ta <span className="gradient-text">région</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Rejoins le groupe de ton département pour des rencontres près de chez toi
          </p>
        </div>
        
        {/* Search */}
        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par code postal ou nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-secondary border-border"
          />
        </div>
        
        {/* Regions grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRegions.map((room, index) => (
            <button
              key={room.id}
              onClick={() => onSelectRegion(room.region_code)}
              className="glass-card rounded-xl p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display font-bold text-white">
                  {room.region_code}
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{room.region_name}</h3>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>
                  {onlineCounts?.[room.region_code] 
                    ? `${onlineCounts[room.region_code]} en ligne`
                    : 'Rejoindre'}
                </span>
              </div>
            </button>
          ))}
        </div>
        
        {filteredRegions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune région trouvée pour "{searchQuery}"</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RegionSelector;
