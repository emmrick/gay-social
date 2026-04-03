import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useBlockedUserContext } from '@/components/BlockedUserGuard';
import SuspensionBanner from '@/components/moderation/SuspensionBanner';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import Hero from '@/components/landing/Hero';
import HomeView from '@/components/home/HomeView';
import UnifiedPageHeader from '@/components/layout/UnifiedPageHeader';
import BottomNavBar from '@/components/navigation/BottomNavBar';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import CreditBalanceCompact from '@/components/credits/CreditBalanceCompact';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
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
import { useFeatureFlags } from '@/hooks/useFeatureToggles';
import AdBanner from '@/components/ads/AdBanner';

// Lazy-load heavy sub-views to reduce initial JS bundle
const ChatRoom = lazy(() => import('@/components/chat/ChatRoom'));
const AnnouncementChannel = lazy(() => import('@/components/chat/AnnouncementChannel'));
const PrivateChatList = lazy(() => import('@/components/chat/PrivateChatList'));
const PrivateChatRoom = lazy(() => import('@/components/chat/PrivateChatRoom'));
const ProfileView = lazy(() => import('@/components/profile/ProfileView'));
const ChatBotConfigPage = lazy(() => import('@/components/chatbot/ChatBotConfigPage'));
const CreditsPage = lazy(() => import('@/components/credits/CreditsPage'));
const ReferralDialog = lazy(() => import('@/components/premium/ReferralDialog'));
const SwipePage = lazy(() => import('@/components/swipe/SwipePage'));
const MemberSearch = lazy(() => import('@/components/chat/MemberSearch'));
const JoinedGroupsList = lazy(() => import('@/components/chat/JoinedGroupsList'));
const GroupPickerDialog = lazy(() => import('@/components/chat/GroupPickerDialog'));
const CreateGroupDialog = lazy(() => import('@/components/chat/CreateGroupDialog'));
const IdentityVerificationDialog = lazy(() => import('@/components/verification/IdentityVerificationDialog'));
const VerificationReminderBanner = lazy(() => import('@/components/verification/VerificationReminderBanner'));
const Help = lazy(() => import('@/pages/Help'));
const TweenFeed = lazy(() => import('@/components/tween/TweenFeed'));

type NavTab = 'home' | 'swipe' | 'messages' | 'tween' | 'premium' | 'help' | 'profile';

const LazyFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-screen">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

// Slide animation only for sub-views (chat, private)
const slideIn = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
  transition: { type: 'tween' as const, duration: 0.15, ease: 'easeOut' as const },
};

