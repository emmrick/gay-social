import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import TweenFeed from '@/components/tween/TweenFeed';
import SEOHead from '@/components/seo/SEOHead';

const TweenPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <>
      <SEOHead
        title="Tween - Gay Social"
        description="Partagez vos pensées, photos et vidéos avec la communauté Gay Social. Découvrez le fil d'actualité Tween."
      />
      <div className="h-dvh h-screen bg-background flex flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">Tween</h1>
              <p className="text-xs text-muted-foreground">Fil d'actualité</p>
            </div>
          </div>
        </header>

        {/* Feed */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-3 py-4 pb-8">
            <TweenFeed />
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default TweenPage;
