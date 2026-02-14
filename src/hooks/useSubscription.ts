import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionStatus {
  subscribed: boolean;
  isPremium: boolean;
  subscriptionEnd: string | null;
  isLoading: boolean;
  isAdmin: boolean;
}

// Limites pour les utilisateurs gratuits
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

// Limites pour les utilisateurs premium
export const PREMIUM_LIMITS = {
  ephemeralMediaPerDay: Infinity,
  profilePhotosPerDay: Infinity,
  maxGroups: 101, // Tous les départements
  nearbyProfiles: Infinity,
  conversationsPerWeek: Infinity,
  maxAlbums: Infinity,
  maxSavedMessages: Infinity,
  maxPhotoSize: 500 * 1024 * 1024, // 500 MB
  maxVideoSize: 1024 * 1024 * 1024, // 1 GB
};

// Lien de paiement Revolut
export const REVOLUT_PAYMENT_LINK = 'https://checkout.revolut.com/pay/e6ca921f-2793-4867-b8f1-448cbfb39ad4';

export const useSubscription = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    isPremium: false,
    subscriptionEnd: null,
    isLoading: true,
    isAdmin: false,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setStatus({
        subscribed: false,
        isPremium: false,
        subscriptionEnd: null,
        isLoading: false,
        isAdmin: false,
      });
      return;
    }

    try {
      // Check subscription from local database and admin status in parallel
      const [subscriptionResult, adminResult] = await Promise.all([
        supabase.rpc('has_active_premium', { _user_id: user.id }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
      ]);

      const hasActiveSubscription = subscriptionResult.data === true;
      const isAdmin = adminResult.data === true;

      // Get subscription details if active
      let subscriptionEnd: string | null = null;
      if (hasActiveSubscription) {
        const { data: subData } = await supabase
          .from('premium_subscriptions')
          .select('expires_at')
          .eq('user_id', user.id)
          .single();
        
        if (subData) {
          subscriptionEnd = subData.expires_at;
        }
      }

      // Admin users get premium features by default
      const isPremium = isAdmin || hasActiveSubscription;

      setStatus({
        subscribed: hasActiveSubscription,
        isPremium,
        subscriptionEnd,
        isLoading: false,
        isAdmin,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
    
    // Refresh every 2 minutes instead of every minute
    const interval = setInterval(checkSubscription, 120000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  // Subscribe via Revolut link (opens in new tab)
  const startCheckout = async () => {
    window.open(REVOLUT_PAYMENT_LINK, '_blank');
  };

  const getLimits = () => {
    return status.isPremium ? PREMIUM_LIMITS : FREE_LIMITS;
  };

  return {
    ...status,
    checkSubscription,
    startCheckout,
    getLimits,
  };
};
