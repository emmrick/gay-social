import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UnifiedPageHeader from '@/components/layout/UnifiedPageHeader';
import { ScrollArea } from '@/components/ui/scroll-area';

const TweenFeed = lazy(() => import('@/components/tween/TweenFeed'));

const TweenPageRoute = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <UnifiedPageHeader
        onNavigateToCredits={() => navigate('/credits')}
        onNavigateToProfile={() => navigate('/profile')}
      />
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-4 pb-8">
          <Suspense fallback={<div className="flex-1 flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
            <TweenFeed />
          </Suspense>
        </div>
      </ScrollArea>
    </div>
  );
};

export default TweenPageRoute;