const Index = () => {
  const { user, profile, isLoading: authLoading, signOut } = useAuth();
  const { isRestricted } = useBlockedUserContext();
  
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
  const [openEditProfile, setOpenEditProfile] = useState(false);
  const [messageSubTab, setMessageSubTab] = useState<'conversations' | 'groups' | 'archived'>('conversations');
  const [openSnapOnEnter, setOpenSnapOnEnter] = useState(false);
  const { data: isAdmin } = useIsAdmin();
  const featureFlags = useFeatureFlags();
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

  // Handle query params from notification clicks (e.g. /?tab=profile&showVerification=true)
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab') as NavTab | null;
    const showVerif = params.get('showVerification');
    const editProfile = params.get('editProfile');
    
    if (tabParam || showVerif || editProfile) {
      // Clean URL
      window.history.replaceState({}, '', '/');
      
      if (tabParam) {
        handleTabChange(tabParam);
      }
      if (showVerif === 'true') {
        setShowVerificationDialog(true);
      }
      if (editProfile === 'true') {
        setOpenEditProfile(true);
      }
    }
  }, [location.search, user]);

  // Handle OTP interruption link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const interruptToken = params.get('interrupt');
    if (interruptToken) {
      // Clean URL
      window.history.replaceState({}, '', '/');
      // Call interrupt endpoint (no auth required - public action from SMS)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      fetch(`${supabaseUrl}/functions/v1/send-otp-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({ action: 'interrupt', interrupt_token: interruptToken }),
      }).then(res => res.json()).then((data) => {
        if (data?.interrupted) {
          import('sonner').then(({ toast }) => {
            toast.success('Accès à votre dossier interrompu avec succès. Un conseiller supérieur sera assigné.');
          });
        }
      }).catch(console.error);
    }
  }, []);

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

  // Global back handler: routes hardware back button through internal navigation
  const handleGlobalBack = useCallback(() => {
    if (currentView === 'private') {
      setSelectedPrivateUserId(null);
      setCurrentView('messages');
      return;
    }
    if (currentView === 'chat') {
      setSelectedRegion(null);
      setCurrentView('messages');
      setActiveTab('messages');
      setMessageSubTab('groups');
      return;
    }
    if (currentView === 'chatbot-config') {
      setCurrentView('profile');
      setActiveTab('profile');
      return;
    }
    if (activeTab !== 'home' && currentView !== 'landing') {
      setPreviousTab(activeTab);
      setActiveTab('home');
      setCurrentView('home');
      return;
    }
    // On home/landing → do nothing (don't exit app)
  }, [currentView, activeTab, setCurrentView, setActiveTab, setPreviousTab, setSelectedRegion, setSelectedPrivateUserId]);

  // Intercept hardware back button globally
  useMobileNavigation({ 
    onBack: handleGlobalBack, 
    enabled: !!user && currentView !== 'landing',
    enableSwipeBack: currentView === 'private' || currentView === 'chat' || currentView === 'chatbot-config',
  });

  // Force restricted users to profile view
  useEffect(() => {
    if (isRestricted && user && currentView !== 'profile' && currentView !== 'help') {
      setActiveTab('profile');
      setCurrentView('profile');
    }
  }, [isRestricted, user, currentView]);

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
    // Restricted users can only access profile and help
    if (isRestricted && tab !== 'profile' && tab !== 'help') {
      return;
    }
    if (tab === 'tween') {
      setPreviousTab(activeTab);
      setActiveTab(tab);
      setCurrentView('tween');
      return;
    }
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


  const handleSelectConversation = (userId: string, hasPendingSnap?: boolean) => {
    setSelectedPrivateUserId(userId);
    setOpenSnapOnEnter(!!hasPendingSnap);
    markAsRead.mutate(userId);
    setCurrentView('private');
  };

  const handleBackFromPrivateChat = () => {
    setSelectedPrivateUserId(null);
    setCurrentView('messages');
  };


  // Render chatbot config view
  if (currentView === 'chatbot-config' && featureFlags['personal_chatbot'] !== false) {
    return (
      <Suspense fallback={<LazyFallback />}>
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
      </Suspense>
    );
  }

  // Render private chat view with slide animation
  if (currentView === 'private' && selectedPrivateUserId) {
    return (
      <Suspense fallback={<LazyFallback />}>
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
            autoOpenSnap={openSnapOnEnter}
            onSnapOpened={() => setOpenSnapOnEnter(false)}
          />
        </motion.div>
      </Suspense>
    );
  }

  // Render announcement channel
  if (currentView === 'chat' && selectedRegion === 'announcement' && announcementChannel) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
          className="min-h-screen w-full overflow-hidden"
        >
          <AnnouncementChannel
            roomId={announcementChannel.id}
            onBack={handleBackToRegions}
          />
        </motion.div>
      </Suspense>
    );
  }

  // Render group chat view with slide animation
  if (currentView === 'chat' && selectedRegion && selectedRoomData) {
    return (
      <Suspense fallback={<LazyFallback />}>
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
      </Suspense>
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
          <div className="flex-1 flex flex-col min-h-0">
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
          </div>
        ) : null;

      case 'swipe':
        return user && featureFlags['swipe_page'] !== false ? (
          <div className="flex-1 flex flex-col min-h-0">
            <UnifiedPageHeader
              onNavigateToCredits={() => handleTabChange('premium')}
              onNavigateToProfile={() => handleTabChange('profile')}
            />
            <SwipePage onStartChat={handleStartPrivateChat} />
          </div>
        ) : null;

      case 'messages':
        return (
          <div className="flex-1 flex flex-col relative min-h-0">
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
          </div>
        );

      case 'profile':
        return user ? (
          <div className="flex-1 flex flex-col min-h-0">
            <UnifiedPageHeader
              onNavigateToCredits={isRestricted ? undefined : () => handleTabChange('premium')}
              onNavigateToProfile={() => handleTabChange('profile')}
            />
            {isRestricted && <SuspensionBanner />}
            <ScrollArea className="flex-1 min-h-0">
              <ProfileView 
                onSignOut={handleSignOut}
                onNavigateToAdmin={isRestricted ? undefined : () => navigate('/admin')}
                onNavigateToCredits={isRestricted ? undefined : () => handleTabChange('premium')}
                onContactAdmin={() => {
                  setPreviousTab(activeTab);
                  setActiveTab('help');
                  setCurrentView('help');
                }}
                onNavigateToChatbot={isRestricted ? undefined : () => setCurrentView('chatbot-config')}
                isAdmin={isRestricted ? false : isAdmin}
                isModerator={isRestricted ? false : isModerator}
                openEditProfile={openEditProfile}
                onEditProfileHandled={() => setOpenEditProfile(false)}
              />
            </ScrollArea>
          </div>
        ) : null;

      case 'premium':
        return user && featureFlags['credits_page'] !== false ? (
          <div className="flex-1 flex flex-col min-h-0">
            <UnifiedPageHeader
              onNavigateToCredits={() => handleTabChange('premium')}
              onNavigateToProfile={() => handleTabChange('profile')}
              rightContent={<ReferralDialog />}
            />
            <ScrollArea className="flex-1 min-h-0">
              <CreditsPage />
            </ScrollArea>
          </div>
        ) : null;

      case 'tween':
        return user ? (
          <div className="flex-1 flex flex-col min-h-0">
            <UnifiedPageHeader
              onNavigateToCredits={() => handleTabChange('premium')}
              onNavigateToProfile={() => handleTabChange('profile')}
            />
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-3 py-4 pb-8">
                <TweenFeed />
              </div>
            </ScrollArea>
          </div>
        ) : null;

      case 'help':
        return user ? (
          <div className="flex-1 flex flex-col min-h-0">
            <Help embedded />
          </div>
        ) : null;

      default:
        return null;
    }
  };

  const content = renderContent();

  const showGlobalAd = user && currentView !== 'landing' && !isAdmin && !isModerator;

  return (
    <Suspense fallback={<LazyFallback />}>
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
          {content ?? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </div>
            </div>
          )}

          {/* Global Ad Banner - shown on all pages except admin/moderator */}
          {showGlobalAd && currentView !== 'chat' && currentView !== 'private' && (
            <div className="px-3 py-1 shrink-0">
              <AdBanner placement="compact" />
            </div>
          )}
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
    </Suspense>
  );
};

export default Index;
