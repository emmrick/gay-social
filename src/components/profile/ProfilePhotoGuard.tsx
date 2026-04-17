import { ReactNode, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfilePhotos } from '@/hooks/useProfilePhotos';
import { supabase } from '@/integrations/supabase/client';
import ProfilePhotoRequiredScreen from './ProfilePhotoRequiredScreen';

interface ProfilePhotoGuardProps {
  children: ReactNode;
}

// Pages publiques toujours accessibles
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

const ProfilePhotoGuard = ({ children }: ProfilePhotoGuardProps) => {
  const { user, profile, isLoading: authLoading, refetchProfile } = useAuth();
  const { photos, isLoading: photosLoading } = useProfilePhotos(user?.id);
  const autoFixRan = useRef(false);
  const location = useLocation();

  // Auto-fix: si l'utilisateur a des photos mais pas d'avatar_url, le définir
  useEffect(() => {
    if (!user || !profile || photosLoading || autoFixRan.current) return;
    if (profile.avatar_url) return;
    if (photos.length === 0) return;

    autoFixRan.current = true;
    const primaryPhoto = photos.find(p => p.is_primary) || photos[0];

    supabase
      .from('profiles')
      .update({ avatar_url: primaryPhoto.photo_url })
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (!error) {
          refetchProfile();
        }
      });
  }, [user, profile, photos, photosLoading, refetchProfile]);

  // Pages publiques toujours accessibles (landing, auth, légal, aide, etc.)
  if (isPublicRoute(location.pathname)) {
    return <>{children}</>;
  }

  // Pas connecté — laisser passer
  if (!user) {
    return <>{children}</>;
  }

  // Auth en chargement — loader
  if (authLoading) {
    return <FullScreenLoader />;
  }

  // Profil pas encore chargé — loader
  if (!profile) {
    return <FullScreenLoader />;
  }

  // Photos en cours de chargement — loader (sécurité, pas d'accès tant qu'on ne sait pas)
  if (photosLoading) {
    return <FullScreenLoader />;
  }

  // Pas de photo et pas d'avatar — bloquer l'accès
  const approvedPhotos = photos.filter((p: any) => p.status === 'approved' || !p.status);
  const hasPhoto = approvedPhotos.length > 0 || !!profile.avatar_url;

  if (!hasPhoto) {
    return <ProfilePhotoRequiredScreen />;
  }

  return <>{children}</>;
};

export default ProfilePhotoGuard;
