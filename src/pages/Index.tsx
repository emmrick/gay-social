import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '@/components/landing/Hero';
import RegionSelector from '@/components/landing/RegionSelector';
import HomeView from '@/components/home/HomeView';
import ChatRoom from '@/components/chat/ChatRoom';
import PrivateChatList from '@/components/chat/PrivateChatList';
import PrivateChatRoom from '@/components/chat/PrivateChatRoom';
import ProfileView from '@/components/profile/ProfileView';
import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useChatRoom } from '@/hooks/useChatRooms';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppView = 'landing' | 'home' | 'groups' | 'messages' | 'profile' | 'chat' | 'private';
type NavTab = 'home' | 'groups' | 'messages' | 'profile';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedPrivateUserId, setSelectedPrivateUserId] = useState<string | null>(null);
  const { user, profile, isLoading: authLoading, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: selectedRoomData } = useChatRoom(selectedRegion || '');
  const { getOrCreateConversation } = usePrivateConversations();
  const { getTotalUnreadCount, markAsRead } = useUnreadMessages();
  const navigate = useNavigate();

  // Redirect to home if user is logged in and on landing
  useEffect(() => {
    if (user && currentView === 'landing') {
      setCurrentView('home');
    } else if (!user && !authLoading && currentView !== 'landing') {
      setCurrentView('landing');
    }
  }, [user, authLoading, currentView]);

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const handleGetStarted = () => {
    if (!user) {
      navigate('/auth');
    } else {
      setCurrentView('home');
      setActiveTab('home');
    }
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'profile') {
      setCurrentView('profile');
    } else if (tab === 'messages') {
      setSelectedPrivateUserId(null);
      setCurrentView('messages');
    } else if (tab === 'groups') {
      setCurrentView('groups');
    } else {
      setCurrentView('home');
    }
  };

  const handleSelectRegion = (regionCode: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setSelectedRegion(regionCode);
    setCurrentView('chat');
  };

  const handleBackToRegions = () => {
    setSelectedRegion(null);
    setCurrentView('groups');
    setActiveTab('groups');
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentView('landing');
    setActiveTab('home');
  };

  const handleStartPrivateChat = async (userId: string) => {
    try {
      await getOrCreateConversation.mutateAsync(userId);
      setSelectedPrivateUserId(userId);
      setCurrentView('private');
      setActiveTab('messages');
    } catch (error) {
      console.error('Error starting private chat:', error);
    }
  };

  const handleSelectConversation = (userId: string) => {
    setSelectedPrivateUserId(userId);
    markAsRead.mutate(userId);
    setCurrentView('private');
  };

  const handleBackFromPrivateChat = () => {
    setSelectedPrivateUserId(null);
    setCurrentView('messages');
  };

  const getMemberCount = () => {
    if (!selectedRoomData) return 0;
    return 100;
  };

  // Render private chat view
  if (currentView === 'private' && selectedPrivateUserId) {
    return (
      <PrivateChatRoom
        otherUserId={selectedPrivateUserId}
        onBack={handleBackFromPrivateChat}
      />
    );
  }

  // Render group chat view
  if (currentView === 'chat' && selectedRegion && selectedRoomData) {
    return (
      <ChatRoom
        roomId={selectedRoomData.id}
        regionCode={selectedRegion}
        regionName={selectedRoomData.region_name}
        memberCount={getMemberCount()}
        onBack={handleBackToRegions}
        onStartPrivateChat={handleStartPrivateChat}
      />
    );
  }

  const showBottomNav = user && currentView !== 'landing' && currentView !== 'chat' && currentView !== 'private';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Content */}
      <main className={cn(
        "flex-1 flex flex-col",
        showBottomNav && "pb-20"
      )}>
        {/* Landing page */}
        {currentView === 'landing' && (
          <Hero onGetStarted={handleGetStarted} />
        )}
        
        {/* Home view */}
        {currentView === 'home' && user && (
          <ScrollArea className="flex-1">
            <HomeView
              onNavigateToGroups={() => handleTabChange('groups')}
              onNavigateToMessages={() => handleTabChange('messages')}
              onSelectRegion={handleSelectRegion}
            />
          </ScrollArea>
        )}

        {/* Groups view */}
        {currentView === 'groups' && (
          <ScrollArea className="flex-1">
            <div className="px-4 py-4">
              <h2 className="font-display text-xl font-bold text-foreground mb-1">Groupes</h2>
              <p className="text-sm text-muted-foreground">Choisis ta région pour discuter</p>
            </div>
            <RegionSelector onSelectRegion={handleSelectRegion} />
          </ScrollArea>
        )}

        {/* Messages view */}
        {currentView === 'messages' && (
          <div className="flex-1 flex flex-col animate-fade-in">
            <div className="px-4 py-4 border-b border-border/50">
              <h2 className="font-display text-xl font-bold text-foreground mb-1">Messages</h2>
              <p className="text-sm text-muted-foreground">Tes conversations privées</p>
            </div>
            <ScrollArea className="flex-1">
              <PrivateChatList
                onSelectConversation={handleSelectConversation}
                selectedUserId={null}
              />
            </ScrollArea>
          </div>
        )}

        {/* Profile view */}
        {currentView === 'profile' && user && (
          <ScrollArea className="flex-1">
            <ProfileView 
              onSignOut={handleSignOut}
              onNavigateToAdmin={() => navigate('/admin')}
              isAdmin={isAdmin}
            />
          </ScrollArea>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      {showBottomNav && (
        <BottomNavBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          unreadCount={getTotalUnreadCount()}
        />
      )}
    </div>
  );
};

export default Index;
