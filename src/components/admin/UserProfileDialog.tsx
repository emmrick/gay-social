import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  User,
  MapPin,
  Calendar,
  Clock,
  Crown,
  ShieldCheck,
  ShieldAlert,
  Eye,
  MessageCircle,
  Ruler,
  Weight,
  Heart,
  Users,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useProfilePhotos } from '@/hooks/useProfilePhotos';
import ProfilePhotoCarousel from '@/components/chat/ProfilePhotoCarousel';
import ModerationHistoryPanel from './ModerationHistoryPanel';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  age: number | null;
  region: string;
  bio: string | null;
  is_online: boolean | null;
  is_verified: boolean;
  is_premium: boolean | null;
  created_at: string;
  last_seen: string | null;
  height?: number | null;
  weight?: number | null;
  body_type?: string | null;
  sexual_position?: string | null;
  looking_for?: string[] | null;
  tribes?: string[] | null;
}

interface UserProfileDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserProfileDialog = ({ user, open, onOpenChange }: UserProfileDialogProps) => {
  const { photos } = useProfilePhotos(user?.user_id);
  const [showHistory, setShowHistory] = useState(false);

  if (!user) return null;

  const allPhotos = photos.length > 0 
    ? photos.map(p => p.photo_url)
    : user.avatar_url 
      ? [user.avatar_url] 
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Profil de {user.username}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[90vh]">
          {/* Photo Carousel */}
          <ProfilePhotoCarousel
            photos={allPhotos}
            username={user.username}
            className="rounded-t-lg"
          />

          <div className="p-6 space-y-4">
            {/* Username & Status */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  {user.username}
                  {user.is_verified && (
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  )}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  {user.age && <span>{user.age} ans</span>}
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {user.region}
                  </span>
                </div>
              </div>
              <Badge variant={user.is_online ? "default" : "secondary"}>
                {user.is_online ? '🟢 En ligne' : '⚫ Hors ligne'}
              </Badge>
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-muted-foreground text-sm">{user.bio}</p>
            )}

            <Separator />

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {user.height && (
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  <span>{user.height} cm</span>
                </div>
              )}
              {user.weight && (
                <div className="flex items-center gap-2">
                  <Weight className="w-4 h-4 text-muted-foreground" />
                  <span>{user.weight} kg</span>
                </div>
              )}
              {user.body_type && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{user.body_type}</span>
                </div>
              )}
              {user.sexual_position && (
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-muted-foreground" />
                  <span>{user.sexual_position}</span>
                </div>
              )}
            </div>

            {/* Looking for */}
            {user.looking_for && user.looking_for.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Recherche</p>
                <div className="flex flex-wrap gap-1">
                  {user.looking_for.map((item) => (
                    <Badge key={item} variant="secondary" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tribes */}
            {user.tribes && user.tribes.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Tribus</p>
                <div className="flex flex-wrap gap-1">
                  {user.tribes.map((tribe) => (
                    <Badge key={tribe} variant="outline" className="text-xs">
                      {tribe}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Metadata */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Inscrit le {format(new Date(user.created_at), 'dd MMMM yyyy', { locale: fr })}</span>
              </div>
              {user.last_seen && !user.is_online && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    Vu {formatDistanceToNow(new Date(user.last_seen), { addSuffix: true, locale: fr })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                {user.is_verified ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span className="text-green-500">Identité vérifiée</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-orange-500" />
                    <span className="text-orange-500">Non vérifié</span>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Moderation History */}
            <ModerationHistoryPanel 
              targetUserId={user.user_id} 
              targetUsername={user.username}
              compact 
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDialog;
