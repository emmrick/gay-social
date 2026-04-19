import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";

// Redirige les anciennes URL /member/:userId vers /profile/:userId
const LegacyMemberRedirect = () => {
  const { userId } = useParams();
  return <Navigate to={`/profile/${userId}`} replace />;
};
import { AuthProvider } from "@/contexts/AuthContext";
import { ActiveProfileProvider } from "@/contexts/ActiveProfileContext";
import { CreditDialogProvider } from "@/contexts/CreditDialogContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import BlockedUserGuard from "@/components/BlockedUserGuard";
import VerificationGuard from "@/components/verification/VerificationGuard";
import ProfilePhotoGuard from "@/components/profile/ProfilePhotoGuard";
import InstallPWAPrompt from "@/components/pwa/InstallPWAPrompt";
import PushNotificationBanner from "@/components/notifications/PushNotificationBanner";
import LowCreditsAlert from "@/components/credits/LowCreditsAlert";
import { CreditDeductionProvider } from "@/components/credits/CreditDeductionAnimation";
import { AgeConfirmationModal } from "@/components/AgeConfirmationModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import CookieConsentBanner from "@/components/cookie/CookieConsentBanner";
import { useCookieScripts } from "@/hooks/useCookieScripts";

import AppLoadingSkeleton from "@/components/loading/AppLoadingSkeleton";
import { PageFallback } from "@/components/loading/LazyPageLoader";
import InvestigationNoticeDialog from "@/components/moderation/InvestigationNoticeDialog";
import ForcedSupportChat from "@/components/moderation/ForcedSupportChat";
import PromoPopup from "@/components/popups/PromoPopup";
import GlobalMissionOverlay from "@/components/moderation/GlobalMissionOverlay";
import OnboardingGuideDialog from "@/components/onboarding/OnboardingGuideDialog";
import AppLockGate from "@/components/security/AppLockGate";
import DossierAccessPopup from "@/components/moderation/DossierAccessPopup";
import ProfileSelectorModal from "@/components/couple/ProfileSelectorModal";

import { useRealtimeProfileSync } from "@/hooks/useRealtimeProfileSync";

import { useAnnouncementNotifications } from "@/hooks/useAnnouncementNotifications";

import MaintenanceGuard from "@/components/maintenance/MaintenanceGuard";
import MaintenanceBanner from "@/components/maintenance/MaintenanceBanner";
import { toast } from "sonner";

// Layouts
import AuthenticatedLayout from "@/layouts/AuthenticatedLayout";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));

