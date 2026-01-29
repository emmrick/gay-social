import { useJoinedGroups } from '@/hooks/useJoinedGroups';
import { useOnlineMemberCounts } from '@/hooks/useOnlineMemberCounts';
import { useRegionMemberCount } from '@/hooks/useRegionMemberCounts';
import { Users, ChevronRight, LogOut, MessageSquare } from 'lucide-react';
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
import { useState } from 'react';

interface JoinedGroupsListProps {
  onSelectGroup: (regionCode: string) => void;
}

const JoinedGroupsList = ({ onSelectGroup }: JoinedGroupsListProps) => {
  const { joinedGroups, leaveGroup } = useJoinedGroups();
  const { data: onlineCounts } = useOnlineMemberCounts();
  const [leaveConfirm, setLeaveConfirm] = useState<string | null>(null);

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

  return (
    <>
      <div className="px-4 pb-6 space-y-2">
        {joinedGroups.map((group, index) => {
          const onlineCount = onlineCounts?.[group.regionCode] || 0;

          return (
            <div
              key={group.regionCode}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group",
                "bg-secondary/30 border border-transparent",
                "hover:bg-secondary hover:border-border",
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
                  "bg-gradient-to-br from-primary to-accent text-white"
                )}>
                  {group.regionCode}
                </div>
                {onlineCount > 0 && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">{onlineCount > 9 ? '9+' : onlineCount}</span>
                  </span>
                )}
              </button>

              {/* Info */}
              <button
                onClick={() => onSelectGroup(group.regionCode)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <h3 className="font-medium text-foreground truncate">
                    {group.regionName}
                  </h3>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLeaveConfirm(group.regionCode);
                  }}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
                <ChevronRight 
                  className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors cursor-pointer" 
                  onClick={() => onSelectGroup(group.regionCode)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave confirmation dialog */}
      <AlertDialog open={!!leaveConfirm} onOpenChange={() => setLeaveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter ce groupe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu pourras toujours le rejoindre à nouveau plus tard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (leaveConfirm) {
                  leaveGroup(leaveConfirm);
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
