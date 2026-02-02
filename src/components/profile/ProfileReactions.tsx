import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useProfileReactions, useToggleProfileReaction, PROFILE_REACTION_EMOJIS } from '@/hooks/useProfileReactions';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import { toast } from 'sonner';

interface ProfileReactionsProps {
  profileUserId: string;
  className?: string;
}

const ProfileReactions = ({ profileUserId, className }: ProfileReactionsProps) => {
  const { user } = useAuth();
  const { data: reactions, isLoading } = useProfileReactions(profileUserId);
  const toggleReaction = useToggleProfileReaction();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { checkCredits } = useCreditCheck();

  const isOwnProfile = user?.id === profileUserId;

  const handleToggleReaction = async (emoji: string) => {
    if (!user || isOwnProfile) return;
    
    // Check if it's an existing reaction (removing - free) or new (adding - costs credits)
    const existingReaction = reactions?.find(r => r.emoji === emoji && r.hasReacted);
    
    // Only check credits if adding a new reaction
    if (!existingReaction) {
      if (!checkCredits('profile_reaction')) {
        setPickerOpen(false);
        return;
      }
    }
    
    try {
      await toggleReaction.mutateAsync({ profileUserId, emoji });
    } catch (error: any) {
      if (error.message === 'INSUFFICIENT_CREDITS') {
        // Dialog already shown by checkCredits
      } else {
        toast.error('Erreur lors de la réaction');
      }
    }
    setPickerOpen(false);
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Display existing reactions */}
      {reactions?.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleToggleReaction(reaction.emoji)}
          disabled={isOwnProfile || toggleReaction.isPending}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
            reaction.hasReacted
              ? "bg-primary/20 border border-primary/40 hover:bg-primary/30"
              : "bg-secondary/80 border border-border hover:bg-secondary",
            isOwnProfile && "cursor-default hover:bg-secondary/80"
          )}
        >
          <span className="text-base">{reaction.emoji}</span>
          <span className={cn(
            "font-medium",
            reaction.hasReacted ? "text-primary" : "text-foreground"
          )}>
            {reaction.count}
          </span>
        </button>
      ))}

      {/* Add reaction button */}
      {!isOwnProfile && user && (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-8 w-8 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="flex gap-1">
              {PROFILE_REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleToggleReaction(emoji)}
                  disabled={toggleReaction.isPending}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors text-xl"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Empty state for own profile */}
      {isOwnProfile && (!reactions || reactions.length === 0) && (
        <p className="text-sm text-muted-foreground">
          Aucune réaction pour le moment
        </p>
      )}
    </div>
  );
};

export default ProfileReactions;
