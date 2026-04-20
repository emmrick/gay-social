import { lazy, Suspense, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useBlockedUserContext } from '@/components/BlockedUserGuard';
import { useRealtimeOnlineStatus } from '@/hooks/useRealtimeOnlineStatus';
import { useNotificationRedirect } from '@/hooks/useNotificationRedirect';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useOnlineMemberCount } from '@/hooks/useTotalMemberCount';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useIdentityVerification } from '@/hooks/useIdentityVerification';
import { useFeatureFlags } from '@/hooks/useFeatureToggles';
import UnifiedPageHeader from '@/components/layout/UnifiedPageHeader';
import BottomNavBar from '@/components/navigation/BottomNavBar';
import SuspensionBanner from '@/components/moderation/SuspensionBanner';
import AdBanner from '@/components/ads/AdBanner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const VerificationReminderBanner = lazy(() => import('@/components/verification/VerificationReminderBanner'));
const IdentityVerificationDialog = lazy(() => import('@/components/verification/IdentityVerificationDialog'));

const LazyFallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[50vh]">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

// Routes where the bottom nav should be hidden
const HIDE_BOTTOM_NAV_ROUTES = ['/messages/', '/chat/'];

const AuthenticatedLayout = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { isRestricted } = useBlockedUserContext();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { getTotalUnreadCount } = useUnreadMessages();
  const { data: onlineCount } = useOnlineMemberCount();
  const { data: isAdmin } = useIsAdmin();
  const featureFlags = useFeatureFlags();
  const { verification, isLoading: verificationLoading } = useIdentityVerification();
  const { data: isModerator } = useQuery({
    queryKey: ['is-moderator', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' });
      return data === true;
    },
    enabled: !!user?.id,
  });

  // Global hooks
  useRealtimeOnlineStatus();
  useNotificationRedirect();

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Force restricted users to profile
  useEffect(() => {
    if (isRestricted && user) {
      const allowedPaths = ['/profile', '/help', '/aide'];
      const isAllowed = allowedPaths.some(p => location.pathname.startsWith(p));
      if (!isAllowed) {
        navigate('/profile', { replace: true });
      }
    }
  }, [isRestricted, user, location.pathname, navigate]);

  // Process pending referral code after signup
  useEffect(() => {
    if (user && !authLoading) {
      const pendingReferralCode = localStorage.getItem('pending_referral_code');
      if (pendingReferralCode) {
        localStorage.removeItem('pending_referral_code');
        supabase.functions.invoke('manage-referrals', {
          body: { action: 'register-referral', userId: user.id, referralCode: pendingReferralCode }
        }).catch(console.error);
      }
    }
  }, [user, authLoading]);

  // Handle OTP interruption link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const interruptToken = params.get('interrupt');
    if (interruptToken) {
      window.history.replaceState({}, '', location.pathname);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      fetch(`${supabaseUrl}/functions/v1/send-otp-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
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

  // Handle query params from notification clicks
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const showVerif = params.get('showVerification');
    const editProfile = params.get('editProfile');

    if (tabParam || showVerif || editProfile) {
      window.history.replaceState({}, '', location.pathname);
      if (tabParam) {
        const tabRoutes: Record<string, string> = {
          home: '/home', swipe: '/swipe', messages: '/messages',
          tween: '/tween', premium: '/credits', help: '/aide/chat',
          profile: '/profile',
        };
        const route = tabRoutes[tabParam];
        if (route) navigate(route, { replace: true });
      }
      if (editProfile === 'true') {
        navigate('/profile?edit=true', { replace: true });
      }
    }
  }, [location.search, user, navigate]);

  if (authLoading || !user) return null;

  // Determine if bottom nav should show
  const pathname = location.pathname;
  const hideBottomNav = HIDE_BOTTOM_NAV_ROUTES.some(r => pathname.startsWith(r));
  const showBottomNav = !hideBottomNav;

  // Determine if ads should show
  const showGlobalAd = !isAdmin && !isModerator && !hideBottomNav;

  return (
    <div
      className="h-dvh h-screen bg-background flex flex-col overflow-hidden relative"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      

      {/* Verification Reminder Banner */}
      <Suspense fallback={null}>
        <VerificationReminderBanner />
      </Suspense>

      {/* Suspension Banner */}
      {isRestricted && <SuspensionBanner />}

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 flex flex-col overflow-hidden",
          showBottomNav && "pb-20"
        )}
        style={{
          paddingBottom: showBottomNav ? 'calc(82px + env(safe-area-inset-bottom, 0px))' : undefined,
        }}
      >
        <Suspense fallback={<LazyFallback />}>
          <Outlet context={{
            onlineCount,
            isRestricted,
            isAdmin,
            isModerator,
          }} />
        </Suspense>

        {/* Global Ad Banner */}
        {showGlobalAd && (
          <div className="px-3 py-1 shrink-0">
            <AdBanner placement="compact" />
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      {showBottomNav && (
        <BottomNavBar
          unreadCount={getTotalUnreadCount()}
        />
      )}
    </div>
  );
};

export default AuthenticatedLayout;
