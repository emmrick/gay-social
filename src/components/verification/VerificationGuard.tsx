import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVerificationDeadline } from '@/hooks/useVerificationDeadline';
import VerificationRequiredScreen from './VerificationRequiredScreen';
import PendingApprovalScreen from './PendingApprovalScreen';

interface VerificationGuardProps {
  children: ReactNode;
}

// Routes publiques qui restent toujours accessibles, même connecté sans vérification
const PUBLIC_ROUTES = [
  '/', '/auth', '/about', '/legal', '/regions', '/region',
  '/aide', '/regles', '/guide', '/paypal-return', '/advertise',
  '/comment-ca-marche', '/securite', '/communaute',
  '/tween-public', '/unsubscribe',
];

const isPublicRoute = (pathname: string) => {
  if (pathname === '/' || pathname === '/auth') return true;
  return PUBLIC_ROUTES.some(p => p !== '/' && pathname.startsWith(p));
};

const FullScreenLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const VerificationGuard = ({ children }: VerificationGuardProps) => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { canAccessApp, isLoading: verificationLoading, isVerificationPending, isReVerification } = useVerificationDeadline();
  const location = useLocation();

  // Pages publiques toujours accessibles (landing, auth, légal, etc.)
  if (isPublicRoute(location.pathname)) {
    return <>{children}</>;
  }

  // Pas connecté — laisser passer (la redirection se fait via AuthenticatedLayout)
  if (!user) {
    return <>{children}</>;
  }

  // Auth en cours de chargement — bloquer avec un loader (sécurité)
  if (authLoading) {
    return <FullScreenLoader />;
  }

  // Profil pas encore chargé — bloquer avec un loader (sécurité)
  if (!profile) {
    return <FullScreenLoader />;
  }

  // Statut de vérification en cours de chargement — bloquer avec un loader
  if (verificationLoading) {
    return <FullScreenLoader />;
  }

  // Si la vérification est en attente (soumise), montrer l'écran d'attente
  // Sauf pour les re-vérifications qui gardent l'accès avec un bandeau
  if (isVerificationPending && !isReVerification) {
    return <PendingApprovalScreen />;
  }

  // Si l'accès n'est pas autorisé (premières vérifications uniquement)
  if (!canAccessApp && !isReVerification) {
    return <VerificationRequiredScreen />;
  }

  return <>{children}</>;
};

export default VerificationGuard;
