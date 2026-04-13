import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionStatus {
  isLoading: boolean;
  isAdmin: boolean;
}

// Limites utilisateurs
export const FREE_LIMITS = {
  ephemeralMediaPerDay: 1,
  profilePhotosPerDay: 10,
  maxGroups: 3,
  nearbyProfiles: 30,
  conversationsPerWeek: 10,
  maxAlbums: 1,
  maxSavedMessages: 20,
  maxPhotoSize: 20 * 1024 * 1024, // 20 MB
  maxVideoSize: 500 * 1024 * 1024, // 500 MB
};

export const useSubscription = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    isLoading: true,
    isAdmin: false,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setStatus({ isLoading: false, isAdmin: false });
      return;
    }

    try {
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      setStatus({ isLoading: false, isAdmin: data === true });
    } catch (error) {
      console.error('Error checking admin status:', error);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 120000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const getLimits = () => FREE_LIMITS;

  return {
    ...status,
    checkSubscription,
    getLimits,
  };
};
