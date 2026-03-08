import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { memo } from 'react';
import Hero from '@/components/landing/Hero';
import HomeView from '@/components/home/HomeView';
import ChatRoom from '@/components/chat/ChatRoom';
import AnnouncementChannel from '@/components/chat/AnnouncementChannel';
import PrivateChatList from '@/components/chat/PrivateChatList';
import PrivateChatRoom from '@/components/chat/PrivateChatRoom';
import ProfileView from '@/components/profile/ProfileView';
import ChatBotConfigPage from '@/components/chatbot/ChatBotConfigPage';
import PremiumPage from '@/components/premium/PremiumPage';
import ReferralDialog from '@/components/premium/ReferralDialog';
import UnifiedPageHeader from '@/components/layout/UnifiedPageHeader';
import SwipePage from '@/components/swipe/SwipePage';
import BottomNavBar from '@/components/navigation/BottomNavBar';
import MemberSearch from '@/components/chat/MemberSearch';
import JoinedGroupsList from '@/components/chat/JoinedGroupsList';
import GroupPickerDialog from '@/components/chat/GroupPickerDialog';
import CreateGroupDialog from '@/components/chat/CreateGroupDialog';
import IdentityVerificationDialog from '@/components/verification/IdentityVerificationDialog';
import VerificationReminderBanner from '@/components/verification/VerificationReminderBanner';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import CreditBalanceCompact from '@/components/credits/CreditBalanceCompact';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import Help from '@/pages/Help';
import { useChatRoom } from '@/hooks/useChatRooms';
import { useAnnouncementChannel } from '@/hooks/useAnnouncementChannel';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useRegionMemberCount } from '@/hooks/useRegionMemberCounts';
import { useOnlineMemberCount } from '@/hooks/useTotalMemberCount';
import { useJoinedGroups } from '@/hooks/useJoinedGroups';
import { useIdentityVerification } from '@/hooks/useIdentityVerification';
import { useSubscription } from '@/hooks/useSubscription';
import { useRealtimeOnlineStatus } from '@/hooks/useRealtimeOnlineStatus';
import { usePersistedNavigation } from '@/hooks/usePersistedNavigation';
import { useNotificationRedirect } from '@/hooks/useNotificationRedirect';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, User, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type NavTab = 'home' | 'swipe' | 'messages' | 'premium' | 'help' | 'profile';

// Tab order for determining animation direction
const tabOrder: NavTab[] = ['home', 'swipe', 'messages', 'premium', 'help', 'profile'];

// Minimal animation variants - instant transitions
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
const fadeVariants = pageVariants;

