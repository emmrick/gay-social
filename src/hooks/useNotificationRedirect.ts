import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook to handle navigation from push notification clicks.
 * 
 * This handles two scenarios:
 * 1. App is open: Service Worker sends a postMessage with the target URL
 * 2. App is closed: URL includes ?redirect= parameter that needs to be processed
 */
export const useNotificationRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Handle redirect parameter from URL (when app was closed)
    const urlParams = new URLSearchParams(location.search);
    const redirectPath = urlParams.get('redirect');
    
    if (redirectPath) {
      console.log('[NotificationRedirect] Handling redirect param:', redirectPath);
      // Clean the URL first, then navigate
      window.history.replaceState({}, '', '/');
      
      // Small delay to ensure the app is fully loaded
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 100);
    }
  }, [location.search, navigate]);

  useEffect(() => {
    // Handle postMessage from Service Worker (when app was already open)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const targetUrl = event.data.url;
        console.log('[NotificationRedirect] Received SW message, navigating to:', targetUrl);
        
        if (targetUrl && targetUrl !== '/') {
          // If URL contains query params (e.g. /?tab=profile), use full navigation
          if (targetUrl.startsWith('/?')) {
            window.location.href = targetUrl;
          } else {
            navigate(targetUrl);
          }
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [navigate]);
};

export default useNotificationRedirect;
