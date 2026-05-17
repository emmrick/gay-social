import { useEffect, useState } from 'react';

import { Star, SlidersHorizontal, Compass, Eye, Heart, Map as MapIcon, RefreshCw, Ruler, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFeatureFlags } from '@/hooks/useFeatureToggles';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useUnreadVisitsCount, useMarkVisitsSeen } from '@/hooks/useProfileVisits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import NearbyMembersGrid from './NearbyMembersGrid';
import FavoritesGrid from './FavoritesGrid';
import AdOrInfoBanner from './AdOrInfoBanner';
import VisitsTab from './VisitsTab';
import ReactionsTab from './ReactionsTab';
import MapTab from './MapTab';
import SectionErrorBoundary from '@/components/SectionErrorBoundary';
import type { RadiusValue } from './RadiusSelector';

interface HomeViewProps {
  onViewProfile?: (userId: string) => void;
  onStartPrivateChat?: (userId: string) => void;
}

type HomeSection = 'accueil' | 'favorites' | 'visites' | 'reactions' | 'carte';

const RADIUS_STORAGE_KEY = 'gc_nearby_radius_km';
const DEFAULT_RADIUS: RadiusValue = 10;
const RADIUS_OPTIONS: { value: RadiusValue; label: string; hint: string }[] = [
  { value: 5,   label: '5 km',   hint: 'Hyper local' },
  { value: 10,  label: '10 km',  hint: 'Autour de moi' },
  { value: 25,  label: '25 km',  hint: 'Ma ville' },
  { value: 50,  label: '50 km',  hint: 'Région proche' },
  { value: 100, label: '100 km', hint: 'Région étendue' },
  { value: 0,   label: '∞',      hint: 'Sans limite' },
];

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

  // Rayon partagé : stocké ici pour que le bouton de la barre du haut puisse l'éditer
  const [radius, setRadius] = useState<RadiusValue>(() => {
    if (typeof window === 'undefined') return DEFAULT_RADIUS;
    const stored = window.localStorage.getItem(RADIUS_STORAGE_KEY);
    if (!stored) return DEFAULT_RADIUS;
    const parsed = Number(stored) as RadiusValue;
    return ([5, 10, 25, 50, 100, 0] as number[]).includes(parsed) ? parsed : DEFAULT_RADIUS;
  });
  const [draftRadius, setDraftRadius] = useState<RadiusValue>(radius);
  const [radiusOpen, setRadiusOpen] = useState(false);

  // Token incrémenté à chaque clic sur Actualiser, observé par le grid
  const [refreshToken, setRefreshToken] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    try { window.localStorage.setItem(RADIUS_STORAGE_KEY, String(radius)); } catch {}
  }, [radius]);

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

  const applyFilter = () => { setAppliedAgeRange(ageRange); setFilterOpen(false); };
  const resetFilter = () => { setAgeRange([18, 99]); setAppliedAgeRange([18, 99]); setFilterOpen(false); };
  const isFilterActive = appliedAgeRange[0] !== 18 || appliedAgeRange[1] !== 99;

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshToken((t) => t + 1);
    // La fin réelle du refetch n'est pas remontée — on rend un feedback visuel court
    window.setTimeout(() => setIsRefreshing(false), 1200);
  };

  const openRadiusSheet = () => { setDraftRadius(radius); setRadiusOpen(true); };
  const saveRadius = () => { setRadius(draftRadius); setRadiusOpen(false); };

  const radiusLabel = RADIUS_OPTIONS.find((o) => o.value === radius)?.label ?? `${radius} km`;
  const isAccueil = activeSection === 'accueil';

  const tabTriggerClass =
    'gap-1 text-[11px] font-bold rounded-lg px-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/15 data-[state=active]:to-accent/10 data-[state=active]:border data-[state=active]:border-primary/20 data-[state=active]:shadow-sm data-[state=active]:shadow-primary/10';

  return (
    <div className="pb-4">
      <div className="px-3 pt-3 pb-2 space-y-2.5">
        <Tabs value={activeSection} onValueChange={(v) => {
          const section = v as HomeSection;
          setActiveSection(section);
          if (section === 'visites') markVisitsSeen();
        }}>
          <div className="flex items-center gap-1.5">
            <TabsList className="flex-1 grid grid-cols-5 h-9 p-0.5 bg-card/80 backdrop-blur-xl border border-border/40 rounded-xl">
              <TabsTrigger value="accueil" className={tabTriggerClass}>
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden min-[400px]:inline">Proximité</span>
              </TabsTrigger>
              <TabsTrigger value="favorites" className={tabTriggerClass}>
                <Star className="w-3.5 h-3.5" />
                <span className="hidden min-[400px]:inline">Favoris</span>
              </TabsTrigger>
              <TabsTrigger value="visites" className={cn(tabTriggerClass, 'relative')}>
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden min-[400px]:inline">Visites</span>
                {visitsCount > 0 && (
                  <span className="absolute -top-1 -right-0.5 h-3.5 min-w-3.5 px-1 text-[9px] leading-none flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-black shadow-sm">
                    {visitsCount > 99 ? '99+' : visitsCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="reactions" className={cn(tabTriggerClass, 'relative')}>
                <Heart className="w-3.5 h-3.5" />
                <span className="hidden min-[400px]:inline">Réactions</span>
                {reactionsCount > 0 && (
                  <span className="absolute -top-1 -right-0.5 h-3.5 min-w-3.5 px-1 text-[9px] leading-none flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-black shadow-sm">
                    {reactionsCount > 99 ? '99+' : reactionsCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="carte" className={tabTriggerClass}>
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden min-[400px]:inline">Carte</span>
              </TabsTrigger>
            </TabsList>

            {/* Filtres âge */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={isFilterActive ? 'default' : 'outline'}
                  size="icon"
                  className={cn(
                    'h-9 w-9 flex-shrink-0 rounded-xl border-border/40',
                    isFilterActive
                      ? 'bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/20'
                      : 'hover:border-primary/30'
                  )}
                  aria-label="Filtres"
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

            {/* Distance — visible seulement sur Proximité */}
            {isAccueil && (
              <Button
                variant="outline"
                size="sm"
                onClick={openRadiusSheet}
                className="h-9 px-2.5 flex-shrink-0 rounded-xl border-border/40 hover:border-primary/30 gap-1.5"
                aria-label="Choisir la distance"
              >
                <Ruler className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold tabular-nums">{radiusLabel}</span>
              </Button>
            )}

            {/* Refresh — visible seulement sur Proximité */}
            {isAccueil && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9 w-9 flex-shrink-0 rounded-xl border-border/40 hover:border-primary/30"
                aria-label="Actualiser"
              >
                <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin text-primary')} />
              </Button>
            )}
          </div>

          {isFilterActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-1.5"
            >
              <span className="text-[11px] text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/15 font-semibold">
                🎯 Âge : {appliedAgeRange[0]} – {appliedAgeRange[1] === 99 ? '99+' : appliedAgeRange[1]} ans
              </span>
            </motion.div>
          )}

          <AdOrInfoBanner placement="native" />

          <TabsContent value="accueil" className="mt-2">
            <NearbyMembersGrid
              onViewProfile={handleViewProfile}
              onStartChat={handleStartChat}
              ageRange={appliedAgeRange}
              radius={radius}
              refreshToken={refreshToken}
            />
          </TabsContent>

          <TabsContent value="favorites" className="mt-2">
            <FavoritesGrid onStartChat={handleStartChat} />
          </TabsContent>

          <TabsContent value="visites" className="mt-2">
            <VisitsTab onViewProfile={handleViewProfile} />
          </TabsContent>

          <TabsContent value="reactions" className="mt-2">
            <ReactionsTab onViewProfile={handleViewProfile} />
          </TabsContent>

          <TabsContent value="carte" className="mt-2">
            <SectionErrorBoundary label="La carte n'a pas pu se charger">
              <MapTab onViewProfile={handleViewProfile} />
            </SectionErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sheet : choix de la distance */}
      <Sheet open={radiusOpen} onOpenChange={setRadiusOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/40 px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="font-display flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/15 flex items-center justify-center">
                <Ruler className="w-4 h-4 text-primary" />
              </span>
              Distance de recherche
            </SheetTitle>
            <SheetDescription className="text-xs">
              Choisis le rayon autour de ta position.
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-3 gap-2">
            {RADIUS_OPTIONS.map((opt) => {
              const isActive = opt.value === draftRadius;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraftRadius(opt.value)}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-0.5 py-3 rounded-2xl border transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    isActive
                      ? 'bg-gradient-to-br from-primary/15 to-accent/10 border-primary/40 shadow-sm shadow-primary/10'
                      : 'bg-card border-border/40 hover:border-primary/30'
                  )}
                >
                  {isActive && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <span className={cn('text-base font-black tabular-nums', isActive ? 'text-primary' : 'text-foreground')}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">{opt.hint}</span>
                </button>
              );
            })}
          </div>

          <Button
            onClick={saveRadius}
            className="w-full mt-5 h-11 rounded-2xl bg-gradient-to-r from-primary to-accent hover:opacity-90 font-bold"
          >
            Enregistrer
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default HomeView;
