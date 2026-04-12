import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineMemberCount } from '@/hooks/useTotalMemberCount';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import UnifiedPageHeader from '@/components/layout/UnifiedPageHeader';
import HomeView from '@/components/home/HomeView';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: onlineCount } = useOnlineMemberCount();
  const { getOrCreateConversation } = usePrivateConversations();

  const handleStartPrivateChat = async (userId: string) => {
    try {
      await getOrCreateConversation.mutateAsync(userId);
      navigate(`/messages/${userId}`);
    } catch (error) {
      console.error('Error starting private chat:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <UnifiedPageHeader
        onNavigateToCredits={() => navigate('/credits')}
        onNavigateToProfile={() => navigate('/profile')}
        onlineCount={onlineCount}
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <HomeView
          onViewProfile={handleStartPrivateChat}
          onStartPrivateChat={handleStartPrivateChat}
        />
      </div>
    </div>
  );
};

export default HomePage;
