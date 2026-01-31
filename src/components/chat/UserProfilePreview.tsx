import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, MapPin, Clock, Flag, User, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { isUserTrulyOnline } from '@/hooks/useOnlineStatus';
import ReportUserDialog from './ReportUserDialog';
import ProfilePhotoCarousel from './ProfilePhotoCarousel';
import { useProfilePhotos } from '@/hooks/useProfilePhotos';
import { useUserSuspensionStatus } from '@/hooks/useUserSuspensionStatus';

interface UserProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  region: string;
  is_online: boolean;
  last_seen: string | null;
}

interface UserProfilePreviewProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStartPrivateChat: (userId: string) => void;
}

const UserProfilePreview = ({ userId, isOpen, onClose, onStartPrivateChat }: UserProfilePreviewProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const { photos: userPhotos } = useProfilePhotos(userId || undefined);
  const { data: suspensionStatus, isLoading: suspensionLoading } = useUserSuspensionStatus(userId || undefined);
  
  const isUserUnavailable = suspensionStatus?.isBlocked || suspensionStatus?.isSuspended;

  const handleViewFullProfile = () => {
    if (userId) {
      onClose();
      navigate(`/profile/${userId}`);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, bio, region, is_online, last_seen')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      }
      setIsLoading(false);
    };

    if (isOpen && userId) {
      fetchProfile();
    }
  }, [userId, isOpen]);

  const handleStartChat = () => {
    if (userId) {
      onStartPrivateChat(userId);
      onClose();
    }
  };

  const isOwnProfile = user?.id === userId;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle className="sr-only">Profil utilisateur</DialogTitle>
          </DialogHeader>

          {isLoading || suspensionLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isUserUnavailable ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Ban className="w-8 h-8 text-destructive" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold mb-1">Profil indisponible</h3>
                <p className="text-sm text-muted-foreground">
                  Ce compte a été suspendu ou désactivé.
                </p>
              </div>
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
            </div>
          ) : profile ? (
            <div className="flex flex-col gap-4">
              {/* Photo Carousel - Swipeable */}
              <ProfilePhotoCarousel
                photos={
                  userPhotos.length > 0 
                    ? userPhotos.map(p => p.photo_url)
                    : profile.avatar_url 
                      ? [profile.avatar_url] 
                      : []
                }
                username={profile.username}
                className="rounded-lg overflow-hidden -mx-6 -mt-6"
              />

              {/* Username & Status */}
              <div className="text-center pt-2">
                <h3 className="text-xl font-semibold">{profile.username}</h3>
                <Badge 
                  variant={isUserTrulyOnline(profile) ? "default" : "secondary"}
                  className="mt-2"
                >
                  {isUserTrulyOnline(profile) ? '🟢 En ligne' : '⚫ Hors ligne'}
                </Badge>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-center text-muted-foreground text-sm max-w-xs mx-auto">
                  {profile.bio}
                </p>
              )}

              {/* Info */}
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{profile.region}</span>
                </div>
                {profile.is_online !== true && profile.last_seen && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      Vu {format(new Date(profile.last_seen), "d MMM 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 mt-2 w-full">
                {/* View Full Profile Button */}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleViewFullProfile}
                >
                  <User className="w-4 h-4 mr-2" />
                  Voir le profil complet
                </Button>

                {!isOwnProfile && (
                  <div className="flex gap-2 w-full">
                    <Button 
                      variant="gradient" 
                      className="flex-1"
                      onClick={handleStartChat}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message privé
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowReportDialog(true)}
                    >
                      <Flag className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Profil introuvable
            </div>
          )}
        </DialogContent>
      </Dialog>

      {userId && (
        <ReportUserDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          userId={userId}
          username={profile?.username || 'Utilisateur'}
        />
      )}
    </>
  );
};

export default UserProfilePreview;
