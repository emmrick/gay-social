import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useFeatureFlags } from '@/hooks/useFeatureToggles';
import UnifiedPageHeader from '@/components/layout/UnifiedPageHeader';

const SwipePage = lazy(() => import('@/components/swipe/SwipePage'));

const SwipePageRoute = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const featureFlags = useFeatureFlags();
  const { getOrCreateConversation } = usePrivateConversations();

  const handleStartChat = async (userId: string) => {
    try {
      await getOrCreateConversation.mutateAsync(userId);
      navigate(`/messages/${userId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  if (!user || featureFlags['swipe_page'] === false) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <UnifiedPageHeader
        onNavigateToCredits={() => navigate('/credits')}
        onNavigateToProfile={() => navigate('/profile')}
      />
      <Suspense fallback={null}>
        <SwipePage onStartChat={handleStartChat} />
      </Suspense>
    </div>
  );
};

export default SwipePageRoute;
