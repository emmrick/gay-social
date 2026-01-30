import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubscriptionStatus {
  subscribed: boolean;
  isPremium: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  isLoading: boolean;
  isAdmin: boolean;
}

// Limites pour les utilisateurs gratuits
export const FREE_LIMITS = {
  ephemeralMediaPerWeek: 1,
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
  ephemeralMediaPerWeek: Infinity,
  profilePhotosPerDay: Infinity,
  maxGroups: 101, // Tous les départements
  nearbyProfiles: Infinity,
  conversationsPerWeek: Infinity,
  maxAlbums: Infinity,
  maxSavedMessages: Infinity,
  maxPhotoSize: 500 * 1024 * 1024, // 500 MB
  maxVideoSize: 1024 * 1024 * 1024, // 1 GB
};

export const useSubscription = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    isPremium: false,
    productId: null,
    subscriptionEnd: null,
    isLoading: true,
    isAdmin: false,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setStatus({
        subscribed: false,
        isPremium: false,
        productId: null,
        subscriptionEnd: null,
        isLoading: false,
        isAdmin: false,
      });
      return;
    }

    try {
      // Check both subscription and admin status in parallel
      const [subscriptionResult, adminResult] = await Promise.all([
        supabase.functions.invoke('check-subscription'),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
      ]);

      const subscriptionData = subscriptionResult.data;
      const isAdmin = adminResult.data === true;

      // Admin users get premium features by default
      const isPremium = isAdmin || subscriptionData?.is_premium || false;

      setStatus({
        subscribed: subscriptionData?.subscribed || false,
        isPremium,
        productId: subscriptionData?.product_id || null,
        subscriptionEnd: subscriptionData?.subscription_end || null,
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
    
    // Refresh every minute
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const startCheckout = async (promoCode?: string) => {
    if (!user) {
      toast.error('Veuillez vous connecter pour souscrire');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: promoCode ? { promoCode } : undefined,
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
