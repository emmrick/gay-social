import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface CoupleAccount {
  id: string;
  owner_user_id: string;
  partner_user_id: string | null;
  invite_code: string;
  share_conversations: boolean;
  status: string;
}

interface ActiveProfileContextType {
  activeProfile: Profile | null;
  coupleAccount: CoupleAccount | null;
  partnerProfile: Profile | null;
  isCouple: boolean;
  isSwitching: boolean;
  showProfileSelector: boolean;
  setShowProfileSelector: (show: boolean) => void;
  switchToProfile: (userId: string) => Promise<void>;
  activeUserId: string | null;
  refetchCouple: () => Promise<void>;
}

const ActiveProfileContext = createContext<ActiveProfileContextType | undefined>(undefined);

export const useActiveProfile = () => {
  const context = useContext(ActiveProfileContext);
  if (!context) {
    throw new Error('useActiveProfile must be used within an ActiveProfileProvider');
  }
  return context;
};

export const ActiveProfileProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [coupleAccount, setCoupleAccount] = useState<CoupleAccount | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showProfileSelector, setShowProfileSelector] = useState(false);

  const isCouple = !!coupleAccount && coupleAccount.status === 'active' && !!coupleAccount.partner_user_id;

  const fetchCoupleData = useCallback(async () => {
    if (!user?.id) return;

    // Fetch couple account where user is owner or partner
    const { data: couple } = await supabase
      .from('couple_accounts')
      .select('*')
      .or(`owner_user_id.eq.${user.id},partner_user_id.eq.${user.id}`)
      .eq('status', 'active')
      .maybeSingle();

    if (couple) {
      setCoupleAccount(couple as CoupleAccount);

      // Fetch partner profile
      const partnerId = couple.owner_user_id === user.id
        ? couple.partner_user_id
        : couple.owner_user_id;

      if (partnerId) {
        // Couple partners have legitimate access to each other's full profile
        const { data: partnerRows } = await supabase.rpc('get_couple_partner_profile');
        const partner = Array.isArray(partnerRows) ? partnerRows[0] : partnerRows;
        setPartnerProfile(partner ?? null);
      }
    } else {
      setCoupleAccount(null);
      setPartnerProfile(null);
    }
  }, [user?.id]);

  // Initialize active profile
  useEffect(() => {
    if (!user?.id) {
      setActiveUserId(null);
      setActiveProfile(null);
      setCoupleAccount(null);
      setPartnerProfile(null);
      return;
    }

    // Restore from session storage or default to own profile
    const stored = sessionStorage.getItem('gc_active_profile');
    setActiveUserId(stored || user.id);
    fetchCoupleData();
  }, [user?.id, fetchCoupleData]);

  // Update active profile when switching or when profile data changes
  useEffect(() => {
    if (!activeUserId || !user?.id) {
      setActiveProfile(null);
      return;
    }

    if (activeUserId === user.id) {
      setActiveProfile(profile);
    } else if (partnerProfile && activeUserId === partnerProfile.user_id) {
      setActiveProfile(partnerProfile);
    }
  }, [activeUserId, user?.id, profile, partnerProfile]);

  // Show profile selector on login if couple
  useEffect(() => {
    if (isCouple && !sessionStorage.getItem('gc_profile_selected')) {
      setShowProfileSelector(true);
    }
  }, [isCouple]);

  const switchToProfile = useCallback(async (userId: string) => {
    if (!user?.id || !coupleAccount) return;

    // Validate user is part of the couple
    if (userId !== coupleAccount.owner_user_id && userId !== coupleAccount.partner_user_id) return;

    setIsSwitching(true);
    try {
      sessionStorage.setItem('gc_active_profile', userId);
      sessionStorage.setItem('gc_profile_selected', 'true');
      setActiveUserId(userId);

      // Log activity
      await supabase.from('couple_activity_log').insert({
        couple_account_id: coupleAccount.id,
        user_id: user.id, // The actual auth user
        action: 'profile_switch',
        description: `Basculé vers le profil ${userId === user.id ? 'principal' : 'partenaire'}`,
      });
    } finally {
      setIsSwitching(false);
      setShowProfileSelector(false);
    }
  }, [user?.id, coupleAccount]);

  const refetchCouple = useCallback(async () => {
    await fetchCoupleData();
  }, [fetchCoupleData]);

  return (
    <ActiveProfileContext.Provider value={{
      activeProfile,
      coupleAccount,
      partnerProfile,
      isCouple,
      isSwitching,
      showProfileSelector,
      setShowProfileSelector,
      switchToProfile,
      activeUserId,
      refetchCouple,
    }}>
      {children}
    </ActiveProfileContext.Provider>
  );
};
