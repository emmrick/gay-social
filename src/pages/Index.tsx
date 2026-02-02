import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Hero from '@/components/landing/Hero';
import HomeView from '@/components/home/HomeView';
import ChatRoom from '@/components/chat/ChatRoom';
import PrivateChatList from '@/components/chat/PrivateChatList';
import PrivateChatRoom from '@/components/chat/PrivateChatRoom';
import ProfileView from '@/components/profile/ProfileView';
import PremiumPage from '@/components/premium/PremiumPage';
import BottomNavBar from '@/components/navigation/BottomNavBar';
import MemberSearch from '@/components/chat/MemberSearch';
import JoinedGroupsList from '@/components/chat/JoinedGroupsList';
import GroupPickerDialog from '@/components/chat/GroupPickerDialog';
import IdentityVerificationDialog from '@/components/verification/IdentityVerificationDialog';
import VerificationReminderBanner from '@/components/verification/VerificationReminderBanner';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useChatRoom } from '@/hooks/useChatRooms';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useRegionMemberCount } from '@/hooks/useRegionMemberCounts';
import { useJoinedGroups } from '@/hooks/useJoinedGroups';
import { useIdentityVerification } from '@/hooks/useIdentityVerification';
import { useSubscription } from '@/hooks/useSubscription';
import { useRealtimeOnlineStatus } from '@/hooks/useRealtimeOnlineStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Archive } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type AppView = 'landing' | 'home' | 'groups' | 'messages' | 'premium' | 'profile' | 'chat' | 'private';
type NavTab = 'home' | 'groups' | 'messages' | 'premium' | 'profile';

// Tab order for determining animation direction
const tabOrder: NavTab[] = ['home', 'groups', 'messages', 'premium', 'profile'];

// Animation variants for page transitions
const pageVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

const fadeVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

