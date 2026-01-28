import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBlockedStatus } from '@/hooks/useBlockedStatus';
import BlockedUserScreen from './BlockedUserScreen';
import { Loader2 } from 'lucide-react';

interface BlockedUserGuardProps {
  children: ReactNode;
}

const BlockedUserGuard = ({ children }: BlockedUserGuardProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isBlocked, blockInfo, isLoading: blockLoading } = useBlockedStatus();

  // Don't check if not logged in
  if (!user) {
    return <>{children}</>;
  }

  // Show loading while checking block status
  if (authLoading || blockLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show blocked screen if user is blocked
  if (isBlocked) {
    return (
      <BlockedUserScreen
        reason={blockInfo?.reason}
        blockedAt={blockInfo?.blocked_at}
      />
    );
  }

  return <>{children}</>;
};

export default BlockedUserGuard;
