import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIdentityVerification } from '@/hooks/useIdentityVerification';

const VERIFICATION_DEADLINE_HOURS = 0;

export interface VerificationDeadlineStatus {
  isDeadlinePassed: boolean;
  hoursRemaining: number | null;
  minutesRemaining: number | null;
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
      return {
        isDeadlinePassed: true, // Treat as deadline passed to show verification screen
        hoursRemaining: 0,
        minutesRemaining: 0,
        isVerificationComplete: false,
        isVerificationPending: false,
        isVerificationRejected: true,
        canAccessApp: false, // Block access until they retry
        deadlineDate: null,
        isLoading: false,
      };
    }

    // Calculate deadline from account creation
    const createdAt = new Date(profile.created_at);
    const deadlineDate = new Date(createdAt.getTime() + VERIFICATION_DEADLINE_HOURS * 60 * 60 * 1000);
    const now = new Date();
    const timeDiff = deadlineDate.getTime() - now.getTime();
    
    const isDeadlinePassed = timeDiff <= 0;
    const hoursRemaining = isDeadlinePassed ? 0 : Math.floor(timeDiff / (1000 * 60 * 60));
    const minutesRemaining = isDeadlinePassed ? 0 : Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    return {
      isDeadlinePassed,
      hoursRemaining,
      minutesRemaining,
      isVerificationComplete: false,
      isVerificationPending: false,
      isVerificationRejected: false,
      canAccessApp: !isDeadlinePassed,
      deadlineDate,
      isLoading: false,
    };
  }, [profile, verification, isLoading]);
};
