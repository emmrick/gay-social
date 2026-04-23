import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LocationHideStatus {
  has_period: boolean;
  is_hidden: boolean;
  remaining_seconds: number;
  expires_at: string | null;
}

export const useLocationHide = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<LocationHideStatus>({
    has_period: false,
    is_hidden: false,
    remaining_seconds: 0,
    expires_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc('get_location_hide_status', { _user_id: user.id });
    if (!error && data) {
      setStatus(data as unknown as LocationHideStatus);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Tick every minute to update countdown
  useEffect(() => {
    if (!status.is_hidden || status.remaining_seconds <= 0) return;
    const interval = window.setInterval(() => {
      setStatus((prev) => {
        if (!prev.is_hidden) return prev;
        const next = Math.max(0, prev.remaining_seconds - 60);
        return { ...prev, remaining_seconds: next, has_period: next > 0 };
      });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [status.is_hidden, status.remaining_seconds]);

  const purchase = useCallback(async () => {
    if (!user) return { success: false, error: 'Non connecté' };
    setActing(true);
    const { data, error } = await supabase.rpc('purchase_location_hide', { _user_id: user.id });
    setActing(false);
    if (error) return { success: false, error: error.message };
    const result = data as any;
    if (result?.success) await fetchStatus();
    return result;
  }, [user, fetchStatus]);

  const toggle = useCallback(async (hide: boolean) => {
    if (!user) return { success: false, error: 'Non connecté' };
    setActing(true);
    const { data, error } = await supabase.rpc('toggle_location_visibility', {
      _user_id: user.id,
      _hide: hide,
    });
    setActing(false);
    if (error) return { success: false, error: error.message };
    const result = data as any;
    if (result?.success) await fetchStatus();
    return result;
  }, [user, fetchStatus]);

  return { status, loading, acting, purchase, toggle, refetch: fetchStatus };
};
