import { ReactNode, Suspense, lazy, useMemo } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

/**
 * Système Keep-Alive pour les routes principales.
 * Toutes les pages enregistrées sont montées une seule fois et conservées
 * dans le DOM (display: none / block). Le démontage n'a jamais lieu, donc :
 * - aucun spinner Suspense au retour
 * - état local préservé (onglets, dialogs, formulaires)
 * - scroll position restauré automatiquement
 */

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
  hasBeenActive: boolean;
}

const KeepAlivePane = ({ routeKey, isActive, children, hasBeenActive }: KeepAlivePaneProps) => {
  const ref = useScrollRestoration(routeKey, isActive);

  // Ne monte le contenu qu'après la 1re activation pour économiser au démarrage
  if (!hasBeenActive) return null;

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

/**
 * Renvoie l'index de la route keep-alive correspondant au pathname courant,
 * ou -1 si aucune ne matche (cas des routes "lourdes" non keep-alive).
 */
const matchKeepAliveIndex = (pathname: string): number =>
  KEEP_ALIVE_ROUTES.findIndex((r) =>
    matchPath({ path: r.path, end: true }, pathname) !== null,
  );

interface KeepAliveOutletProps {
  /** Composant à rendre quand le pathname ne correspond à aucune route keep-alive */
  fallbackElement: ReactNode;
}

const KeepAliveOutlet = ({ fallbackElement }: KeepAliveOutletProps) => {
  const location = useLocation();
  const activeIndex = matchKeepAliveIndex(location.pathname);
  const activeKey = activeIndex >= 0 ? KEEP_ALIVE_ROUTES[activeIndex].key : null;

  // Mémorise quelles routes ont déjà été visitées (pour ne monter qu'à la demande)
  // On garde un Set qui ne se reset jamais.
  const visitedRef = useMemo(() => new Set<string>(), []);
  if (activeKey) visitedRef.add(activeKey);

  return (
    <Suspense fallback={<Fallback />}>
      {KEEP_ALIVE_ROUTES.map((route) => (
        <KeepAlivePane
          key={route.key}
          routeKey={route.key}
          isActive={activeKey === route.key}
          hasBeenActive={visitedRef.has(route.key)}
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
