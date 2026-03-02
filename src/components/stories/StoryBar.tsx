import { useState } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStories, StoryGroup } from '@/hooks/useStories';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import CreateStoryDialog from './CreateStoryDialog';
import StoryViewer from './StoryViewer';

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
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
            <div className="w-12 h-2 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const ownGroup = storyGroups.find(g => g.user_id === user?.id);
  const hasOwnStories = !!ownGroup;

  const handleOpenViewer = (group: StoryGroup, index: number) => {
    setViewingGroup(group);
    setViewingGroupIndex(index);
  };

  const handleOwnStoryClick = () => {
    if (hasOwnStories && ownGroup) {
      // Open viewer for own stories
      const index = storyGroups.indexOf(ownGroup);
      handleOpenViewer(ownGroup, index);
    } else {
      // No stories, open create dialog
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
          {/* Own story button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleOwnStoryClick}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className="relative w-16 h-16">
              {hasOwnStories ? (
                <div className="w-full h-full rounded-full border-2 border-primary p-0.5">
                  <div className="w-full h-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {ownGroup.avatar_url ? (
                      <img
                        src={ownGroup.avatar_url}
                        alt="My story"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">
                        {ownGroup.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full rounded-full bg-muted/50 border-2 border-dashed border-border flex items-center justify-center">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                <Plus className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium max-w-16 truncate">
              {hasOwnStories ? `Ma story (${ownGroup.stories.length})` : 'Ma story'}
            </span>
          </motion.button>

          {/* Other users' stories */}
          {storyGroups
            .filter(g => g.user_id !== user?.id)
            .map((group) => (
              <motion.button
                key={group.user_id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleOpenViewer(group, storyGroups.indexOf(group))}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className={`w-16 h-16 rounded-full p-0.5 ${
                  group.hasUnviewed
                    ? 'bg-gradient-to-br from-primary via-accent to-primary'
                    : 'bg-muted-foreground/30'
                }`}>
                  <div className="w-full h-full rounded-full bg-background p-0.5">
                    <div className="w-full h-full rounded-full bg-muted overflow-hidden flex items-center justify-center">
                      {group.avatar_url ? (
                        <img
                          src={group.avatar_url}
                          alt={group.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">
                          {group.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-medium max-w-16 truncate ${
                  group.hasUnviewed ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {group.username}
                </span>
              </motion.button>
            ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Create story dialog */}
      <CreateStoryDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      {/* Story viewer */}
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
