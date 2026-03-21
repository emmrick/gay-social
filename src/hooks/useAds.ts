import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  advertiser_name: string;
  advertiser_email?: string | null;
  placement: string;
  impressions_count: number;
  clicks_count: number;
  budget_cents?: number;
  spent_cents?: number;
}

const AD_ROTATION_INTERVAL_MS = 60000;

/** Check if user has an active ad-free subscription */
export const useAdFreeStatus = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ad-free-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('ad_free_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });
};

/** Fetch approved ads filtered by placement */
export const useAds = (placement?: string, limit = 10) => {
  const { user } = useAuth();
  const { data: isAdFree } = useAdFreeStatus();
  const [rotationIndex, setRotationIndex] = useState(0);

  const { data: ads, ...rest } = useQuery({
    queryKey: ['active-ads', placement, limit],
    queryFn: async () => {
      let query = supabase
        .from('ads')
        .select('id, title, description, image_url, link_url, advertiser_name, advertiser_email, placement, impressions_count, clicks_count, budget_cents, spent_cents')
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (placement) query = query.eq('placement', placement);
      const { data, error } = await query;
      if (error) throw error;
      return ((data || []) as Ad[]).filter(ad => (ad.budget_cents || 0) > (ad.spent_cents || 0));
    },
    enabled: !isAdFree,
    staleTime: 30000,
    refetchInterval: 120000,
  });

  useEffect(() => {
    if (!ads || ads.length <= 1) return;
    const timer = setInterval(() => setRotationIndex(prev => prev + 1), AD_ROTATION_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [ads?.length]);

  const currentAd = ads && ads.length > 0 ? ads[rotationIndex % ads.length] : null;

  return { ads: isAdFree ? [] : (ads || []), currentAd: isAdFree ? null : currentAd, isAdFree, rotationIndex, ...rest };
};

/** Track impression (once per ad per session) */
export const useAdImpression = (adId: string | undefined) => {
  const { user } = useAuth();
  const tracked = useRef(new Set<string>());

  useEffect(() => {
    if (!adId || !user?.id || tracked.current.has(adId)) return;
    tracked.current.add(adId);

    const track = async () => {
      await supabase.from('ad_impressions').insert({
        ad_id: adId,
        user_id: user.id,
        page_url: window.location.pathname,
      } as any);
      await supabase.rpc('increment_ad_impressions' as any, { _ad_id: adId });
    };
    track().catch(() => {});
  }, [adId, user?.id]);
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
