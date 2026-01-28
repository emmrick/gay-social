import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '@/components/landing/Hero';
import RegionSelector from '@/components/landing/RegionSelector';
import HomeView from '@/components/home/HomeView';
import ChatRoom from '@/components/chat/ChatRoom';
import PrivateChatList from '@/components/chat/PrivateChatList';
import PrivateChatRoom from '@/components/chat/PrivateChatRoom';
import ProfileEditDialog from '@/components/profile/ProfileEditDialog';
import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useChatRoom } from '@/hooks/useChatRooms';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { LogOut, Shield, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppView = 'landing' | 'home' | 'groups' | 'messages' | 'profile' | 'chat' | 'private';
type NavTab = 'home' | 'groups' | 'messages' | 'profile';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedPrivateUserId, setSelectedPrivateUserId] = useState<string | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: selectedRoomData } = useChatRoom(selectedRegion || '');
  const { getOrCreateConversation } = usePrivateConversations();
  const { getTotalUnreadCount, markAsRead } = useUnreadMessages();
  const navigate = useNavigate();

  // Redirect to home if user is logged in and on landing
  useEffect(() => {
    if (user && currentView === 'landing') {
      setCurrentView('home');
    }
  }, [user, currentView]);

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
      setShowProfileEdit(true);
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
  const showHeader = user && currentView !== 'landing';

  // Get page title based on current view
  const getPageTitle = () => {
    switch (currentView) {
      case 'home': return 'Accueil';
      case 'groups': return 'Groupes';
      case 'messages': return 'Messages';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header for authenticated users */}
      {showHeader && (
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between h-14 px-4">
            {/* Left side */}
            <div className="flex items-center gap-3">
              <h1 className="font-display text-lg font-bold gradient-text">
                GayConnect
              </h1>
            </div>
            
            {/* Right side */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/admin')}
                  className="gap-1.5 text-xs h-8"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut}
                className="h-8 w-8"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* Profile Edit Dialog */}
      <ProfileEditDialog open={showProfileEdit} onOpenChange={setShowProfileEdit} />

      {/* Content with smooth transitions */}
      <main className={cn(
        "transition-opacity duration-200",
        showBottomNav && "pb-20"
      )}>
        {/* Landing page */}
        {currentView === 'landing' && (
          <Hero onGetStarted={handleGetStarted} />
        )}
        
        {/* Home view */}
        {currentView === 'home' && user && (
          <HomeView
            onNavigateToGroups={() => handleTabChange('groups')}
            onNavigateToMessages={() => handleTabChange('messages')}
            onSelectRegion={handleSelectRegion}
          />
        )}

        {/* Groups view */}
        {currentView === 'groups' && (
          <RegionSelector onSelectRegion={handleSelectRegion} />
        )}

        {/* Messages view */}
        {currentView === 'messages' && (
          <div className="animate-fade-in">
            <div className="px-4 py-4">
              <h2 className="font-display text-xl font-bold text-foreground mb-1">Messages</h2>
              <p className="text-sm text-muted-foreground">Tes conversations privées</p>
            </div>
            <PrivateChatList
              onSelectConversation={handleSelectConversation}
              selectedUserId={null}
            />
          </div>
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