const Index = () => {
  const { user, profile, isLoading: authLoading, signOut } = useAuth();
  
  // Use persisted navigation state
  const {
    currentView,
    activeTab,
    previousTab,
    selectedRegion,
    selectedPrivateUserId,
    setCurrentView,
    setActiveTab,
    setPreviousTab,
    setSelectedRegion,
    setSelectedPrivateUserId,
    resetNavigation,
  } = usePersistedNavigation(!!user, authLoading);

  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [messageSubTab, setMessageSubTab] = useState<'conversations' | 'groups' | 'archived'>('conversations');
  const { data: isAdmin } = useIsAdmin();
  const { data: isModerator } = useQuery({
    queryKey: ['is-moderator', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' });
      return data === true;
    },
    enabled: !!user?.id,
  });
  const { isPremium } = useSubscription();
  const { verification, isLoading: verificationLoading } = useIdentityVerification();
  const { data: selectedRoomData } = useChatRoom(selectedRegion === 'announcement' ? '' : (selectedRegion || ''));
  const { data: announcementChannel } = useAnnouncementChannel();
  const { total: memberCount } = useRegionMemberCount(selectedRegion || '');
  const { getOrCreateConversation } = usePrivateConversations();
  const { getTotalUnreadCount, markAsRead } = useUnreadMessages();
  const { joinedGroups, joinGroup, remainingSlots, maxGroups } = useJoinedGroups();
  const { data: onlineCount } = useOnlineMemberCount();
  const navigate = useNavigate();
  const location = useLocation();

  // Subscribe to real-time online status changes globally
  useRealtimeOnlineStatus();

  // Handle push notification redirects
  useNotificationRedirect();

  // Handle deep link to open private chat from navigation state
  useEffect(() => {
    const state = location.state as { openPrivateChat?: string } | null;
    if (state?.openPrivateChat && user) {
      const targetUserId = state.openPrivateChat;
      
      // Clear the state immediately to prevent re-triggering
      navigate('/', { replace: true, state: {} });
      
      // Ensure conversation exists and open the chat
      getOrCreateConversation.mutateAsync(targetUserId)
        .then(() => {
          setSelectedPrivateUserId(targetUserId);
          markAsRead.mutate(targetUserId);
          setCurrentView('private');
          setActiveTab('messages');
        })
        .catch((error) => {
          console.error('Error opening conversation:', error);
        });
    }
  }, [location.state, user, navigate, markAsRead, getOrCreateConversation]);

  // Calculate animation direction based on tab order
  const direction = useMemo(() => {
    const prevIndex = tabOrder.indexOf(previousTab);
    const currIndex = tabOrder.indexOf(activeTab);
    return currIndex > prevIndex ? 1 : -1;
  }, [previousTab, activeTab]);

  // Process pending referral code after signup
  useEffect(() => {
    if (user && !authLoading) {
      const pendingReferralCode = localStorage.getItem('pending_referral_code');
      if (pendingReferralCode) {
        // Clear it immediately to prevent duplicate processing
        localStorage.removeItem('pending_referral_code');
        
        // Register the referral
        import('@/integrations/supabase/client').then(({ supabase }) => {
          supabase.functions.invoke('manage-referrals', {
            body: { 
              action: 'register-referral', 
              userId: user.id, 
              referralCode: pendingReferralCode 
            }
          }).then(() => {
            console.log('Referral registered successfully');
          }).catch((err) => {
            console.error('Error registering referral:', err);
          });
        });
      }
    }
  }, [user, authLoading]);

  // Note: Navigation state persistence and auth-based redirects are now handled by usePersistedNavigation hook

  // Show verification dialog if user hasn't completed verification
  useEffect(() => {
    if (user && !verificationLoading && !verification?.submitted_at && verification?.status !== 'approved') {
      // Only show if the user is logged in and hasn't submitted verification yet
      const timer = setTimeout(() => {
        setShowVerificationDialog(true);
      }, 1000); // Small delay to not overwhelm the user
      return () => clearTimeout(timer);
    }
  }, [user, verification, verificationLoading]);

  // Skeleton already shown by parent Suspense, just return null briefly
  if (authLoading) {
    return null;
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
    if (tab === 'help') {
      setPreviousTab(activeTab);
      setActiveTab(tab);
      setCurrentView('help');
      return;
    }
    setPreviousTab(activeTab);
    setActiveTab(tab);
    if (tab === 'profile') {
      setCurrentView('profile');
    } else if (tab === 'messages') {
      setSelectedPrivateUserId(null);
      setCurrentView('messages');
    } else if (tab === 'premium') {
      setCurrentView('premium');
    } else if (tab === 'swipe') {
      setCurrentView('swipe');
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
    setCurrentView('messages');
    setActiveTab('messages');
    setMessageSubTab('groups');
  };

  const handleSignOut = async () => {
    await signOut();
    resetNavigation();
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


  // Render chatbot config view
  if (currentView === 'chatbot-config') {
    return (
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
        className="min-h-screen"
      >
        <ChatBotConfigPage onBack={() => {
          setCurrentView('profile');
          setActiveTab('profile');
        }} />
      </motion.div>
    );
  }

  // Render private chat view with slide animation
  if (currentView === 'private' && selectedPrivateUserId) {
    return (
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
        className="min-h-screen"
      >
        <PrivateChatRoom
          otherUserId={selectedPrivateUserId}
          onBack={handleBackFromPrivateChat}
        />
      </motion.div>
    );
  }

  // Render announcement channel
  if (currentView === 'chat' && selectedRegion === 'announcement' && announcementChannel) {
    return (
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
        className="min-h-screen"
      >
        <AnnouncementChannel
          roomId={announcementChannel.id}
          onBack={handleBackToRegions}
        />
      </motion.div>
    );
  }

  // Render group chat view with slide animation
  if (currentView === 'chat' && selectedRegion && selectedRoomData) {
    return (
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
        className="min-h-screen"
      >
        <ChatRoom
          roomId={selectedRoomData.id}
          regionCode={selectedRoomData.region_code}
          regionName={selectedRoomData.is_custom ? (selectedRoomData.custom_name || selectedRoomData.region_name) : selectedRoomData.region_name}
          memberCount={memberCount}
          isCustomGroup={selectedRoomData.is_custom}
          onBack={handleBackToRegions}
          onStartPrivateChat={handleStartPrivateChat}
        />
      </motion.div>
    );
  }

  const showBottomNav = user && currentView !== 'landing' && currentView !== 'chat' && currentView !== 'private';

  // Get current view content
  const renderContent = () => {
    switch (currentView) {
      case 'landing':
        return (
          <div
            key="landing"
            className="flex-1 min-h-0 overflow-y-auto"
          >
            <Hero onGetStarted={handleGetStarted} />
          </div>
        );
      
      case 'home':
        return user ? (
          <motion.div
            key="home"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Header */}
            <UnifiedPageHeader
              onNavigateToCredits={() => handleTabChange('premium')}
              onNavigateToProfile={() => handleTabChange('profile')}
              onlineCount={onlineCount}
            />
            <div className="flex-1 min-h-0 overflow-y-auto">
              <HomeView
                onViewProfile={(userId) => handleStartPrivateChat(userId)}
                onStartPrivateChat={handleStartPrivateChat}
              />
            </div>
          </motion.div>
        ) : null;

      case 'swipe':
        return user ? (
          <motion.div
            key="swipe"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0"
          >
            <UnifiedPageHeader
              onNavigateToCredits={() => handleTabChange('premium')}
              onNavigateToProfile={() => handleTabChange('profile')}
            />
            <SwipePage onStartChat={handleStartPrivateChat} />
          </motion.div>
        ) : null;

      case 'messages':
        return (
          <motion.div
            key="messages"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex-1 flex flex-col relative min-h-0"
          >
            <UnifiedPageHeader
              onNavigateToCredits={() => handleTabChange('premium')}
              onNavigateToProfile={() => handleTabChange('profile')}
              rightContent={
                messageSubTab === 'groups' ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      onClick={() => setShowCreateGroup(true)}
                      size="icon"
                      variant="outline"
                      className="rounded-full"
                      title="Créer un groupe"
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setShowGroupPicker(true)}
                      size="icon"
                      className="rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                      title="Rejoindre un groupe régional"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowMemberSearch(true)}
                    size="icon"
                    className="rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                )
              }
              bottomContent={
                <div className="px-5 pb-3">
                  <Tabs 
                    value={messageSubTab} 
                    onValueChange={(v) => setMessageSubTab(v as 'conversations' | 'groups' | 'archived')}
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="conversations">Messages</TabsTrigger>
                      <TabsTrigger value="groups" className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Groupes
                      </TabsTrigger>
                      <TabsTrigger value="archived">Archives</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              }
            />
            
            {/* Content based on sub-tab */}
            <ScrollArea className="flex-1 min-h-0">
              {messageSubTab === 'groups' ? (
                <JoinedGroupsList onSelectGroup={handleSelectRegion} />
              ) : (
                <PrivateChatList
                  onSelectConversation={handleSelectConversation}
                  selectedUserId={null}
                  showArchived={messageSubTab === 'archived'}
                />
              )}
            </ScrollArea>

            {/* Group picker dialog */}
            <GroupPickerDialog
              open={showGroupPicker}
              onOpenChange={setShowGroupPicker}
              onGroupJoined={handleSelectRegion}
            />

            {/* Create custom group dialog */}
            <CreateGroupDialog
              open={showCreateGroup}
              onOpenChange={setShowCreateGroup}
              onGroupCreated={(groupId) => {
                // Navigate to the custom group chat
                setSelectedRegion(groupId);
                setCurrentView('chat');
              }}
            />

            <AnimatePresence>
              {showMemberSearch && (
                <MemberSearch
                  onSelectUser={(userId) => {
                    handleStartPrivateChat(userId);
                    setShowMemberSearch(false);
                  }}
                  onClose={() => setShowMemberSearch(false)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        );

      case 'profile':
        return user ? (
          <motion.div
            key="profile"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0"
          >
            <UnifiedPageHeader
              onNavigateToCredits={() => handleTabChange('premium')}
              onNavigateToProfile={() => handleTabChange('profile')}
            />
            <ScrollArea className="flex-1 min-h-0">
              <ProfileView 
                onSignOut={handleSignOut}
                onNavigateToAdmin={() => navigate('/admin')}
                onNavigateToCredits={() => handleTabChange('premium')}
                onContactAdmin={() => {
                  setPreviousTab(activeTab);
                  setActiveTab('help');
                  setCurrentView('help');
                }}
                onNavigateToChatbot={() => setCurrentView('chatbot-config')}
                isAdmin={isAdmin}
                isModerator={isModerator}
              />
            </ScrollArea>
          </motion.div>
        ) : null;

      case 'premium':
        return user ? (
          <motion.div
            key="premium"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0"
          >
            <UnifiedPageHeader
              onNavigateToCredits={() => handleTabChange('premium')}
              onNavigateToProfile={() => handleTabChange('profile')}
              rightContent={<ReferralDialog />}
            />
            <ScrollArea className="flex-1 min-h-0">
              <PremiumPage onNavigateToSupport={() => {
                setPreviousTab(activeTab);
                setActiveTab('help');
                setCurrentView('help');
              }} />
            </ScrollArea>
          </motion.div>
        ) : null;

      case 'help':
        return user ? (
          <motion.div
            key="help"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex-1 flex flex-col min-h-0"
          >
            <Help embedded />
          </motion.div>
        ) : null;

      default:
        return null;
    }
  };

  const content = renderContent();

  return (
    <div 
      className="h-dvh h-screen bg-background flex flex-col overflow-hidden"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Verification Reminder Banner */}
      {user && currentView !== 'landing' && <VerificationReminderBanner />}
      
      {/* Content with AnimatePresence for transitions */}
      <main className={cn(
        "flex-1 flex flex-col overflow-hidden",
        showBottomNav && "pb-24"
      )}
      style={{
        paddingBottom: showBottomNav ? 'calc(96px + env(safe-area-inset-bottom, 0px))' : undefined,
      }}
      >
        <AnimatePresence mode="popLayout">
          {content ?? (
            <motion.div
              key="fallback"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar */}
      {showBottomNav && (
        <BottomNavBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          unreadCount={getTotalUnreadCount()}
          isPremium={isPremium}
        />
      )}

      {/* Identity Verification Dialog */}
      {showVerificationDialog && (
        <IdentityVerificationDialog
          open={showVerificationDialog}
          onOpenChange={setShowVerificationDialog}
        />
      )}
    </div>
  );
};

export default Index;
