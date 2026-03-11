import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import GeoBlockGuard from "@/components/GeoBlockGuard";
import AppLoadingSkeleton from "@/components/loading/AppLoadingSkeleton";
import { PageFallback } from "@/components/loading/LazyPageLoader";
import InvestigationNoticeDialog from "@/components/moderation/InvestigationNoticeDialog";
import ForcedSupportChat from "@/components/moderation/ForcedSupportChat";
import PromoPopup from "@/components/popups/PromoPopup";
import OnboardingGuideDialog from "@/components/onboarding/OnboardingGuideDialog";

import { useRealtimeProfileSync } from "@/hooks/useRealtimeProfileSync";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { useAnnouncementNotifications } from "@/hooks/useAnnouncementNotifications";

import MaintenanceGuard from "@/components/maintenance/MaintenanceGuard";
import MaintenanceBanner from "@/components/maintenance/MaintenanceBanner";
import InitialLoadingScreen from "@/components/loading/InitialLoadingScreen";
import { toast } from "sonner";

// Lazy load pages for better initial bundle size
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
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

import { setGlobalQueryClient } from "@/hooks/useCredits";

// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 5, // 5 minutes (replaces cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Register global query client for standalone credit functions
setGlobalQueryClient(queryClient);

// Global unhandled rejection handler to catch async errors that React ErrorBoundary cannot catch
const useGlobalErrorHandler = () => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("[unhandledrejection] Unhandled promise rejection:", event.reason);
      const reason = event.reason;
      const isNetworkError =
        reason instanceof TypeError && reason.message?.includes("fetch");
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

// Inner component that uses hooks requiring AuthProvider
const AuthenticatedApp = () => {
  useRealtimeProfileSync();
  useAnnouncementNotifications();

  
  return (
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
              <BrowserRouter>
                <Suspense fallback={<AppLoadingSkeleton />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/profile/:userId" element={<Suspense fallback={<PageFallback />}><MemberProfile /></Suspense>} />
                    <Route path="/auth" element={<Suspense fallback={<PageFallback />}><Auth /></Suspense>} />
                    <Route path="/admin" element={<Suspense fallback={<PageFallback />}><Admin /></Suspense>} />
                    <Route path="/about" element={<Suspense fallback={<PageFallback />}><About /></Suspense>} />
                    <Route path="/legal" element={<Suspense fallback={<PageFallback />}><Legal /></Suspense>} />
                    {/* Public SEO pages - accessible without auth */}
                    <Route path="/regions" element={<Suspense fallback={<PageFallback />}><Regions /></Suspense>} />
                    <Route path="/region/:slug" element={<Suspense fallback={<PageFallback />}><RegionPage /></Suspense>} />
                    <Route path="/aide" element={<Suspense fallback={<PageFallback />}><HelpCenter /></Suspense>} />
                    <Route path="/aide/:category" element={<Suspense fallback={<PageFallback />}><HelpCenter /></Suspense>} />
                    <Route path="/aide/chat" element={<Suspense fallback={<PageFallback />}><Help /></Suspense>} />
                    <Route path="/regles" element={<Suspense fallback={<PageFallback />}><Rules /></Suspense>} />
                    <Route path="/guide" element={<Suspense fallback={<PageFallback />}><GuidePage /></Suspense>} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
                
                <CookieConsentBanner />
              </BrowserRouter>
            </TooltipProvider>
          </ProfilePhotoGuard>
          </VerificationGuard>
        </BlockedUserGuard>
      </CreditDeductionProvider>
    </CreditDialogProvider>
    </MaintenanceGuard>
  );
};

const AppContent = () => {
  useGlobalErrorHandler();
  
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
};

const App = () => {
  const [appReady, setAppReady] = useState(false);
  const handleLoadComplete = useCallback(() => setAppReady(true), []);

  return (
    <ErrorBoundary>
      <GeoBlockGuard>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {!appReady && <InitialLoadingScreen onComplete={handleLoadComplete} />}
          {/* Render content immediately but hidden until splash finishes, 
              so queries start prefetching during splash */}
          <div style={appReady ? undefined : { visibility: 'hidden', position: 'fixed', inset: 0 }}>
            <AppContent />
          </div>
        </ThemeProvider>
      </QueryClientProvider>
      </GeoBlockGuard>
    </ErrorBoundary>
  );
};

export default App;
