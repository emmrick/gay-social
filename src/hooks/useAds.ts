import { useEffect, useRef, useCallback } from 'react';
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
  placement: string;
  impressions_count: number;
  clicks_count: number;
}

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
export const useAds = (placement?: string, limit = 3) => {
  const { user } = useAuth();
  const { data: isAdFree } = useAdFreeStatus();

  const { data: ads, ...rest } = useQuery({
    queryKey: ['active-ads', placement, limit],
    queryFn: async () => {
      let query = supabase
        .from('ads')
        .select('id, title, description, image_url, link_url, advertiser_name, placement, impressions_count, clicks_count')
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (placement) query = query.eq('placement', placement);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Ad[];
    },
    enabled: !isAdFree,
    staleTime: 60000 * 5,
  });

  return { ads: isAdFree ? [] : (ads || []), isAdFree, ...rest };
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
