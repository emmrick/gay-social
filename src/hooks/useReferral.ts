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
      
      // Get or create referral code via RPC
      const { data: code, error: codeError } = await supabase.rpc('get_or_create_referral_code', {
        _user_id: user.id,
      });
      
      if (codeError) throw codeError;

      // Get stats
      const { data: statsData } = await supabase
        .from('referral_codes')
        .select('total_referrals, successful_referrals')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get referrals
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('id, referred_user_id, status, referrer_reward_applied, created_at')
        .eq('referrer_user_id', user.id)
        .order('created_at', { ascending: false });

      // Get profiles for referred users
      const referredIds = (referralsData || []).map(r => r.referred_user_id);
      let referrals: { target_user_id: string; username: string; consecutive_payments: number; status: string; referrer_reward_applied: boolean; created_at: string; id: string; referred_user_id: string }[] = [];
      
      if (referredIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', referredIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]));
        referrals = (referralsData || []).map(r => ({
          ...r,
          target_user_id: r.referred_user_id,
          username: profileMap.get(r.referred_user_id) || 'Utilisateur',
          consecutive_payments: 0,
        }));
      }

      return {
        code: code as string,
        stats: {
          total_referrals: statsData?.total_referrals || 0,
          successful_referrals: statsData?.successful_referrals || 0,
        },
        referrals,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Check if current user was referred
  const { data: myReferralStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['my-referral-status', user?.id],
    queryFn: async (): Promise<MyReferralStatus | null> => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('referrals')
        .select('id, referrer_user_id, status, consecutive_payments, referred_reward_applied')
        .eq('referred_user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return { isReferred: false };

      // Get referrer username
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', data.referrer_user_id)
        .maybeSingle();

      return {
        isReferred: true,
        referrerUsername: referrerProfile?.username,
        consecutivePayments: data.consecutive_payments,
        rewardApplied: data.referred_reward_applied,
        status: data.status,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Validate a referral code using the secure database function
  const validateCode = useCallback(async (code: string) => {
    const { data, error } = await supabase.rpc('validate_referral_code', {
      _code: code.toUpperCase()
    });
    
    if (error) {
      return { valid: false, message: 'Erreur de validation' };
    }
    
    return data as { valid: boolean; message?: string; referrer_username?: string };
  }, []);

  // Register a referral after signup
  const registerReferral = useMutation({
    mutationFn: async ({ userId, referralCode }: { userId: string; referralCode: string }) => {
      const { data, error } = await supabase.rpc('register_referral', {
        _referred_user_id: userId,
        _referral_code: referralCode.toUpperCase(),
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
  const shareReferralLink = useCallback(async (rewardAmount?: number) => {
    if (!referralData?.code) {
      toast.error('Code de parrainage non disponible');
      return;
    }
    
    const reward = rewardAmount ?? 30;
    const link = `${window.location.origin}/auth?ref=${referralData.code}`;
    const shareData = {
      title: 'Rejoins GaySocial !',
      text: `Inscris-toi avec mon lien et gagne ${reward} crédits gratuits après vérification de ton identité !`,
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
