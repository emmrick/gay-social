import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Flag, Ban, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MuteButton from '../MuteButton';
import { useLivePresence } from '@/hooks/useLivePresence';
import LiveOnlineDot from '@/components/presence/LiveOnlineDot';
import { cn } from '@/lib/utils';

interface PrivateChatHeaderProps {
  otherUserId: string;
  otherUserProfile: any;
  resolvedAvatar: string | null;
  profileLoading: boolean;
  isOtherTyping: boolean;
  hasBlocked: boolean | undefined;
  isStaffUser: boolean | undefined;
  onBack: () => void;
  onUnblock: () => void;
  isUnblocking: boolean;
  onShowBlockDialog: () => void;
  onShowReportDialog: () => void;
}

const PrivateChatHeader = ({
  otherUserId,
  otherUserProfile,
  resolvedAvatar,
  profileLoading,
  isOtherTyping,
  hasBlocked,
  isStaffUser,
  onBack,
  onUnblock,
  isUnblocking,
  onShowBlockDialog,
  onShowReportDialog,
}: PrivateChatHeaderProps) => {
  const navigate = useNavigate();
  const presence = useLivePresence(otherUserProfile);

  return (
    <header
      className="flex-shrink-0 flex items-center gap-2.5 px-2 py-2.5 bg-card/95 backdrop-blur-lg border-b border-border/60 z-20 shadow-[0_1px_3px_hsl(220_30%_20%/0.04)]"
      style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}
    >
      <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0 h-10 w-10 rounded-full hover:bg-secondary">
        <ArrowLeft className="w-5 h-5" />
      </Button>

      {profileLoading ? (
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="w-11 h-11 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ) : (
        <button
          onClick={() => navigate(`/profile/${otherUserId}`)}
          className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity active:scale-[0.98]"
        >
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-muted ring-1 ring-border/30">
              {resolvedAvatar ? (
                <img
                  src={resolvedAvatar}
                  alt={otherUserProfile?.username || ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center text-primary font-bold text-base">
                  {otherUserProfile?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5">
              <LiveOnlineDot profile={otherUserProfile} size="sm" borderClassName="border-card" />
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-[15px] text-foreground truncate leading-tight font-body">
              {otherUserProfile?.username}
            </h2>
            <p className="text-[12px] mt-0.5">
              {isOtherTyping ? (
                <span className="text-primary font-medium animate-pulse">écrit…</span>
              ) : presence.isOnline ? (
                <span className="text-green-500 font-medium">En ligne</span>
              ) : (
                <span className="text-muted-foreground">Hors ligne</span>
              )}
            </p>
          </div>
        </button>
      )}

      <MuteButton conversationId={otherUserId} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0 rounded-full hover:bg-secondary">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {isStaffUser ? (
            <DropdownMenuItem disabled className="text-muted-foreground">
              <Ban className="w-4 h-4 mr-2.5" />
              Membre de l'équipe (non blocable)
            </DropdownMenuItem>
          ) : hasBlocked ? (
            <DropdownMenuItem onClick={onUnblock} disabled={isUnblocking}>
              <UserCheck className="w-4 h-4 mr-2.5" />
              Débloquer
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onShowBlockDialog}>
              <Ban className="w-4 h-4 mr-2.5" />
              Bloquer
            </DropdownMenuItem>
          )}
          {!isStaffUser && (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onShowReportDialog}>
              <Flag className="w-4 h-4 mr-2.5" />
              Signaler
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default PrivateChatHeader;
