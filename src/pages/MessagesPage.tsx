import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useJoinedGroups } from '@/hooks/useJoinedGroups';
import { useCustomGroups } from '@/hooks/useCustomGroups';
import { useMessagesFilters } from '@/hooks/useMessagesFilters';
import UnifiedPageHeader from '@/components/layout/UnifiedPageHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessagesTabs from '@/components/messages/MessagesTabs';
import MessagesFAB from '@/components/messages/MessagesFAB';
import MessagesStoriesRow from '@/components/messages/MessagesStoriesRow';
import MessagesEmptyState from '@/components/messages/MessagesEmptyState';

const PrivateChatList = lazy(() => import('@/components/chat/PrivateChatList'));
const JoinedGroupsList = lazy(() => import('@/components/chat/JoinedGroupsList'));
const MemberSearch = lazy(() => import('@/components/chat/MemberSearch'));
const GroupPickerDialog = lazy(() => import('@/components/chat/GroupPickerDialog'));
const CreateGroupDialog = lazy(() => import('@/components/chat/CreateGroupDialog'));

const SuspenseFallback = () => (
  <div className="flex-1 flex items-center justify-center py-12">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tab, setTabSafe } = useMessagesFilters();

  const { getOrCreateConversation, archivedConversations } = usePrivateConversations();
  const { getTotalUnreadCount, markAsRead } = useUnreadMessages();
  const { joinedGroups } = useJoinedGroups();

  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  if (!user) return null;

  const handleStartPrivateChat = async (userId: string) => {
    try {
      await getOrCreateConversation.mutateAsync(userId);
      navigate(`/messages/${userId}`);
    } catch (error) {
      console.error('Error starting private chat:', error);
    }
  };

  const handleSelectConversation = (userId: string, hasPendingSnap?: boolean) => {
    markAsRead.mutate(userId);
    navigate(`/messages/${userId}`, { state: { openSnap: !!hasPendingSnap } });
  };

  const handleSelectGroup = (regionCode: string) => {
    navigate(`/chat/${regionCode}`);
  };

  const handleSelectSnap = (userId: string) => {
    markAsRead.mutate(userId);
    navigate(`/messages/${userId}`, { state: { openSnap: true } });
  };

  const totalUnread = getTotalUnreadCount();
  const archivedCount = archivedConversations.length;
  const groupsCount = joinedGroups?.length ?? 0;

  return (
    <div className="flex-1 flex flex-col relative min-h-0">
      <UnifiedPageHeader
        onNavigateToCredits={() => navigate('/credits')}
        onNavigateToProfile={() => navigate('/profile')}
        bottomContent={
          <MessagesTabs
            value={tab}
            onValueChange={setTabSafe}
            unreadCount={totalUnread}
            archivedCount={archivedCount}
            groupsCount={groupsCount}
          />
        }
      />

      <ScrollArea className="flex-1 min-h-0">
        <Suspense fallback={<SuspenseFallback />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {tab === 'conversations' && (
                <>
                  <MessagesStoriesRow onSelectSnap={handleSelectSnap} />
                  <PrivateChatList
                    onSelectConversation={handleSelectConversation}
                    selectedUserId={null}
                    showArchived={false}
                  />
                </>
              )}

              {tab === 'archived' && (
                <PrivateChatList
                  onSelectConversation={handleSelectConversation}
                  selectedUserId={null}
                  showArchived
                />
              )}

              {tab === 'groups' && (
                groupsCount === 0 ? (
                  <MessagesEmptyState
                    variant="groups"
                    onPrimaryAction={() => setShowGroupPicker(true)}
                    onSecondaryAction={() => setShowCreateGroup(true)}
                  />
                ) : (
                  <JoinedGroupsList onSelectGroup={handleSelectGroup} />
                )
              )}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </ScrollArea>

      <MessagesFAB
        onNewChat={() => setShowMemberSearch(true)}
        onCreateGroup={() => setShowCreateGroup(true)}
        onJoinGroup={() => setShowGroupPicker(true)}
      />

      <Suspense fallback={null}>
        <GroupPickerDialog
          open={showGroupPicker}
          onOpenChange={setShowGroupPicker}
          onGroupJoined={handleSelectGroup}
        />
        <CreateGroupDialog
          open={showCreateGroup}
          onOpenChange={setShowCreateGroup}
          onGroupCreated={(groupId) => navigate(`/chat/${groupId}`)}
        />
      </Suspense>

      <AnimatePresence>
        {showMemberSearch && (
          <Suspense fallback={null}>
            <MemberSearch
              onSelectUser={(userId) => {
                handleStartPrivateChat(userId);
                setShowMemberSearch(false);
              }}
              onClose={() => setShowMemberSearch(false)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessagesPage;
