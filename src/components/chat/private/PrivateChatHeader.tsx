/**
 * PrivateChatHeader — refonte Phase A "Premium iMessage".
 * Glassmorphism plus marqué, avatar avec halo, typo affinée.
 * Logique métier inchangée : props et handlers identiques.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Flag, Ban, UserCheck, Sparkles } from 'lucide-react';
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
      className={cn(
        'relative flex-shrink-0 flex items-center gap-2 px-2 py-2.5 z-20',
        'bg-background/70 backdrop-blur-2xl backdrop-saturate-150',
        'border-b border-border/40',
        'before:absolute before:inset-x-0 before:bottom-0 before:h-px',
        'before:bg-gradient-to-r before:from-transparent before:via-border/60 before:to-transparent',
      )}
      style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))' }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="flex-shrink-0 h-10 w-10 rounded-full hover:bg-muted/60 active:scale-95 transition-transform"
      >
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
          className="flex items-center gap-3 flex-1 min-w-0 rounded-2xl px-1.5 py-1 -mx-1.5 hover:bg-muted/40 active:scale-[0.99] transition-all"
        >
          <div className="relative flex-shrink-0">
            {/* Halo de présence */}
            {presence.isOnline && (
              <div className="absolute inset-0 -m-0.5 rounded-full bg-emerald-500/30 animate-pulse" />
            )}
            <div
              className={cn(
                'relative w-11 h-11 rounded-full overflow-hidden',
                'ring-2 ring-background',
                presence.isOnline ? 'shadow-[0_0_0_2px_hsl(142_71%_45%/0.5)]' : 'shadow-[0_0_0_1px_hsl(var(--border))]',
              )}
            >
              {resolvedAvatar ? (
                <img
                  src={resolvedAvatar}
                  alt={otherUserProfile?.username || ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/15 to-accent/20 flex items-center justify-center text-primary font-bold text-base">
                  {otherUserProfile?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <h2 className="font-display font-semibold text-[15.5px] text-foreground truncate leading-tight tracking-tight">
              {otherUserProfile?.username}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isOtherTyping ? (
                <>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '240ms' }} />
                  </span>
                  <span className="text-[11.5px] text-primary font-medium italic">en train d'écrire</span>
                </>
              ) : presence.isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_hsl(142_71%_45%/0.6)]" />
                  <span className="text-[11.5px] text-emerald-500 font-medium">Actif maintenant</span>
                </>
              ) : (
                <span className="text-[11.5px] text-muted-foreground/80">Hors ligne</span>
              )}
            </div>
          </div>
          {isStaffUser && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex-shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              Staff
            </span>
          )}
        </button>
      )}

      <MuteButton conversationId={otherUserId} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0 rounded-full hover:bg-muted/60 active:scale-95 transition-transform"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl">
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
