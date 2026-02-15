import { useJoinedGroups } from '@/hooks/useJoinedGroups';
import { useCustomGroups } from '@/hooks/useCustomGroups';
import { useOnlineMemberCounts } from '@/hooks/useOnlineMemberCounts';
import { useUnreadMentions } from '@/hooks/useUnreadMentions';
import { useChatRooms } from '@/hooks/useChatRooms';
import { Users, ChevronRight, LogOut, MessageSquare, AtSign, Home, Loader2, BellOff, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { toast } from 'sonner';

interface JoinedGroupsListProps {
  onSelectGroup: (regionCode: string) => void;
}

const JoinedGroupsList = ({ onSelectGroup }: JoinedGroupsListProps) => {
  const { joinedGroups, leaveGroup, toggleMuteGroup, isGroupMuted, isInitialized } = useJoinedGroups();
  const { customGroups, isLoading: customLoading, leaveGroup: leaveCustomGroup } = useCustomGroups();
  const { data: onlineCounts } = useOnlineMemberCounts();
  const { data: chatRooms } = useChatRooms();
  const { getMentionCount } = useUnreadMentions();
  const [leaveConfirm, setLeaveConfirm] = useState<{ regionCode: string; regionName: string; isCustom?: boolean } | null>(null);

  // Create a map of region code to chat room id
  const regionToRoomId = new Map(
    chatRooms?.map(room => [room.region_code, room.id]) || []
  );

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (joinedGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-5">
          <MessageSquare className="w-10 h-10 text-primary" />
        </div>
        <h3 className="font-display font-semibold text-foreground text-lg mb-2">Aucun groupe rejoint</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Utilise le bouton + ci-dessus pour rejoindre un groupe de ta région
        </p>
      </div>
    );
  }

  const handleLeaveAttempt = (regionCode: string, regionName: string, isHomeGroup?: boolean) => {
    if (isHomeGroup) {
      toast.error('Impossible de quitter ton groupe régional', {
        description: 'Ce groupe correspond à ta région de profil.',
      });
      return;
    }
    setLeaveConfirm({ regionCode, regionName });
  };

  return (
    <>
      <div className="px-4 pb-6 space-y-2">
        {joinedGroups.map((group, index) => {
          const onlineCount = onlineCounts?.[group.regionCode] || 0;
          const roomId = regionToRoomId.get(group.regionCode);
          const mentionCount = roomId ? getMentionCount(roomId) : 0;

          return (
            <div
              key={group.regionCode}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group",
                "bg-secondary/30 border border-transparent",
                "hover:bg-secondary hover:border-border",
                group.isHomeGroup && "border-green-500/30 bg-green-500/5",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Group icon with region code */}
              <button
                onClick={() => onSelectGroup(group.regionCode)}
                className="relative flex-shrink-0"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm",
                  group.isHomeGroup 
                    ? "bg-green-500 text-white"
                    : "bg-gradient-to-br from-primary to-accent text-white"
                )}>
                  {group.regionCode}
                </div>
                {/* Home indicator */}
                {group.isHomeGroup && (
                  <span className="absolute -top-1 -left-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                    <Home className="w-3 h-3 text-white" />
                  </span>
                )}
                {/* Online indicator */}
                {onlineCount > 0 && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">{onlineCount > 9 ? '9+' : onlineCount}</span>
                  </span>
                )}
                {/* Mention indicator */}
                {mentionCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center animate-pulse">
                    <AtSign className="w-3 h-3 text-white" />
                  </span>
                )}
              </button>

              {/* Info */}
              <button
                onClick={() => onSelectGroup(group.regionCode)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <h3 className="font-medium text-foreground truncate text-sm">
                      {group.regionName}
                    </h3>
                    {group.isHomeGroup && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full font-medium flex-shrink-0">
                        Ma région
                      </span>
                    )}
                  </div>
                  {mentionCount > 0 && (
                    <span className="flex-shrink-0 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      {mentionCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {onlineCount > 0 ? (
                      <span className="text-green-500 font-medium">{onlineCount} en ligne</span>
                    ) : (
                      'Aucun membre en ligne'
                    )}
                  </span>
                </div>
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          group.isMuted 
                            ? "text-amber-500 hover:text-amber-600" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMuteGroup(group.regionCode);
                        }}
                      >
                        {group.isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {group.isMuted ? 'Réactiver les notifications' : 'Mettre en sourdine'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {!group.isHomeGroup && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLeaveAttempt(group.regionCode, group.regionName, group.isHomeGroup);
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                )}
                <ChevronRight 
                  className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors cursor-pointer" 
                  onClick={() => onSelectGroup(group.regionCode)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Groups Section */}
      {customGroups.length > 0 && (
        <div className="px-4 pb-6 space-y-2">
          <div className="flex items-center gap-2 px-1 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Groupes personnalisés</h3>
          </div>
          {customGroups.map((group) => (
            <div
              key={group.id}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group",
                "bg-secondary/30 border border-primary/10",
                "hover:bg-secondary hover:border-border",
                "animate-fade-in"
              )}
            >
              <button
                onClick={() => onSelectGroup(group.id)}
                className="relative flex-shrink-0"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center font-bold text-sm text-white">
                  {group.custom_name.charAt(0).toUpperCase()}
                </div>
              </button>

              <button
                onClick={() => onSelectGroup(group.id)}
                className="flex-1 min-w-0 text-left"
              >
                <h3 className="font-medium text-foreground truncate">{group.custom_name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>{group.memberCount} membre{(group.memberCount || 0) > 1 ? 's' : ''}</span>
                </div>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          isGroupMuted(group.id)
                            ? "text-amber-500 hover:text-amber-600" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMuteGroup(group.id);
                        }}
                      >
                        {isGroupMuted(group.id) ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isGroupMuted(group.id) ? 'Réactiver les notifications' : 'Mettre en sourdine'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLeaveConfirm({ regionCode: group.id, regionName: group.custom_name, isCustom: true });
                  }}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
                <ChevronRight 
                  className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors cursor-pointer" 
                  onClick={() => onSelectGroup(group.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leave confirmation dialog */}
      <AlertDialog open={!!leaveConfirm} onOpenChange={() => setLeaveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter {leaveConfirm?.regionName} ?</AlertDialogTitle>
            <AlertDialogDescription>
              {leaveConfirm?.isCustom
                ? 'Tu ne recevras plus les messages de ce groupe.'
                : 'Tu pourras rejoindre ce groupe à nouveau, mais cela te coûtera 5 crédits.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (leaveConfirm) {
                  if (leaveConfirm.isCustom) {
                    leaveCustomGroup.mutate(leaveConfirm.regionCode);
                  } else {
                    leaveGroup(leaveConfirm.regionCode);
                  }
                  setLeaveConfirm(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default JoinedGroupsList;
