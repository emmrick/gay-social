import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageCircle, Flag, MapPin, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tables } from '@/integrations/supabase/types';
import { useLivePresence } from '@/hooks/useLivePresence';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';

type Profile = Tables<'profiles'>;

interface ProfileDetailDialogProps {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartChat: () => void;
  onReport: () => void;
}

const ProfileDetailDialog = ({
  profile,
  open,
  onOpenChange,
  onStartChat,
  onReport,
}: ProfileDetailDialogProps) => {
  const resolvedAvatar = useAvatarUrl(profile?.avatar_url);
  const live = useLivePresence(profile);

  if (!profile) return null;

  const handleStartChat = () => {
    onStartChat();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md [&>button.absolute]:top-3 [&>button.absolute]:right-3">
        <DialogHeader>
          <DialogTitle className="sr-only">Profil de {profile.username}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
              {resolvedAvatar ? (
                <img
                  src={resolvedAvatar}
                  alt={profile.username}
                  width={96}
                  height={96}
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10" />
            )}
            </div>
            {live.showIndicator && (
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-background" />
            )}
          </div>

          {/* Username */}
          <div className="text-center">
            <h2 className="text-xl font-display font-bold text-foreground">
              {profile.username}
            </h2>
            <p className={`text-sm ${live.showIndicator ? 'text-green-500' : 'text-muted-foreground'}`}>
              {live.detailedLastSeenText}
            </p>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="w-full bg-secondary/50 rounded-lg p-4">
              <p className="text-sm text-foreground text-center italic">
                "{profile.bio}"
              </p>
            </div>
          )}

          {/* Info cards */}
          <div className="w-full grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
              <MapPin className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Région</p>
                <p className="text-sm font-medium text-foreground">{profile.region}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
              <Clock className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Membre depuis</p>
                <p className="text-sm font-medium text-foreground">
                  {formatDistanceToNow(new Date(profile.created_at), {
                    addSuffix: false,
                    locale: fr,
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="w-full flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={onReport}
            >
              <Flag className="w-4 h-4 mr-2" />
              Signaler
            </Button>
            <Button className="flex-1" onClick={handleStartChat}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDetailDialog;
