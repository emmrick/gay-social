import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import BlockedUserGuard from "@/components/BlockedUserGuard";
import VerificationGuard from "@/components/verification/VerificationGuard";
import InstallPWAPrompt from "@/components/pwa/InstallPWAPrompt";
import { AgeConfirmationModal } from "@/components/AgeConfirmationModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import { toast } from "sonner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import About from "./pages/About";
import Legal from "./pages/Legal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
  
  return (
    <AuthProvider>
      <BlockedUserGuard>
        <VerificationGuard>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/about" element={<About />} />
                <Route path="/legal" element={<Legal />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <InstallPWAPrompt />
            <AgeConfirmationModal />
          </TooltipProvider>
        </VerificationGuard>
      </BlockedUserGuard>
    </AuthProvider>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