// Admin pages (lazy par section)
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboardPage = lazy(() => import("./pages/admin/sections/DashboardPage"));
const AdminMembersPage = lazy(() => import("./pages/admin/sections/MembersPage"));
const AdminMissionsPage = lazy(() => import("./pages/admin/sections/MissionsPage"));
const AdminSupportPage = lazy(() => import("./pages/admin/sections/SupportPage"));
const AdminRatingsPage = lazy(() => import("./pages/admin/sections/RatingsPage"));
const AdminVerificationPage = lazy(() => import("./pages/admin/sections/VerificationPage"));
const AdminReportsPage = lazy(() => import("./pages/admin/sections/ReportsPage"));
const AdminContentModerationPage = lazy(() => import("./pages/admin/sections/ContentModerationPage"));
const AdminAIModerationPage = lazy(() => import("./pages/admin/sections/AIModerationPage"));
const AdminScreenshotSanctionsPage = lazy(() => import("./pages/admin/sections/ScreenshotSanctionsPage"));
const AdminStatsPage = lazy(() => import("./pages/admin/sections/StatsPage"));
const AdminModeratorsPage = lazy(() => import("./pages/admin/sections/ModeratorsPage"));
const AdminWalletPage = lazy(() => import("./pages/admin/sections/WalletPage"));
const AdminCreditsSurveillancePage = lazy(() => import("./pages/admin/sections/CreditsSurveillancePage"));
const AdminCreditPurchasesPage = lazy(() => import("./pages/admin/sections/CreditPurchasesPage"));
const AdminRatesPage = lazy(() => import("./pages/admin/sections/RatesPage"));
const AdminWithdrawalsPage = lazy(() => import("./pages/admin/sections/WithdrawalsPage"));
const AdminGlobalEarningsPage = lazy(() => import("./pages/admin/sections/GlobalEarningsPage"));
const AdminBroadcastPage = lazy(() => import("./pages/admin/sections/BroadcastPage"));
const AdminPopupsPage = lazy(() => import("./pages/admin/sections/PopupsPage"));
const AdminFAQPage = lazy(() => import("./pages/admin/sections/FAQPage"));
const AdminFlyersPage = lazy(() => import("./pages/admin/sections/FlyersPage"));
const AdminPromoPage = lazy(() => import("./pages/admin/sections/PromoPage"));
const AdminAdsPage = lazy(() => import("./pages/admin/sections/AdsPage"));
const AdminPromoImagesPage = lazy(() => import("./pages/admin/sections/PromoImagesPage"));
const AdminSiteUpdatesPage = lazy(() => import("./pages/admin/sections/SiteUpdatesPage"));
const AdminCreditCostsPage = lazy(() => import("./pages/admin/sections/CreditCostsPage"));
const AdminSwipeStatsPage = lazy(() => import("./pages/admin/sections/SwipeStatsPage"));
const AdminMaintenancePage = lazy(() => import("./pages/admin/sections/MaintenancePage"));
const AdminFeatureTogglesPage = lazy(() => import("./pages/admin/sections/FeatureTogglesPage"));
const AdminErrorLogsPage = lazy(() => import("./pages/admin/sections/ErrorLogsPage"));
const AdminSecurityPage = lazy(() => import("./pages/admin/sections/SecurityPage"));
const About = lazy(() => import("./pages/About"));
const Legal = lazy(() => import("./pages/Legal"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const RegionPage = lazy(() => import("./pages/RegionPage"));
const Regions = lazy(() => import("./pages/Regions"));
const Help = lazy(() => import("./pages/Help"));
const Rules = lazy(() => import("./pages/Rules"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const GuidePage = lazy(() => import("./pages/Guide"));
const PaypalReturn = lazy(() => import("./pages/PaypalReturn"));
const Advertise = lazy(() => import("./pages/Advertise"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Security = lazy(() => import("./pages/Security"));
const Community = lazy(() => import("./pages/Community"));
const TweenPublicPage = lazy(() => import("./pages/Tween"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));

// Authenticated pages
const HomePage = lazy(() => import("./pages/HomePage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const PrivateChatPage = lazy(() => import("./pages/PrivateChatPage"));
const GroupChatPage = lazy(() => import("./pages/GroupChatPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const CreditsPageRoute = lazy(() => import("./pages/CreditsPageRoute"));
const TweenPageRoute = lazy(() => import("./pages/TweenPageRoute"));
const SwipePageRoute = lazy(() => import("./pages/SwipePageRoute"));
const HelpPageRoute = lazy(() => import("./pages/HelpPageRoute"));
const ChatbotConfigPage = lazy(() => import("./pages/ChatbotConfigPage"));

import { setGlobalQueryClient } from "@/hooks/useCredits";

// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

setGlobalQueryClient(queryClient);

const useGlobalErrorHandler = () => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("[unhandledrejection] Unhandled promise rejection:", event.reason);
      const reason = event.reason;
      const isNetworkError = reason instanceof TypeError && reason.message?.includes("fetch");
      if (!isNetworkError) {
        toast.error("Une erreur inattendue s'est produite");
      }
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error("[global error]", event.error || event.message);
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);
};

const AuthenticatedApp = () => {
  useRealtimeProfileSync();
  useAnnouncementNotifications();

  return (
    <ActiveProfileProvider>
      <MaintenanceGuard>
        <CreditDialogProvider>
          <CreditDeductionProvider>
            <BlockedUserGuard>
              <VerificationGuard>
                <ProfilePhotoGuard>
                  <TooltipProvider>
                    <MaintenanceBanner />
                    <Toaster />
                    <Sonner />
                    <>
                      <Suspense fallback={<AppLoadingSkeleton />}>
                        <Routes>
                          {/* Landing / Auth */}
                          <Route path="/" element={<Index />} />
                          <Route path="/auth" element={<Suspense fallback={<PageFallback />}><Auth /></Suspense>} />

                          {/* Authenticated routes with shared layout */}
                          <Route element={<AuthenticatedLayout />}>
                            <Route path="/home" element={<HomePage />} />
                            <Route path="/swipe" element={<SwipePageRoute />} />
                            <Route path="/messages" element={<MessagesPage />} />
                            <Route path="/messages/:userId" element={<PrivateChatPage />} />
                            <Route path="/chat/:regionCode" element={<GroupChatPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/profile/chatbot" element={<ChatbotConfigPage />} />
                            <Route path="/credits" element={<CreditsPageRoute />} />
                            <Route path="/tween" element={<TweenPageRoute />} />
                            <Route path="/aide/chat" element={<HelpPageRoute />} />
                          </Route>

                          {/* Public pages */}
                          <Route path="/profile/:userId" element={<Suspense fallback={<PageFallback />}><MemberProfile /></Suspense>} />
                          <Route path="/admin" element={<Suspense fallback={<PageFallback />}><AdminLayout /></Suspense>}>
                            <Route index element={<AdminDashboardPage />} />
                            <Route path="missions" element={<AdminMissionsPage />} />
                            <Route path="support" element={<AdminSupportPage />} />
                            <Route path="avis" element={<AdminRatingsPage />} />
                            <Route path="identite" element={<AdminVerificationPage />} />
                            <Route path="signalements" element={<AdminReportsPage />} />
                            <Route path="contenu" element={<AdminContentModerationPage />} />
                            <Route path="ia" element={<AdminAIModerationPage />} />
                            <Route path="captures" element={<AdminScreenshotSanctionsPage />} />
                            <Route path="membres" element={<AdminMembersPage />} />
                            <Route path="stats" element={<AdminStatsPage />} />
                            <Route path="equipe" element={<AdminModeratorsPage />} />
                            <Route path="portefeuille" element={<AdminWalletPage />} />
                            <Route path="surveillance" element={<AdminCreditsSurveillancePage />} />
                            <Route path="achats" element={<AdminCreditPurchasesPage />} />
                            <Route path="tarifs" element={<AdminRatesPage />} />
                            <Route path="retraits" element={<AdminWithdrawalsPage />} />
                            <Route path="gains" element={<AdminGlobalEarningsPage />} />
                            <Route path="push" element={<AdminBroadcastPage />} />
                            <Route path="popups" element={<AdminPopupsPage />} />
                            <Route path="aide" element={<AdminFAQPage />} />
                            <Route path="flyers" element={<AdminFlyersPage />} />
                            <Route path="promos" element={<AdminPromoPage />} />
                            <Route path="annonces" element={<AdminAdsPage />} />
                            <Route path="visuels" element={<AdminPromoImagesPage />} />
                            <Route path="updates" element={<AdminSiteUpdatesPage />} />
                            <Route path="credits" element={<AdminCreditCostsPage />} />
                            <Route path="swipe" element={<AdminSwipeStatsPage />} />
                            <Route path="maintenance" element={<AdminMaintenancePage />} />
                            <Route path="toggles" element={<AdminFeatureTogglesPage />} />
                            <Route path="erreurs" element={<AdminErrorLogsPage />} />
                            <Route path="securite" element={<AdminSecurityPage />} />
                          </Route>
                          <Route path="/about" element={<Suspense fallback={<PageFallback />}><About /></Suspense>} />
                          <Route path="/legal" element={<Suspense fallback={<PageFallback />}><Legal /></Suspense>} />
                          <Route path="/regions" element={<Suspense fallback={<PageFallback />}><Regions /></Suspense>} />
                          <Route path="/region/:slug" element={<Suspense fallback={<PageFallback />}><RegionPage /></Suspense>} />
                          <Route path="/aide" element={<Suspense fallback={<PageFallback />}><HelpCenter /></Suspense>} />
                          <Route path="/aide/:category" element={<Suspense fallback={<PageFallback />}><HelpCenter /></Suspense>} />
                          <Route path="/regles" element={<Suspense fallback={<PageFallback />}><Rules /></Suspense>} />
                          <Route path="/guide" element={<Suspense fallback={<PageFallback />}><GuidePage /></Suspense>} />
                          <Route path="/paypal-return" element={<Suspense fallback={<PageFallback />}><PaypalReturn /></Suspense>} />
                          <Route path="/advertise" element={<Suspense fallback={<PageFallback />}><Advertise /></Suspense>} />
                          <Route path="/comment-ca-marche" element={<Suspense fallback={<PageFallback />}><HowItWorks /></Suspense>} />
                          <Route path="/securite" element={<Suspense fallback={<PageFallback />}><Security /></Suspense>} />
                          <Route path="/communaute" element={<Suspense fallback={<PageFallback />}><Community /></Suspense>} />
                          <Route path="/tween-public" element={<Suspense fallback={<PageFallback />}><TweenPublicPage /></Suspense>} />
                          <Route path="/unsubscribe" element={<Suspense fallback={<PageFallback />}><Unsubscribe /></Suspense>} />

                          {/* Redirections legacy (anciennes URL référencées par moteurs / liens externes) */}
                          <Route path="/mentions-legales" element={<Navigate to="/legal" replace />} />
                          <Route path="/politique-confidentialite" element={<Navigate to="/legal" replace />} />
                          <Route path="/cgu" element={<Navigate to="/regles" replace />} />
                          <Route path="/member/:userId" element={<LegacyMemberRedirect />} />

                          <Route path="*" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
                        </Routes>
                      </Suspense>
                      <InstallPWAPrompt />
                      <PushNotificationBanner />
                      <LowCreditsAlert />
                      <AgeConfirmationModal />
                      <InvestigationNoticeDialog />
                      <ForcedSupportChat />
                      <PromoPopup />
                      <OnboardingGuideDialog />
                      <GlobalMissionOverlay />
                      <DossierAccessPopup />
                      <ProfileSelectorModal />
                    </>
                  </TooltipProvider>
                </ProfilePhotoGuard>
              </VerificationGuard>
            </BlockedUserGuard>
          </CreditDeductionProvider>
        </CreditDialogProvider>
      </MaintenanceGuard>
    </ActiveProfileProvider>
  );
};

const CookieScriptLoader = () => {
  useCookieScripts();
  return null;
};

const AppContent = () => {
  useGlobalErrorHandler();

  return (
    <CookieConsentProvider>
      <CookieScriptLoader />
      <AuthProvider>
        <AppLockGate>
          <AuthenticatedApp />
        </AppLockGate>
      </AuthProvider>
      <CookieConsentBanner />
    </CookieConsentProvider>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
