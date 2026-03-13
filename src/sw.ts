/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// Take control immediately
self.skipWaiting();
clientsClaim();

// Clean up old caches
cleanupOutdatedCaches();

// Precache files injected by workbox (the manifest will be injected here)
precacheAndRoute(self.__WB_MANIFEST);

// Cache Supabase API calls with NetworkFirst strategy
registerRoute(
  ({ url }) => url.origin.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 1 day
      }),
    ],
  })
);

// Cache images with CacheFirst strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// ============================================
// PUSH NOTIFICATION HANDLING
// ============================================

// Log when SW is activated to confirm push handling is ready
console.log('[SW] Service Worker activated with push notification support');

self.addEventListener('push', function(event: PushEvent) {
  console.log('[SW] Push notification received at', new Date().toISOString());
  console.log('[SW] Push event data:', event.data ? 'present' : 'empty');
  
  let data = {
    title: 'GayConnect',
    body: 'Nouvelle notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'default',
    data: { url: '/' }
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      console.log('[SW] Push payload:', payload);
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || Date.now().toString(),
        data: { url: payload.url || '/' }
      };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  // Check if this is a mission notification (in-app sound handles it)
  const isMissionTag = typeof data.tag === 'string' && data.tag.startsWith('mission-');

  // Cast to any to allow Service Worker specific notification options
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    renotify: !isMissionTag,
    requireInteraction: !isMissionTag, // Keep non-mission notifications visible
    vibrate: isMissionTag ? undefined : [200, 100, 200],
    data: data.data,
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ],
    silent: isMissionTag // Mission sounds are handled in-app
  } as NotificationOptions;

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => console.log('[SW] Notification shown successfully'))
      .catch((err: Error) => console.error('[SW] Error showing notification:', err))
  );
});

// Handle notification click
self.addEventListener('notificationclick', function(event: NotificationEvent) {
  console.log('[SW] Notification click received', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetPath = (event.notification.data as { url?: string })?.url || '/';
  
  // For SPA routing: encode the target path as a query parameter
  // This ensures the app loads first, then navigates internally
  const getNavigationUrl = (path: string) => {
    if (path === '/' || path === '' || path.startsWith('/?')) {
      // Root URL or root with query params — use directly
      return path || '/';
    }
    // Encode the path as a query param so the SPA can handle internal navigation
    return `/?redirect=${encodeURIComponent(path)}`;
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        console.log('[SW] Found', clientList.length, 'windows');
        
        // Check if there's already a window open with our app
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i] as WindowClient;
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('[SW] Focusing existing window and posting navigation message');
            
            // Post a message to the client to handle internal navigation
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: targetPath
            });
            
            return client.focus();
          }
        }
        
        // Open new window if none exists - use encoded URL for SPA routing
        const urlToOpen = getNavigationUrl(targetPath);
        console.log('[SW] Opening new window:', urlToOpen);
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle subscription change (e.g., expired subscription)
self.addEventListener('pushsubscriptionchange', function() {
  console.log('[SW] Push subscription changed');
  // The subscription expired, would need to resubscribe here
});
