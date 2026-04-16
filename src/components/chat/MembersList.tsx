import { useState } from 'react';
import { SecureAvatarImg } from '@/components/ui/secure-avatar';
import { MessageCircle, Flag, MoreVertical, UserMinus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ReportUserDialog from './ReportUserDialog';
import ProfileDetailDialog from '@/components/profile/ProfileDetailDialog';
import LiveOnlineDot from '@/components/presence/LiveOnlineDot';
import { useLivePresence } from '@/hooks/useLivePresence';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomGroups } from '@/hooks/useCustomGroups';

type Profile = Tables<'profiles'>;

interface MembersListProps {
  regionCode: string;
  onStartPrivateChat: (userId: string) => void;
  isCustomGroup?: boolean;
  roomId?: string;
}

// Hook to load members from chat_room_members for custom groups
const useGroupMembers = (roomId: string | undefined, regionCode: string) => {
  const isCustomGroup = regionCode.startsWith('GRP-') || regionCode.length > 10;
  const targetId = roomId || regionCode;
  
  return useQuery({
    queryKey: ['group-members-list', targetId],
    queryFn: async (): Promise<Profile[]> => {
      // Use roomId directly if available, otherwise find by region_code
      let chatRoomId = roomId;
      
      if (!chatRoomId) {
        const { data: room } = await supabase
          .from('chat_rooms')
          .select('id')
          .or(`region_code.eq.${regionCode},id.eq.${regionCode}`)
          .maybeSingle();
        chatRoomId = room?.id;
      }

      if (!chatRoomId) return [];

      // Get member user_ids
      const { data: members } = await supabase
        .from('chat_room_members')
        .select('user_id')
        .eq('chat_room_id', chatRoomId);

      if (!members || members.length === 0) return [];

      const userIds = members.map(m => m.user_id);

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds)
        .order('is_online', { ascending: false })
        .order('last_seen', { ascending: false });

      if (error) throw error;
      if (!profiles) return [];

      // Filter out suspended/banned users
      const checks = await Promise.all(
        profiles.map(p => supabase.rpc('is_user_suspended_or_blocked', { _user_id: p.user_id }))
      );
      return profiles.filter((_, i) => checks[i].data !== true);
    },
    enabled: isCustomGroup && !!targetId,
    staleTime: 30_000,
  });
};

const MembersList = ({ regionCode, onStartPrivateChat, isCustomGroup: isCustomProp, roomId }: MembersListProps) => {
  const { user } = useAuth();
  const isCustomGroup = isCustomProp || regionCode.startsWith('GRP-') || regionCode.length > 10;
  const { removeMember } = useCustomGroups();
  
  const { data: regionProfiles, isLoading: regionLoading } = useProfilesByRegion(isCustomGroup ? '' : regionCode);
  const { data: groupProfiles, isLoading: groupLoading } = useGroupMembers(roomId, regionCode);
  
  const profiles = isCustomGroup ? groupProfiles : regionProfiles;
  const isLoading = isCustomGroup ? groupLoading : regionLoading;

  // Check if current user is admin of this group
  const { data: isGroupAdmin } = useQuery({
    queryKey: ['is-group-admin', roomId || regionCode, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const targetId = roomId || regionCode;
      const { data } = await supabase
        .from('chat_room_members')
        .select('role')
        .eq('chat_room_id', targetId)
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.role === 'admin';
    },
    enabled: !!user?.id && isCustomGroup,
  });

  // Filter out current user
  const otherMembers = profiles?.filter((p) => p.user_id !== user?.id) || [];

  const [kickConfirm, setKickConfirm] = useState<{ userId: string; username: string } | null>(null);

  const handleKickMember = () => {
    if (!kickConfirm || !roomId) return;
    removeMember.mutate({ groupId: roomId || regionCode, userId: kickConfirm.userId });
    setKickConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <h2 className="font-display font-semibold text-lg mb-4">Membres</h2>
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
          Aucun autre membre dans ce groupe pour le moment
        </p>
      ) : (
        <div className="space-y-2">
          {otherMembers.map((profile) => (
            <MemberCard
              key={profile.id}
              profile={profile}
              onStartChat={() => onStartPrivateChat(profile.user_id)}
              canKick={!!isGroupAdmin && isCustomGroup}
              onKick={() => setKickConfirm({ userId: profile.user_id, username: profile.username })}
            />
          ))}
        </div>
      )}

      {/* Kick confirmation dialog */}
      <AlertDialog open={!!kickConfirm} onOpenChange={() => setKickConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expulser {kickConfirm?.username} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce membre sera retiré du groupe et ne pourra plus voir les messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleKickMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Expulser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const MemberCard = ({
  profile,
  onStartChat,
  canKick,
  onKick,
}: {
  profile: Profile;
  onStartChat: () => void;
  canKick?: boolean;
  onKick?: () => void;
}) => {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const live = useLivePresence(profile);

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
              <SecureAvatarImg
                src={profile.avatar_url}
                alt={profile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              profile.username.charAt(0).toUpperCase()
            )}
          </div>
          <span className="absolute bottom-0 right-0">
            {live.showIndicator ? (
              <LiveOnlineDot profile={profile} size="lg" borderClassName="border-card" />
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <LiveOnlineDot profile={profile} size="lg" showOffline borderClassName="border-card" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {live.lastSeenText || 'Hors ligne'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{profile.username}</h3>
          <p className="text-sm text-muted-foreground">
            {live.isOnline && !profile.hide_online_status ? (
              <span className="text-green-500">En ligne</span>
            ) : (
              live.lastSeenText || 'Hors ligne'
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onStartChat(); }}>
            <MessageCircle className="w-5 h-5 text-primary" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canKick && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onKick?.(); }}
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Expulser
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={(e) => { e.stopPropagation(); setShowReportDialog(true); }}
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
