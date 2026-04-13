import { useState, memo } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStories, StoryGroup } from '@/hooks/useStories';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import CreateStoryDialog from './CreateStoryDialog';
import StoryViewer from './StoryViewer';
import { SecureAvatarImg } from '@/components/ui/secure-avatar';

const StoryAvatar = memo(({ url, fallback, className }: { url?: string | null; fallback: string; className?: string }) => (
  <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-muted ${className || ''}`}>
    {url ? (
      <SecureAvatarImg src={url} alt="" className="w-full h-full object-cover" />
    ) : (
      <span className="text-base font-bold text-muted-foreground">{fallback}</span>
    )}
  </div>
));
StoryAvatar.displayName = 'StoryAvatar';

const StoryBar = () => {
  const { user } = useAuth();
  const { storyGroups, isLoading } = useStories();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [viewingGroupIndex, setViewingGroupIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="flex gap-3 px-1 py-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-[68px] h-[68px] rounded-full bg-muted animate-pulse" />
            <div className="w-12 h-2 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const ownGroup = storyGroups.find(g => g.user_id === user?.id);
  const hasOwnStories = !!ownGroup;
  const otherGroups = storyGroups.filter(g => g.user_id !== user?.id);

  const handleOpenViewer = (group: StoryGroup, index: number) => {
    setViewingGroup(group);
    setViewingGroupIndex(index);
  };

  const handleOwnStoryClick = () => {
    if (hasOwnStories && ownGroup) {
      handleOpenViewer(ownGroup, storyGroups.indexOf(ownGroup));
    } else {
      setShowCreateDialog(true);
    }
  };

  const handleNextGroup = () => {
    const nextIndex = viewingGroupIndex + 1;
    if (nextIndex < storyGroups.length) {
      setViewingGroup(storyGroups[nextIndex]);
      setViewingGroupIndex(nextIndex);
    } else {
      setViewingGroup(null);
    }
  };

  return (
    <>
      <ScrollArea className="w-full">
        <div className="flex gap-3 px-1 py-2">
          {/* Own story */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleOwnStoryClick}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="relative w-[68px] h-[68px]">
              {hasOwnStories ? (
                <div className="w-full h-full rounded-full p-[2.5px] bg-gradient-to-br from-primary via-accent to-primary">
                  <div className="w-full h-full rounded-full bg-background p-[2px]">
                    <StoryAvatar url={ownGroup.avatar_url} fallback={ownGroup.username?.charAt(0).toUpperCase() || '?'} />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow-sm">
                <Plus className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium max-w-[68px] truncate leading-tight">
              {hasOwnStories ? `Ma story` : 'Ma story'}
            </span>
          </motion.button>

          {/* Others */}
          {otherGroups.map((group) => {
            const idx = storyGroups.indexOf(group);
            return (
              <motion.button
                key={group.user_id}
                whileTap={{ scale: 0.93 }}
                onClick={() => handleOpenViewer(group, idx)}
                className="flex flex-col items-center gap-1 flex-shrink-0"
              >
                <div className={`w-[68px] h-[68px] rounded-full p-[2.5px] ${
                  group.hasUnviewed
                    ? 'bg-gradient-to-br from-primary via-accent to-primary'
                    : 'bg-muted-foreground/20'
                }`}>
                  <div className="w-full h-full rounded-full bg-background p-[2px]">
                    <StoryAvatar url={group.avatar_url} fallback={group.username.charAt(0).toUpperCase()} />
                  </div>
                </div>
                <span className={`text-[10px] font-medium max-w-[68px] truncate leading-tight ${
                  group.hasUnviewed ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {group.username}
                </span>
              </motion.button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <CreateStoryDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      {viewingGroup && (
        <StoryViewer
          group={viewingGroup}
          onClose={() => setViewingGroup(null)}
          onNextGroup={handleNextGroup}
          onAddStory={() => { setViewingGroup(null); setShowCreateDialog(true); }}
        />
      )}
    </>
  );
};

export default StoryBar;
