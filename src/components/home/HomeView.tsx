import { useState } from 'react';
import { Star, SlidersHorizontal, Compass, Eye, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFeatureFlags } from '@/hooks/useFeatureToggles';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import NearbyMembersGrid from './NearbyMembersGrid';
import FavoritesGrid from './FavoritesGrid';
import AdFreeBanner from './AdFreeBanner';
import AdBanner from '@/components/ads/AdBanner';
import VisitsTab from './VisitsTab';
import ReactionsTab from './ReactionsTab';

interface HomeViewProps {
  onViewProfile?: (userId: string) => void;
  onStartPrivateChat?: (userId: string) => void;
}

type HomeSection = 'accueil' | 'visites' | 'reactions';

const HomeView = ({ 
  onViewProfile,
  onStartPrivateChat 
}: HomeViewProps) => {
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 99]);
  const featureFlags = useFeatureFlags();
  const [appliedAgeRange, setAppliedAgeRange] = useState<[number, number]>([18, 99]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<HomeSection>('accueil');

  const handleViewProfile = (userId: string) => onViewProfile?.(userId);
  const handleStartChat = (userId: string) => onStartPrivateChat?.(userId);

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
        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as HomeSection)}>
          <div className="flex items-center gap-2">
            <TabsList className="flex-1 grid grid-cols-5 h-10">
              <TabsTrigger value="accueil" className="gap-1 text-xs font-medium">
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden min-[400px]:inline">Proximité</span>
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-1 text-xs font-medium">
                <Star className="w-3.5 h-3.5" />
                <span className="hidden min-[400px]:inline">Favoris</span>
              </TabsTrigger>
              <TabsTrigger value="visites" className="gap-1 text-xs font-medium">
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden min-[400px]:inline">Visites</span>
              </TabsTrigger>
              <TabsTrigger value="reactions" className="gap-1 text-xs font-medium">
                <Heart className="w-3.5 h-3.5" />
                <span className="hidden min-[400px]:inline">Réactions</span>
              </TabsTrigger>
              <TabsTrigger value="home" className="gap-1 text-xs font-medium" disabled style={{ display: 'none' }}>
                hidden
              </TabsTrigger>
            </TabsList>

            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant={isFilterActive ? "default" : "outline"} 
                  size="icon" 
                  className="h-10 w-10 flex-shrink-0 rounded-xl"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Tranche d'âge</Label>
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
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2"
            >
              <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border/50">
                🎯 Âge : {appliedAgeRange[0]} – {appliedAgeRange[1] === 99 ? '99+' : appliedAgeRange[1]} ans
              </span>
            </motion.div>
          )}

          <AdFreeBanner />
          <AdBanner placement="native" className="mb-3" />

          <TabsContent value="accueil" className="mt-3">
            <NearbyMembersGrid 
              onViewProfile={handleViewProfile}
              onStartChat={handleStartChat}
              ageRange={appliedAgeRange}
            />
          </TabsContent>

          <TabsContent value="favorites" className="mt-3">
            <FavoritesGrid onStartChat={handleStartChat} />
          </TabsContent>

          <TabsContent value="visites" className="mt-3">
            <VisitsTab onViewProfile={handleViewProfile} />
          </TabsContent>

          <TabsContent value="reactions" className="mt-3">
            <ReactionsTab onViewProfile={handleViewProfile} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HomeView;
