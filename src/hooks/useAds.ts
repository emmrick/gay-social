import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  link_url: string | null;
  advertiser_name: string;
  advertiser_email?: string | null;
  placement: string;
  impressions_count: number;
  clicks_count: number;
  budget_cents?: number;
  spent_cents?: number;
  geo_targeting?: string;
  geo_postal_codes?: string[] | null;
}

/** Fetch the user's region code (department) for geo-targeted ad filtering */
const useUserRegion = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-region-for-ads', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('region')
        .eq('user_id', user.id)
        .maybeSingle();
      return (data?.region as string | null) || null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });
};

/**
 * Returns true if the ad should be visible for a user located in `userRegion`.
 * - `national` ads: always visible
 * - `local` / `regional` ads: at least one postal code must start with the user's
 *   department code (e.g. user region "66" matches postal codes "66000", "66100"…)
 * - Ads with geo targeting but no postal codes fall back to visible (admin will have
 *   filled them; otherwise we don't want to silently hide everything).
 */
const adMatchesRegion = (ad: Ad, userRegion: string | null): boolean => {
  const targeting = (ad.geo_targeting || 'national').toLowerCase();
  if (targeting === 'national') return true;
  const codes = ad.geo_postal_codes || [];
  if (codes.length === 0) return true;
  if (!userRegion) return false;
  // Normalize: keep only leading digits (handles formats like "FR-IDF" → "")
  const dept = userRegion.replace(/[^0-9]/g, '').slice(0, 3);
  if (!dept) return false;
  const dept2 = dept.slice(0, 2);
  return codes.some((code) => {
    const c = (code || '').trim();
    return c.startsWith(dept) || c.startsWith(dept2);
  });
};

const AD_ROTATION_INTERVAL_MS = 60000;

/** Full ad-free subscription details (expiry, plan, remaining time) */
export const useAdFreeSubscription = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ad-free-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return { isActive: false as const };
      const { data } = await supabase
        .from('ad_free_subscriptions')
        .select('id, expires_at, starts_at, payment_plan, credits_paid')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .maybeSingle();
      if (!data) return { isActive: false as const };
      const expiresAt = new Date(data.expires_at);
      const msRemaining = Math.max(0, expiresAt.getTime() - Date.now());
      const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
      const hoursRemaining = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return {
        isActive: true as const,
        expiresAt,
        startsAt: new Date(data.starts_at),
        paymentPlan: data.payment_plan,
        creditsPaid: data.credits_paid,
        daysRemaining,
        hoursRemaining,
        msRemaining,
      };
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchInterval: 60 * 60 * 1000,
  });
};

/** Boolean shorthand: true if user currently has an active ad-free subscription */
export const useAdFreeStatus = () => {
  const { data, isLoading } = useAdFreeSubscription();
  return { data: !!data?.isActive, isLoading };
};

// Shared rotation state across ALL useAds() instances so that
// multiple AdBanner placements on the same page stay in sync and
// pick DISTINCT ads via getAdByOffset(index).
let _sharedRotationIndex = 0;
let _sharedShuffleSeed = Math.random();
const _rotationListeners = new Set<() => void>();
let _rotationTimer: ReturnType<typeof setInterval> | null = null;

const ensureSharedRotationTimer = () => {
  if (_rotationTimer) return;
  _rotationTimer = setInterval(() => {
    _sharedRotationIndex += 1;
    _sharedShuffleSeed = Math.random();
    _rotationListeners.forEach(l => l());
  }, AD_ROTATION_INTERVAL_MS);
};

/** Fetch approved ads filtered by placement */
export const useAds = (_placement?: string, limit = 10) => {
  const { user } = useAuth();
  const { data: isAdFree } = useAdFreeStatus();
  const { data: userRegion } = useUserRegion();
  const [, forceTick] = useState(0);
  const rotationIndex = _sharedRotationIndex;
  const shuffleSeed = _sharedShuffleSeed;

  const { data: ads, ...rest } = useQuery({
    queryKey: ['active-ads', limit, userRegion || 'no-region'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ads')
        .select('id, title, description, image_url, image_urls, link_url, advertiser_name, advertiser_email, placement, impressions_count, clicks_count, budget_cents, spent_cents, geo_targeting, geo_postal_codes')
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data || []) as Ad[])
        .filter((ad) => (ad.budget_cents || 0) > (ad.spent_cents || 0))
        .filter((ad) => adMatchesRegion(ad, userRegion ?? null));
    },
    enabled: !isAdFree,
    staleTime: 30000,
    refetchInterval: 120000,
  });

  // Shuffle ads deterministically based on seed + page path
  const prevFirstRef = useRef<string | null>(null);
  const shuffledAds = useMemo(() => {
    if (!ads || ads.length <= 1) return ads || [];
    const pageSeed = window.location.pathname.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const combined = shuffleSeed + pageSeed;
    // Fisher-Yates with seeded random
    const arr = [...ads];
    let seed = combined;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // Avoid showing the same ad twice in a row after re-shuffle
    if (prevFirstRef.current && arr[0]?.id === prevFirstRef.current && arr.length > 1) {
      [arr[0], arr[1]] = [arr[1], arr[0]];
    }
    prevFirstRef.current = arr[0]?.id ?? null;
    return arr;
  }, [ads, shuffleSeed]);

  useEffect(() => {
    if (!shuffledAds || shuffledAds.length <= 1) return;
    ensureSharedRotationTimer();
    const listener = () => forceTick(t => t + 1);
    _rotationListeners.add(listener);
    return () => { _rotationListeners.delete(listener); };
  }, [shuffledAds?.length]);

  const currentAd = shuffledAds && shuffledAds.length > 0 ? shuffledAds[rotationIndex % shuffledAds.length] : null;

  /** Get a specific ad by index offset (for multiple ad placements on same page) */
  const getAdByOffset = (offset: number) => {
    if (!shuffledAds || shuffledAds.length === 0) return null;
    const idx = (rotationIndex + offset) % shuffledAds.length;
    return shuffledAds[idx];
  };

  return { ads: isAdFree ? [] : (shuffledAds || []), currentAd: isAdFree ? null : currentAd, isAdFree, rotationIndex, getAdByOffset, ...rest };
};

/** Track impression (once per ad+placement per session) */
export const useAdImpression = (adId: string | undefined, placement?: string) => {
  const { user } = useAuth();
  const tracked = useRef(new Set<string>());

  useEffect(() => {
    if (!adId || !user?.id) return;
    const key = `${adId}|${placement || 'unknown'}`;
    if (tracked.current.has(key)) return;
    tracked.current.add(key);

    const track = async () => {
      await supabase.from('ad_impressions').insert({
        ad_id: adId,
        user_id: user.id,
        page_url: window.location.pathname,
        placement: placement || null,
      } as any);
      await supabase.rpc('increment_ad_impressions' as any, { _ad_id: adId });
    };
    track().catch(() => {});
  }, [adId, user?.id, placement]);
};

/** Track click */
export const useAdClick = () => {
  const { user } = useAuth();

  return useCallback(async (adId: string, linkUrl: string | null) => {
    if (!user?.id) return;
    
    await supabase.from('ad_clicks').insert({
      ad_id: adId,
      user_id: user.id,
      page_url: window.location.pathname,
    } as any);

    await supabase.rpc('increment_ad_clicks' as any, { _ad_id: adId });

    if (linkUrl) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    }
  }, [user?.id]);
};
