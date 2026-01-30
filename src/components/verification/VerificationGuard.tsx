import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVerificationDeadline } from '@/hooks/useVerificationDeadline';
import VerificationRequiredScreen from './VerificationRequiredScreen';
import { Loader2 } from 'lucide-react';

interface VerificationGuardProps {
  children: ReactNode;
}

const VerificationGuard = ({ children }: VerificationGuardProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const { canAccessApp, isLoading: verificationLoading, isVerificationPending } = useVerificationDeadline();

  // Don't check if not logged in
  if (!user) {
    return <>{children}</>;
  }

  // Show nothing while checking - parent Suspense handles the skeleton
  if (authLoading || verificationLoading) {
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
