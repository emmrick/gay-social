import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfilePhotos } from '@/hooks/useProfilePhotos';
import ProfilePhotoRequiredScreen from './ProfilePhotoRequiredScreen';

interface ProfilePhotoGuardProps {
  children: ReactNode;
}

const ProfilePhotoGuard = ({ children }: ProfilePhotoGuardProps) => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { photos, isLoading: photosLoading } = useProfilePhotos(user?.id);

  // Not logged in — allow access to public pages
  if (!user || authLoading) {
    return <>{children}</>;
  }

  // Profile not loaded yet
  if (!profile) {
    return <>{children}</>;
  }

  // Skip for admins
  if (profile.is_verified) {
    // We still check photos, verification doesn't exempt
  }

  // Still loading photos
  if (photosLoading) {
    return null;
  }

  // No photos and no avatar — block access
  const hasPhoto = photos.length > 0 || !!profile.avatar_url;

  if (!hasPhoto) {
    return <ProfilePhotoRequiredScreen />;
  }

  return <>{children}</>;
};

export default ProfilePhotoGuard;
