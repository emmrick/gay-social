import { useState } from 'react';

import { Star, SlidersHorizontal, Compass, Eye, Heart, Map as MapIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFeatureFlags } from '@/hooks/useFeatureToggles';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useUnreadVisitsCount, useMarkVisitsSeen } from '@/hooks/useProfileVisits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import NearbyMembersGrid from './NearbyMembersGrid';
import FavoritesGrid from './FavoritesGrid';
import AdOrInfoBanner from './AdOrInfoBanner';
import VisitsTab from './VisitsTab';
import ReactionsTab from './ReactionsTab';

interface HomeViewProps {
  onViewProfile?: (userId: string) => void;
  onStartPrivateChat?: (userId: string) => void;
}

type HomeSection = 'accueil' | 'favorites' | 'visites' | 'reactions';

const HomeView = ({ 
  onViewProfile,
  onStartPrivateChat 
}: HomeViewProps) => {
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 99]);
  const featureFlags = useFeatureFlags();
  const [appliedAgeRange, setAppliedAgeRange] = useState<[number, number]>([18, 99]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<HomeSection>('accueil');
  const { user } = useAuth();

  const visitsCount = useUnreadVisitsCount();
  const markVisitsSeen = useMarkVisitsSeen();

  const { data: reactionsCount = 0 } = useQuery({
    queryKey: ['profile-reactions-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('profile_reactions' as any)
        .select('id', { count: 'exact', head: true })
        .eq('profile_user_id', user.id)
        .eq('is_seen', false);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user?.id,
  });

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
        <Tabs value={activeSection} onValueChange={(v) => {
          const section = v as HomeSection;
          setActiveSection(section);
          if (section === 'visites') markVisitsSeen();
        }}>
          <div className="flex items-center gap-2">
            <TabsList className="flex-1 grid grid-cols-4 h-11 p-1 bg-card/80 backdrop-blur-xl border border-border/40 rounded-2xl">
              <TabsTrigger
                value="accueil"
                className="gap-1 text-xs font-bold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/15 data-[state=active]:to-accent/10 data-[state=active]:border data-[state=active]:border-primary/20 data-[state=active]:shadow-sm data-[state=active]:shadow-primary/10"
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden min-[400px]:inline">Proximité</span>
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="gap-1 text-xs font-bold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/15 data-[state=active]:to-accent/10 data-[state=active]:border data-[state=active]:border-primary/20 data-[state=active]:shadow-sm data-[state=active]:shadow-primary/10"
              >
                <Star className="w-3.5 h-3.5" />
                <span className="hidden min-[400px]:inline">Favoris</span>
              </TabsTrigger>
              <TabsTrigger
                value="visites"
                className="gap-1 text-xs font-bold rounded-xl relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/15 data-[state=active]:to-accent/10 data-[state=active]:border data-[state=active]:border-primary/20 data-[state=active]:shadow-sm data-[state=active]:shadow-primary/10"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden min-[400px]:inline">Visites</span>
                {visitsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-black shadow-sm">
                    {visitsCount > 99 ? '99+' : visitsCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="reactions"
                className="gap-1 text-xs font-bold rounded-xl relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/15 data-[state=active]:to-accent/10 data-[state=active]:border data-[state=active]:border-primary/20 data-[state=active]:shadow-sm data-[state=active]:shadow-primary/10"
              >
                <Heart className="w-3.5 h-3.5" />
                <span className="hidden min-[400px]:inline">Réactions</span>
                {reactionsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-black shadow-sm">
                    {reactionsCount > 99 ? '99+' : reactionsCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant={isFilterActive ? "default" : "outline"} 
                  size="icon" 
                  className={`h-11 w-11 flex-shrink-0 rounded-xl border-border/40 ${
                    isFilterActive ? 'bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/20' : 'hover:border-primary/30'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 rounded-2xl border-border/40" align="end">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-bold">Tranche d'âge</Label>
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
                    <Button variant="ghost" size="sm" className="flex-1 rounded-xl" onClick={resetFilter}>
                      Réinitialiser
                    </Button>
                    <Button size="sm" className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90" onClick={applyFilter}>
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
              <span className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/15 font-semibold">
                🎯 Âge : {appliedAgeRange[0]} – {appliedAgeRange[1] === 99 ? '99+' : appliedAgeRange[1]} ans
              </span>
            </motion.div>
          )}

          <AdOrInfoBanner placement="native" />

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
