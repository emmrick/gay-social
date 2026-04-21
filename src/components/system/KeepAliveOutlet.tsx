import { ReactNode, Suspense, lazy, useReducer, useRef } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useScrollRestoration, clearScrollPosition } from '@/hooks/useScrollRestoration';

/**
 * Système Keep-Alive avec politique LRU pour les routes principales.
 *
 * Capacité max : MAX_ALIVE pages montées simultanément. Quand une nouvelle
 * page devient active alors que le cache est plein, la page la moins
 * récemment utilisée (LRU) est démontée — son DOM, son state local et son
 * scroll sont libérés. La page courante n'est jamais évincée.
 *
 * Avantages :
 * - aucun spinner Suspense au retour sur une page récemment visitée
 * - état préservé pour les pages "chaudes"
 * - empreinte mémoire bornée (4 pages max au lieu de 7)
 */

// Capacité du cache LRU. 4 = sweet spot pour mobile (Home + Messages + une 3e + buffer).
const MAX_ALIVE = 4;

const HomePage = lazy(() => import('@/pages/HomePage'));
const SwipePageRoute = lazy(() => import('@/pages/SwipePageRoute'));
const MessagesPage = lazy(() => import('@/pages/MessagesPage'));
const TweenPageRoute = lazy(() => import('@/pages/TweenPageRoute'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const CreditsPageRoute = lazy(() => import('@/pages/CreditsPageRoute'));
const HelpPageRoute = lazy(() => import('@/pages/HelpPageRoute'));

interface KeepAliveRoute {
  path: string;
  key: string;
  element: ReactNode;
}

const KEEP_ALIVE_ROUTES: KeepAliveRoute[] = [
  { path: '/home', key: 'home', element: <HomePage /> },
  { path: '/swipe', key: 'swipe', element: <SwipePageRoute /> },
  { path: '/messages', key: 'messages', element: <MessagesPage /> },
  { path: '/tween', key: 'tween', element: <TweenPageRoute /> },
  { path: '/profile', key: 'profile', element: <ProfilePage /> },
  { path: '/credits', key: 'credits', element: <CreditsPageRoute /> },
  { path: '/aide/chat', key: 'help-chat', element: <HelpPageRoute /> },
];

interface KeepAlivePaneProps {
  routeKey: string;
  isActive: boolean;
  children: ReactNode;
  isMounted: boolean;
}

const KeepAlivePane = ({ routeKey, isActive, children, isMounted }: KeepAlivePaneProps) => {
  const ref = useScrollRestoration(routeKey, isActive);

  // Évincée par le LRU ou jamais visitée — démontage complet.
  if (!isMounted) return null;

  return (
    <div
      ref={ref}
      data-keep-alive={routeKey}
      style={{
        display: isActive ? 'flex' : 'none',
        flexDirection: 'column',
        flex: '1 1 auto',
        minHeight: 0,
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {children}
    </div>
  );
};

const Fallback = () => (
  <div className="flex-1 flex items-center justify-center min-h-[50vh]">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const matchKeepAliveIndex = (pathname: string): number =>
  KEEP_ALIVE_ROUTES.findIndex(
    (r) => matchPath({ path: r.path, end: true }, pathname) !== null,
  );

/**
 * Cache LRU : tableau ordonné des clés "vivantes" (la plus récente en dernier).
 * Mute le tableau en place puis force un re-render pour rester simple/rapide.
 */
const touchLRU = (lru: string[], key: string): string[] => {
  const idx = lru.indexOf(key);
  if (idx !== -1) lru.splice(idx, 1);
  lru.push(key);
  return lru;
};

interface KeepAliveOutletProps {
  fallbackElement: ReactNode;
}

const KeepAliveOutlet = ({ fallbackElement }: KeepAliveOutletProps) => {
  const location = useLocation();
  const activeIndex = matchKeepAliveIndex(location.pathname);
  const activeKey = activeIndex >= 0 ? KEEP_ALIVE_ROUTES[activeIndex].key : null;

  // Liste LRU persistée entre rendus (mutée en place).
  const lruRef = useRef<string[]>([]);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const prevActiveKeyRef = useRef<string | null>(null);

  if (activeKey && activeKey !== prevActiveKeyRef.current) {
    prevActiveKeyRef.current = activeKey;
    const lru = lruRef.current;
    touchLRU(lru, activeKey);

    // Eviction LRU : on retire les plus anciennes tant qu'on dépasse la capacité.
    // La page courante (en queue) n'est jamais évincée.
    while (lru.length > MAX_ALIVE) {
      const evicted = lru.shift();
      if (evicted) clearScrollPosition(evicted);
    }
    // Re-render asynchrone pour appliquer le nouvel ensemble monté.
    queueMicrotask(forceRender);
  }

  const aliveSet = new Set(lruRef.current);

  return (
    <Suspense fallback={<Fallback />}>
      {KEEP_ALIVE_ROUTES.map((route) => (
        <KeepAlivePane
          key={route.key}
          routeKey={route.key}
          isActive={activeKey === route.key}
          isMounted={aliveSet.has(route.key)}
        >
          {route.element}
        </KeepAlivePane>
      ))}

      {/* Routes non keep-alive (chat individuel, groupe, etc.) — rendues classiquement */}
      {activeIndex === -1 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {fallbackElement}
        </div>
      )}
    </Suspense>
  );
};

export default KeepAliveOutlet;
