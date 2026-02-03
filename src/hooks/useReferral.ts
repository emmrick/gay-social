import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
}

interface Referral {
  id: string;
  referred_user_id: string;
  username: string;
  consecutive_payments: number;
  status: string;
  referrer_reward_applied: boolean;
  created_at: string;
}

interface MyReferralStatus {
  isReferred: boolean;
  referrerUsername?: string;
  consecutivePayments?: number;
  rewardApplied?: boolean;
  status?: string;
}

export const useReferral = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's referral code and stats
  const { data: referralData, isLoading: isLoadingCode } = useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase.functions.invoke('manage-referrals', {
        body: { action: 'get-code' }
      });
      
      if (error) throw error;
      return data as { code: string; stats: ReferralStats; referrals: Referral[] };
    },
    enabled: !!user
  });

  // Check if current user was referred
  const { data: myReferralStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['my-referral-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase.functions.invoke('manage-referrals', {
        body: { action: 'check-my-referral' }
      });
      
      if (error) throw error;
      return data as MyReferralStatus;
    },
    enabled: !!user
  });

  // Validate a referral code
  const validateCode = useCallback(async (code: string) => {
    const { data, error } = await supabase.functions.invoke('manage-referrals', {
      body: { action: 'validate-code', referralCode: code }
    });
    
    if (error) {
      return { valid: false, message: 'Erreur de validation' };
    }
    
    return data as { valid: boolean; message: string };
  }, []);

  // Register a referral after signup
  const registerReferral = useMutation({
    mutationFn: async ({ userId, referralCode }: { userId: string; referralCode: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-referrals', {
        body: { action: 'register-referral', userId, referralCode }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-referral-status'] });
    }
  });

  // Copy referral link to clipboard
  const copyReferralLink = useCallback(() => {
    if (!referralData?.code) {
      toast.error('Code de parrainage non disponible');
      return;
    }
    
    const link = `${window.location.origin}/auth?ref=${referralData.code}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien de parrainage copié !');
  }, [referralData?.code]);

  // Share via native share API
  const shareReferralLink = useCallback(async () => {
    if (!referralData?.code) {
      toast.error('Code de parrainage non disponible');
      return;
    }
    
    const link = `${window.location.origin}/auth?ref=${referralData.code}`;
    const shareData = {
      title: 'Rejoins GayConnect !',
      text: 'Inscris-toi avec mon lien et gagne 10 crédits gratuits après vérification de ton identité !',
      url: link
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled share
      }
    } else {
      copyReferralLink();
    }
  }, [referralData?.code, copyReferralLink]);

  return {
    referralCode: referralData?.code,
    stats: referralData?.stats,
    referrals: referralData?.referrals || [],
    myReferralStatus,
    isLoading: isLoadingCode || isLoadingStatus,
    validateCode,
    registerReferral,
    copyReferralLink,
    shareReferralLink
  };
};
