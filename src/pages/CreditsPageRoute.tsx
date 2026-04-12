import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlags } from '@/hooks/useFeatureToggles';
import UnifiedPageHeader from '@/components/layout/UnifiedPageHeader';
import { ScrollArea } from '@/components/ui/scroll-area';

const CreditsPage = lazy(() => import('@/components/credits/CreditsPage'));
const ReferralDialog = lazy(() => import('@/components/premium/ReferralDialog'));

const CreditsPageRoute = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const featureFlags = useFeatureFlags();

  if (!user || featureFlags['credits_page'] === false) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <UnifiedPageHeader
        onNavigateToCredits={() => {}}
        onNavigateToProfile={() => navigate('/profile')}
        rightContent={<Suspense fallback={null}><ReferralDialog /></Suspense>}
      />
      <ScrollArea className="flex-1 min-h-0">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
          <CreditsPage />
        </Suspense>
      </ScrollArea>
    </div>
  );
};

export default CreditsPageRoute;
