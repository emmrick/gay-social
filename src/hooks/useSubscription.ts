import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubscriptionStatus {
  subscribed: boolean;
  isPremium: boolean;
  isVip: boolean;
  productId: string | null;
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
  maxSavedMessages: 1,
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

// Cache to avoid repeated calls
const subscriptionCache = new Map<string, { status: Omit<SubscriptionStatus, 'isLoading'>; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export const useSubscription = () => {
  const { user, profile } = useAuth();
  const lastCheckRef = useRef<number>(0);
  
  // Initialize with profile data immediately (is_premium is synced via Stripe webhook)
  const [status, setStatus] = useState<SubscriptionStatus>(() => {
    // Check cache first
    if (user) {
      const cached = subscriptionCache.get(user.id);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return { ...cached.status, isLoading: false };
      }
    }
    
    return {
      subscribed: profile?.is_premium || false,
      isPremium: profile?.is_premium || false,
      isVip: false,
      productId: null,
      subscriptionEnd: null,
      isLoading: true,
      isAdmin: false,
    };
  });

  // Update immediately when profile changes (webhook sync)
  useEffect(() => {
    if (profile) {
      setStatus(prev => ({
        ...prev,
        subscribed: profile.is_premium || prev.subscribed,
        isPremium: profile.is_premium || prev.isPremium,
      }));
    }
  }, [profile?.is_premium]);

  const checkSubscription = useCallback(async (force = false) => {
    if (!user) {
      setStatus({
        subscribed: false,
        isPremium: false,
        isVip: false,
        productId: null,
        subscriptionEnd: null,
        isLoading: false,
        isAdmin: false,
      });
      return;
    }

    // Throttle: don't check more than once per 10 seconds unless forced
    const now = Date.now();
    if (!force && now - lastCheckRef.current < 10000) {
      return;
    }
    lastCheckRef.current = now;

    // Check cache
    const cached = subscriptionCache.get(user.id);
    if (!force && cached && now - cached.timestamp < CACHE_DURATION) {
      setStatus({ ...cached.status, isLoading: false });
      return;
    }

    try {
      // Check admin status first (fast, from DB)
      const adminResult = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      const isAdmin = adminResult.data === true;

      // If admin, set premium immediately without calling Stripe
      if (isAdmin) {
        const adminStatus = {
          subscribed: true,
          isPremium: true,
          isVip: true,
          productId: null,
          subscriptionEnd: null,
          isAdmin: true,
        };
        subscriptionCache.set(user.id, { status: adminStatus, timestamp: now });
        setStatus({ ...adminStatus, isLoading: false });
        return;
      }

      // For non-admins, use profile.is_premium as initial, then verify with Stripe in background
      if (profile?.is_premium) {
        setStatus(prev => ({ ...prev, isPremium: true, isLoading: false }));
      }

      // Check Stripe subscription (can be slower)
      const subscriptionResult = await supabase.functions.invoke('check-subscription');
      const subscriptionData = subscriptionResult.data;

      const isVip = subscriptionData?.is_vip || false;
      const isPremium = isVip || subscriptionData?.is_premium || profile?.is_premium || false;

      const newStatus = {
        subscribed: subscriptionData?.subscribed || false,
        isPremium,
        isVip,
        productId: subscriptionData?.product_id || null,
        subscriptionEnd: subscriptionData?.subscription_end || null,
        isAdmin: false,
      };

      subscriptionCache.set(user.id, { status: newStatus, timestamp: now });
      setStatus({ ...newStatus, isLoading: false });
    } catch (error) {
      console.error('Error checking subscription:', error);
      // On error, still use profile.is_premium
      setStatus(prev => ({ 
        ...prev, 
        isPremium: profile?.is_premium || prev.isPremium,
        isLoading: false 
      }));
    }
  }, [user, profile?.is_premium]);

  useEffect(() => {
    checkSubscription();
    
    // Refresh every 2 minutes (not every minute to reduce load)
    const interval = setInterval(() => checkSubscription(), 120000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const startCheckout = async (tier: 'premium' | 'vip' = 'premium', promoCode?: string) => {
    if (!user) {
      toast.error('Veuillez vous connecter pour souscrire');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier, promoCode: promoCode || undefined },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Erreur lors de la création du paiement');
    }
  };

  const validatePromoCode = async (code: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-promo-codes', {
        body: { action: 'validate', code },
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error validating promo code:', error);
      return { valid: false, message: 'Erreur lors de la validation' };
    }
  };

  const openCustomerPortal = async () => {
    if (!user) {
      toast.error('Veuillez vous connecter');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Erreur lors de l\'ouverture du portail');
    }
  };

  const getLimits = () => {
    return status.isPremium ? PREMIUM_LIMITS : FREE_LIMITS;
  };

  return {
    ...status,
    checkSubscription,
    startCheckout,
    openCustomerPortal,
    getLimits,
    validatePromoCode,
  };
};
