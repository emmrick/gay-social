import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIdentityVerification } from '@/hooks/useIdentityVerification';

const PURGE_AFTER_DAYS = 30;

export interface VerificationDeadlineStatus {
  isDeadlinePassed: boolean;
  hoursRemaining: number | null;
  minutesRemaining: number | null;
  daysUntilPurge: number | null;
  isVerificationComplete: boolean;
  isVerificationPending: boolean;
  isVerificationRejected: boolean;
  canAccessApp: boolean;
  deadlineDate: Date | null;
  isReVerification: boolean;
}

export const useVerificationDeadline = (): VerificationDeadlineStatus & { isLoading: boolean } => {
  const { profile } = useAuth();
  const { verification, isLoading } = useIdentityVerification();

  return useMemo(() => {
    // Default state while loading
    if (isLoading || !profile) {
      return {
        isDeadlinePassed: false,
        hoursRemaining: null,
        minutesRemaining: null,
        daysUntilPurge: null,
        isVerificationComplete: false,
        isVerificationPending: false,
        isVerificationRejected: false,
        canAccessApp: true,
        deadlineDate: null,
        isReVerification: false,
        isLoading: true,
      };
    }

    // Check if user was previously verified (re-verification scenario)
    const wasPreviouslyVerified = !!(profile as any).first_verified_at;

    // If verified, full access
    if (profile.is_verified || verification?.status === 'approved') {
      return {
        isDeadlinePassed: false,
        hoursRemaining: null,
        minutesRemaining: null,
        daysUntilPurge: null,
        isVerificationComplete: true,
        isVerificationPending: false,
        isVerificationRejected: false,
        canAccessApp: true,
        deadlineDate: null,
        isReVerification: false,
        isLoading: false,
      };
    }

    // If verification is pending (submitted and waiting for review)
    if (verification?.submitted_at && verification?.status === 'pending') {
      return {
        isDeadlinePassed: false,
        hoursRemaining: null,
        minutesRemaining: null,
        daysUntilPurge: null,
        isVerificationComplete: false,
        isVerificationPending: true,
        isVerificationRejected: false,
        canAccessApp: false,
        deadlineDate: null,
        isReVerification: wasPreviouslyVerified,
        isLoading: false,
      };
    }

    // RE-VERIFICATION: user was previously verified — NO purge countdown, 
    // but still require verification (with full app access)
    if (wasPreviouslyVerified) {
      if (verification?.status === 'rejected') {
        return {
          isDeadlinePassed: false,
          hoursRemaining: null,
          minutesRemaining: null,
          daysUntilPurge: null,
          isVerificationComplete: false,
          isVerificationPending: false,
          isVerificationRejected: true,
          canAccessApp: true, // Previously verified users keep access
          deadlineDate: null,
          isReVerification: true,
          isLoading: false,
        };
      }

      // Re-verification needed but not yet submitted — user keeps access
      return {
        isDeadlinePassed: false,
        hoursRemaining: null,
        minutesRemaining: null,
        daysUntilPurge: null,
        isVerificationComplete: false,
        isVerificationPending: false,
        isVerificationRejected: false,
        canAccessApp: true, // Previously verified users keep access
        deadlineDate: null,
        isReVerification: true,
        isLoading: false,
      };
    }

    // FIRST-TIME VERIFICATION: If verification was rejected - user must retry, block access
    if (verification?.status === 'rejected') {
      const createdAt = new Date(profile.created_at);
      const purgeDate = new Date(createdAt.getTime() + PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysUntilPurge = Math.max(0, Math.ceil((purgeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        isDeadlinePassed: true,
        hoursRemaining: 0,
        minutesRemaining: 0,
        daysUntilPurge,
        isVerificationComplete: false,
        isVerificationPending: false,
        isVerificationRejected: true,
        canAccessApp: false,
        deadlineDate: purgeDate,
        isReVerification: false,
        isLoading: false,
      };
    }

    // FIRST-TIME: Calculate deadline from account creation (0 hours grace = immediate block)
    const createdAt = new Date(profile.created_at);
    const deadlineDate = new Date(createdAt.getTime());
    const purgeDate = new Date(createdAt.getTime() + PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const timeDiff = deadlineDate.getTime() - now.getTime();
    const daysUntilPurge = Math.max(0, Math.ceil((purgeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const isDeadlinePassed = timeDiff <= 0;
    const hoursRemaining = isDeadlinePassed ? 0 : Math.floor(timeDiff / (1000 * 60 * 60));
    const minutesRemaining = isDeadlinePassed ? 0 : Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    return {
      isDeadlinePassed,
      hoursRemaining,
      minutesRemaining,
      daysUntilPurge,
      isVerificationComplete: false,
      isVerificationPending: false,
      isVerificationRejected: false,
      canAccessApp: !isDeadlinePassed,
      deadlineDate,
      isReVerification: false,
      isLoading: false,
    };
  }, [profile, verification, isLoading]);
};
