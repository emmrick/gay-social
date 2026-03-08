import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVerificationDeadline } from '@/hooks/useVerificationDeadline';
import VerificationRequiredScreen from './VerificationRequiredScreen';
import PendingApprovalScreen from './PendingApprovalScreen';

interface VerificationGuardProps {
  children: ReactNode;
}

const VerificationGuard = ({ children }: VerificationGuardProps) => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { canAccessApp, isLoading: verificationLoading, isVerificationPending } = useVerificationDeadline();

  // Don't check if not logged in - allow access to public pages
  if (!user) {
    return <>{children}</>;
  }

  // Still loading auth - render children to avoid blank flash
  if (authLoading) {
    return <>{children}</>;
  }

  // Profile not loaded yet - allow access while loading to avoid blocking
  // The profile will load shortly and if verification is needed, it will redirect
  if (!profile) {
    return <>{children}</>;
  }

  // Still loading verification status - render children to avoid blank flash
  if (verificationLoading) {
    return <>{children}</>;
  }

  // If verification is pending (submitted), show pending approval screen
  if (isVerificationPending) {
    return <PendingApprovalScreen />;
  }

  // If deadline passed or can't access, show verification screen
  if (!canAccessApp) {
    return <VerificationRequiredScreen />;
  }

  return <>{children}</>;
};

export default VerificationGuard;
