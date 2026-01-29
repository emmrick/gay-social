import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageCircle, Flag, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfilesByRegion } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Tables } from '@/integrations/supabase/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ReportUserDialog from './ReportUserDialog';
import ProfileDetailDialog from '@/components/profile/ProfileDetailDialog';

type Profile = Tables<'profiles'>;

interface MembersListProps {
  regionCode: string;
  onStartPrivateChat: (userId: string) => void;
}

const MembersList = ({ regionCode, onStartPrivateChat }: MembersListProps) => {
  const { user } = useAuth();
  const { data: profiles, isLoading } = useProfilesByRegion(regionCode);

  // Filter out current user
  const otherMembers = profiles?.filter((p) => p.user_id !== user?.id) || [];

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <h2 className="font-display font-semibold text-lg mb-4">Membres en ligne</h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="font-display font-semibold text-lg mb-4">
        Membres ({otherMembers.length})
      </h2>

      {otherMembers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun autre membre dans cette région pour le moment
        </p>
      ) : (
        <div className="space-y-2">
          {otherMembers.map((profile) => (
            <MemberCard
              key={profile.id}
              profile={profile}
              onStartChat={() => onStartPrivateChat(profile.user_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MemberCard = ({
  profile,
  onStartChat,
}: {
  profile: Profile;
  onStartChat: () => void;
}) => {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  const handleCardClick = () => {
    setShowProfileDialog(true);
  };

  return (
    <>
      <button
        onClick={handleCardClick}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-secondary/50 transition-colors group text-left"
      >
        {/* Avatar */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold overflow-hidden">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              profile.username.charAt(0).toUpperCase()
            )}
          </div>
          {profile.is_online === true && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{profile.username}</h3>
          <p className="text-sm text-muted-foreground">
            {profile.is_online === true ? (
              <span className="text-green-500">En ligne</span>
            ) : profile.last_seen ? (
              `Vu ${formatDistanceToNow(new Date(profile.last_seen), {
                addSuffix: true,
                locale: fr,
              })}`
            ) : (
              'Hors ligne'
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={onStartChat}>
            <MessageCircle className="w-5 h-5 text-primary" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => setShowReportDialog(true)}
              >
                <Flag className="w-4 h-4 mr-2" />
                Signaler
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </button>

      <ProfileDetailDialog
        profile={profile}
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        onStartChat={onStartChat}
        onReport={() => {
          setShowProfileDialog(false);
          setShowReportDialog(true);
        }}
      />

      <ReportUserDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        userId={profile.user_id}
        username={profile.username}
      />
    </>
  );
};

export default MembersList;