const slideUpVariants = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [previousTab, setPreviousTab] = useState<NavTab>('home');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedPrivateUserId, setSelectedPrivateUserId] = useState<string | null>(null);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showArchivedConversations, setShowArchivedConversations] = useState(false);
  const { user, profile, isLoading: authLoading, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { isPremium } = useSubscription();
  const { verification, isLoading: verificationLoading } = useIdentityVerification();
  const { data: selectedRoomData } = useChatRoom(selectedRegion || '');
  const { total: memberCount } = useRegionMemberCount(selectedRegion || '');
  const { getOrCreateConversation } = usePrivateConversations();
  const { getTotalUnreadCount, markAsRead } = useUnreadMessages();
  const { joinedGroups, joinGroup, remainingSlots, maxGroups } = useJoinedGroups();
  const navigate = useNavigate();
  const location = useLocation();

  // Subscribe to real-time online status changes globally
  useRealtimeOnlineStatus();

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

  // Redirect to home if user is logged in and on landing
  useEffect(() => {
    if (user && currentView === 'landing') {
      setCurrentView('home');
    } else if (!user && !authLoading && currentView !== 'landing') {
      setCurrentView('landing');
    }
  }, [user, authLoading, currentView]);

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
    setPreviousTab(activeTab);
    setActiveTab(tab);
    if (tab === 'profile') {
      setCurrentView('profile');
    } else if (tab === 'messages') {
      setSelectedPrivateUserId(null);
      setCurrentView('messages');
    } else if (tab === 'groups') {
      setCurrentView('groups');
    } else if (tab === 'premium') {
      setCurrentView('premium');
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


  // Render private chat view with slide animation
  if (currentView === 'private' && selectedPrivateUserId) {
    return (
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="min-h-screen"
      >
        <PrivateChatRoom
          otherUserId={selectedPrivateUserId}
          onBack={handleBackFromPrivateChat}
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
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="min-h-screen"
      >
        <ChatRoom
          roomId={selectedRoomData.id}
          regionCode={selectedRegion}
          regionName={selectedRoomData.region_name}
          memberCount={memberCount}
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
          <motion.div
            key="landing"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
            className="flex-1"
          >
            <Hero onGetStarted={handleGetStarted} />
          </motion.div>
        );
      
      case 'home':
        return user ? (
          <motion.div
            key="home"
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Header */}
            <div 
              className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50 flex items-center justify-between"
              style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
            >
              <div className="px-5 pb-4 flex items-center justify-between w-full">
                <div>
                  <motion.h2 
                    className="font-display text-2xl font-bold text-foreground mb-0.5"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Accueil
                  </motion.h2>
                  <motion.p 
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    Bienvenue, {profile?.username || 'membre'}
                  </motion.p>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <NotificationsDropdown />
                </div>
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <HomeView
                onNavigateToGroups={() => handleTabChange('groups')}
                onNavigateToMessages={() => handleTabChange('messages')}
                onSelectRegion={handleSelectRegion}
                onViewProfile={(userId) => handleStartPrivateChat(userId)}
                onStartPrivateChat={handleStartPrivateChat}
              />
            </ScrollArea>
          </motion.div>
        ) : null;

      case 'groups':
        return (
          <motion.div
            key="groups"
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Header with add button */}
            <div 
              className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50"
              style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
            >
              <div className="px-5 pb-4 flex items-center justify-between">
                <div>
                  <motion.h2 
                    className="font-display text-2xl font-bold text-foreground mb-0.5"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Groupes
                  </motion.h2>
                  <motion.p 
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    {joinedGroups.length}/{maxGroups} groupes rejoints
                  </motion.p>
                </div>
                <div className="flex items-center gap-2">
                  <NotificationsDropdown />
                  <Button
                    onClick={() => setShowGroupPicker(true)}
                    size="icon"
                    className="rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Groups list */}
            <ScrollArea className="flex-1 min-h-0">
              <JoinedGroupsList onSelectGroup={handleSelectRegion} />
            </ScrollArea>

            {/* Group picker dialog */}
            <GroupPickerDialog
              open={showGroupPicker}
              onOpenChange={setShowGroupPicker}
              onGroupJoined={handleSelectRegion}
            />
          </motion.div>
        );

      case 'messages':
        return (
          <motion.div
            key="messages"
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
            className="flex-1 flex flex-col relative min-h-0"
          >
            {/* Header with search button */}
            <div 
              className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50"
              style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
            >
              <div className="px-5 pb-4 flex items-center justify-between">
                <div>
                  <motion.h2 
                    className="font-display text-2xl font-bold text-foreground mb-0.5"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Messages
                  </motion.h2>
                  <motion.p 
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    Tes conversations privées
                  </motion.p>
                </div>
                <div className="flex items-center gap-2">
                  <NotificationsDropdown />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowArchivedConversations(!showArchivedConversations)}
                    className={cn(
                      "rounded-full",
                      showArchivedConversations && "bg-secondary"
                    )}
                  >
                    <Archive className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => setShowMemberSearch(true)}
                    size="icon"
                    className="rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>

               {/* Tabs for active/archived */}
               <div className="px-5 pb-3">
                <Tabs 
                  value={showArchivedConversations ? 'archived' : 'active'} 
                  onValueChange={(v) => setShowArchivedConversations(v === 'archived')}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="active">Conversations</TabsTrigger>
                    <TabsTrigger value="archived">Archives</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            
            {/* Conversation list */}
            <ScrollArea className="flex-1 min-h-0">
              <PrivateChatList
                onSelectConversation={handleSelectConversation}
                selectedUserId={null}
                showArchived={showArchivedConversations}
              />
            </ScrollArea>
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
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Header */}
            <div 
              className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50"
              style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
            >
              <div className="px-5 pb-4 flex items-center justify-between">
                <div>
                  <motion.h2 
                    className="font-display text-2xl font-bold text-foreground mb-0.5"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Mon Profil
                  </motion.h2>
                  <motion.p 
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    Gérer ton compte
                  </motion.p>
                </div>
                <NotificationsDropdown />
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <ProfileView 
                onSignOut={handleSignOut}
                onNavigateToAdmin={() => navigate('/admin')}
                onNavigateToPremium={() => handleTabChange('premium')}
                onContactAdmin={() => {
                  // Admin user ID - starts a private conversation with admin
                  const adminUserId = '576f712b-2925-4d8f-ad59-9bcbd9996a02';
                  setSelectedPrivateUserId(adminUserId);
                  setCurrentView('private');
                }}
                isAdmin={isAdmin}
              />
            </ScrollArea>
          </motion.div>
        ) : null;

      case 'premium':
        return user ? (
          <motion.div
            key="premium"
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Header */}
            <div 
              className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50"
              style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
            >
              <div className="px-5 pb-4 flex items-center justify-between">
                <div>
                  <motion.h2 
                    className="font-display text-2xl font-bold text-foreground mb-0.5"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Premium
                  </motion.h2>
                  <motion.p 
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    Débloquer toutes les fonctionnalités
                  </motion.p>
                </div>
                <NotificationsDropdown />
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <PremiumPage />
            </ScrollArea>
          </motion.div>
        ) : null;

      default:
        return null;
    }
  };

  const content = renderContent();

  return (
    <div 
      className="min-h-dvh min-h-screen bg-background flex flex-col overflow-x-hidden"
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
        <AnimatePresence mode="wait" custom={direction}>
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

      {/* Bottom Navigation Bar with fade animation */}
      <AnimatePresence>
        {showBottomNav && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <BottomNavBar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              unreadCount={getTotalUnreadCount()}
              isPremium={isPremium}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
