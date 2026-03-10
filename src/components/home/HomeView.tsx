import { useState } from 'react';
import { MapPin, Star, SlidersHorizontal } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import NearbyMembersGrid from './NearbyMembersGrid';
import FavoritesGrid from './FavoritesGrid';
import ReferralBanner from './ReferralBanner';
import AdFreeBanner from './AdFreeBanner';
import StoryBar from '@/components/stories/StoryBar';

interface HomeViewProps {
  onViewProfile?: (userId: string) => void;
  onStartPrivateChat?: (userId: string) => void;
}

const HomeView = ({ 
  onViewProfile,
  onStartPrivateChat 
}: HomeViewProps) => {
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 99]);
  const [appliedAgeRange, setAppliedAgeRange] = useState<[number, number]>([18, 99]);
  const [filterOpen, setFilterOpen] = useState(false);

  const handleViewProfile = (userId: string) => {
    onViewProfile?.(userId);
  };

  const handleStartChat = (userId: string) => {
    onStartPrivateChat?.(userId);
  };

  const applyFilter = () => {
    setAppliedAgeRange(ageRange);
    setFilterOpen(false);
  };

  const resetFilter = () => {
    setAgeRange([18, 99]);
    setAppliedAgeRange([18, 99]);
    setFilterOpen(false);
  };

  const isFilterActive = appliedAgeRange[0] !== 18 || appliedAgeRange[1] !== 99;

  return (
    <div className="pb-4">
      <div className="px-4 py-4 space-y-4">
        {/* Stories bar */}
        <StoryBar />

        {/* Ad-free banner */}
        <AdFreeBanner />

        {/* Tabs + Filter */}
        <Tabs defaultValue="nearby" className="w-full">
          <div className="flex items-center gap-2">
            <TabsList className="flex-1 grid grid-cols-2">
              <TabsTrigger value="nearby" className="gap-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5" />
                À proximité
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-1.5 text-xs">
                <Star className="w-3.5 h-3.5" />
                Favoris
              </TabsTrigger>
            </TabsList>

            {/* Age Filter */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant={isFilterActive ? "default" : "outline"} 
                  size="icon" 
                  className="h-9 w-9 flex-shrink-0"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Tranche d'âge</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ageRange[0]} – {ageRange[1] === 99 ? '99+' : ageRange[1]} ans
                    </p>
                  </div>
                  <Slider
                    min={18}
                    max={99}
                    step={1}
                    value={ageRange}
                    onValueChange={(v) => setAgeRange(v as [number, number])}
                    className="py-2"
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={resetFilter}>
                      Réinitialiser
                    </Button>
                    <Button size="sm" className="flex-1" onClick={applyFilter}>
                      Appliquer
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {isFilterActive && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                Âge : {appliedAgeRange[0]} – {appliedAgeRange[1] === 99 ? '99+' : appliedAgeRange[1]} ans
              </span>
            </div>
          )}

          <TabsContent value="nearby" className="mt-3">
            <NearbyMembersGrid 
              onViewProfile={handleViewProfile}
              onStartChat={handleStartChat}
              ageRange={appliedAgeRange}
            />
          </TabsContent>

          <TabsContent value="favorites" className="mt-3">
            <FavoritesGrid onStartChat={handleStartChat} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HomeView;
