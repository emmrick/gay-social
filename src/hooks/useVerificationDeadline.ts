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
        isLoading: true,
      };
    }

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
        canAccessApp: true,
        deadlineDate: null,
        isLoading: false,
      };
    }

    // If verification was rejected - user must retry, block access
    if (verification?.status === 'rejected') {
      // Still calculate days until purge for rejected users
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
        isLoading: false,
      };
    }

    // Calculate deadline from account creation (0 hours grace = immediate block)
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
      isLoading: false,
    };
  }, [profile, verification, isLoading]);
};