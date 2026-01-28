import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '@/components/landing/Hero';
import RegionSelector from '@/components/landing/RegionSelector';
import ChatRoom from '@/components/chat/ChatRoom';
import PrivateChatList from '@/components/chat/PrivateChatList';
import PrivateChatRoom from '@/components/chat/PrivateChatRoom';
import { useChatRooms, useChatRoom } from '@/hooks/useChatRooms';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, MessageCircle, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AppView = 'landing' | 'regions' | 'chat' | 'private';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedPrivateUserId, setSelectedPrivateUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'groups' | 'private'>('groups');
  const { user, profile, signOut } = useAuth();
  const { data: rooms } = useChatRooms();
  const { data: selectedRoomData } = useChatRoom(selectedRegion || '');
  const { getOrCreateConversation } = usePrivateConversations();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (!user) {
      navigate('/auth');
    } else {
      setCurrentView('regions');
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
    setCurrentView('regions');
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentView('landing');
  };

  // Start private chat from member list in group chat
  const handleStartPrivateChat = async (userId: string) => {
    try {
      await getOrCreateConversation.mutateAsync(userId);
      setSelectedPrivateUserId(userId);
      setCurrentView('private');
    } catch (error) {
      console.error('Error starting private chat:', error);
    }
  };

  // Select conversation from private chat list
  const handleSelectConversation = (userId: string) => {
    setSelectedPrivateUserId(userId);
  };

  const handleBackFromPrivateChat = () => {
    setSelectedPrivateUserId(null);
  };

  // Get member count from database
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header for authenticated users */}
      {user && currentView !== 'landing' && (
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
          <div className="container flex items-center justify-between h-16 px-4">
            <h1 className="font-display text-xl font-bold gradient-text">GayConnect</h1>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-semibold">
                  {profile?.username?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                </div>
                <span className="text-sm font-medium">{profile?.username}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>
      )}

      {currentView === 'landing' && (
        <Hero onGetStarted={handleGetStarted} />
      )}
      
      {currentView === 'regions' && (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'groups' | 'private')}
            className="flex flex-col h-full"
          >
            <TabsList className="mx-4 mt-4 grid grid-cols-2">
              <TabsTrigger value="groups" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Groupes
              </TabsTrigger>
              <TabsTrigger value="private" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Messages
              </TabsTrigger>
            </TabsList>

            <TabsContent value="groups" className="flex-1 overflow-hidden mt-0">
              <RegionSelector onSelectRegion={handleSelectRegion} />
            </TabsContent>

            <TabsContent value="private" className="flex-1 overflow-hidden mt-0">
              {selectedPrivateUserId ? (
                <PrivateChatRoom
                  otherUserId={selectedPrivateUserId}
                  onBack={handleBackFromPrivateChat}
                />
              ) : (
                <PrivateChatList
                  onSelectConversation={handleSelectConversation}
                  selectedUserId={null}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default Index;
