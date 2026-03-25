import { ReactNode, createContext, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBlockedStatus } from '@/hooks/useBlockedStatus';
import { Loader2 } from 'lucide-react';

interface BlockedUserContextType {
  isRestricted: boolean;
  isBlocked: boolean;
  isSuspendedByAI: boolean;
  blockInfo: any;
}

const BlockedUserContext = createContext<BlockedUserContextType>({
  isRestricted: false,
  isBlocked: false,
  isSuspendedByAI: false,
  blockInfo: null,
});

export const useBlockedUserContext = () => useContext(BlockedUserContext);

interface BlockedUserGuardProps {
  children: ReactNode;
}

const BlockedUserGuard = ({ children }: BlockedUserGuardProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isBlocked, blockInfo, isLoading: blockLoading, isSuspendedByAI } = useBlockedStatus();

  if (!user) {
    return <>{children}</>;
  }

  if (authLoading || blockLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isRestricted = isBlocked || isSuspendedByAI;

  return (
    <BlockedUserContext.Provider value={{ isRestricted, isBlocked, isSuspendedByAI, blockInfo }}>
      {children}
    </BlockedUserContext.Provider>
  );
};

export default BlockedUserGuard;
