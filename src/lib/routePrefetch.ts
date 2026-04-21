/**
 * Préchargement des chunks lazy-loaded des pages principales et de leurs
 * sous-composants lourds. Les imports dynamiques sont mis en cache par Vite/le
 * navigateur, donc une fois préchargés, la navigation devient quasi-instantanée
 * (pas de re-téléchargement, pas de "Loader2" en plein écran).
 */

const loaders: Record<string, () => Promise<unknown>> = {
  // Pages racines
  home: () => import('@/pages/HomePage'),
  swipe: () => import('@/pages/SwipePageRoute'),
  messages: () => import('@/pages/MessagesPage'),
  tween: () => import('@/pages/TweenPageRoute'),
  help: () => import('@/pages/HelpPageRoute'),
  profile: () => import('@/pages/ProfilePage'),
  credits: () => import('@/pages/CreditsPageRoute'),
  privateChat: () => import('@/pages/PrivateChatPage'),
  groupChat: () => import('@/pages/GroupChatPage'),
  // Sous-composants lourds rendus en lazy à l'intérieur des pages
  swipePageInner: () => import('@/components/swipe/SwipePage'),
  tweenFeedInner: () => import('@/components/tween/TweenFeed'),
  creditsInner: () => import('@/components/credits/CreditsPage'),
  profileViewInner: () => import('@/components/profile/ProfileView'),
  privateChatList: () => import('@/components/chat/PrivateChatList'),
  joinedGroupsList: () => import('@/components/chat/JoinedGroupsList'),
};

const prefetched = new Set<string>();

export const prefetchRoute = (key: keyof typeof loaders) => {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  // Fire-and-forget: si ça échoue, on retentera la prochaine fois.
  loaders[key]?.().catch(() => prefetched.delete(key));
};

/**
 * Précharge en arrière-plan toutes les pages principales de la nav
 * + leurs sous-composants lazy lourds.
 * À appeler après le premier rendu (idle) pour ne pas retarder le LCP.
 */
export const prefetchMainRoutes = () => {
  const run = () => {
    // Pages racines
    prefetchRoute('home');
    prefetchRoute('messages');
    prefetchRoute('tween');
    prefetchRoute('swipe');
    prefetchRoute('help');
    prefetchRoute('profile');
    prefetchRoute('credits');
    // Sous-composants lourds (chargés une fois et conservés en cache)
    prefetchRoute('swipePageInner');
    prefetchRoute('tweenFeedInner');
    prefetchRoute('creditsInner');
    prefetchRoute('profileViewInner');
    prefetchRoute('privateChatList');
    prefetchRoute('joinedGroupsList');
  };
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 1500);
  }
};
