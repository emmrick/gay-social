import { useEffect, lazy, Suspense } from "react";
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
import InstallPWAPrompt from "@/components/pwa/InstallPWAPrompt";
import PushNotificationBanner from "@/components/notifications/PushNotificationBanner";
import LowCreditsAlert from "@/components/credits/LowCreditsAlert";
import { CreditDeductionProvider } from "@/components/credits/CreditDeductionAnimation";
import { AgeConfirmationModal } from "@/components/AgeConfirmationModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppLoadingSkeleton from "@/components/loading/AppLoadingSkeleton";
import { PageFallback } from "@/components/loading/LazyPageLoader";
import InvestigationNoticeDialog from "@/components/moderation/InvestigationNoticeDialog";
import { useRealtimeProfileSync } from "@/hooks/useRealtimeProfileSync";
import { toast } from "sonner";

// Lazy load pages for better initial bundle size
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const About = lazy(() => import("./pages/About"));
const Legal = lazy(() => import("./pages/Legal"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));

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
      // Don't toast for network/fetch failures (they're usually handled by React Query)
      const reason = event.reason;
      const isNetworkError =
        reason instanceof TypeError && reason.message?.includes("fetch");
      if (!isNetworkError) {
        toast.error("Une erreur inattendue s'est produite");
      }
      // Prevent default browser behavior (logging to console twice, etc.)
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

const AppContent = () => {
  useGlobalErrorHandler();
  useRealtimeProfileSync();
  
  return (
    <AuthProvider>
      <CreditDialogProvider>
        <CreditDeductionProvider>
          <BlockedUserGuard>
            <VerificationGuard>
              <TooltipProvider>
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
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
                    </Routes>
                  </Suspense>
                  <InstallPWAPrompt />
                  <PushNotificationBanner />
                  <LowCreditsAlert />
                  <AgeConfirmationModal />
                  <InvestigationNoticeDialog />
                </BrowserRouter>
              </TooltipProvider>
            </VerificationGuard>
          </BlockedUserGuard>
        </CreditDeductionProvider>
      </CreditDialogProvider>
    </AuthProvider>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
