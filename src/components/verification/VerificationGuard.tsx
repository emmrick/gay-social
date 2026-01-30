import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVerificationDeadline } from '@/hooks/useVerificationDeadline';
import VerificationRequiredScreen from './VerificationRequiredScreen';

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

  // Still loading auth - let parent Suspense handle skeleton
  if (authLoading) {
    return null;
  }

  // Profile not loaded yet - allow access while loading to avoid blocking
  // The profile will load shortly and if verification is needed, it will redirect
  if (!profile) {
    return <>{children}</>;
  }

  // Still loading verification status
  if (verificationLoading) {
    return null;
  }

  // If verification is pending (submitted), allow access
  if (isVerificationPending) {
    return <>{children}</>;
  }

  // If deadline passed or can't access, show verification screen
  if (!canAccessApp) {
    return <VerificationRequiredScreen />;
  }

  return <>{children}</>;
};

export default VerificationGuard;
