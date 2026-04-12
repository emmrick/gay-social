import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import UnifiedPageHeader from '@/components/layout/UnifiedPageHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PrivateChatList = lazy(() => import('@/components/chat/PrivateChatList'));
const JoinedGroupsList = lazy(() => import('@/components/chat/JoinedGroupsList'));
const MemberSearch = lazy(() => import('@/components/chat/MemberSearch'));
const GroupPickerDialog = lazy(() => import('@/components/chat/GroupPickerDialog'));
const CreateGroupDialog = lazy(() => import('@/components/chat/CreateGroupDialog'));

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getOrCreateConversation } = usePrivateConversations();
  const { markAsRead } = useUnreadMessages();
  const [messageSubTab, setMessageSubTab] = useState<'conversations' | 'groups' | 'archived'>('conversations');
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

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

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col relative min-h-0">
      <UnifiedPageHeader
        onNavigateToCredits={() => navigate('/credits')}
        onNavigateToProfile={() => navigate('/profile')}
        rightContent={
          messageSubTab === 'groups' ? (
            <div className="flex items-center gap-1.5">
              <Button onClick={() => setShowCreateGroup(true)} size="icon" variant="outline" className="rounded-full" title="Créer un groupe">
                <Users className="w-4 h-4" />
              </Button>
              <Button onClick={() => setShowGroupPicker(true)} size="icon" className="rounded-full bg-primary hover:bg-primary/90 shadow-lg" title="Rejoindre un groupe régional">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <Button onClick={() => setShowMemberSearch(true)} size="icon" className="rounded-full bg-primary hover:bg-primary/90 shadow-lg">
              <Plus className="w-5 h-5" />
            </Button>
          )
        }
        bottomContent={
          <div className="px-5 pb-3">
            <Tabs value={messageSubTab} onValueChange={(v) => setMessageSubTab(v as typeof messageSubTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="conversations">Messages</TabsTrigger>
                <TabsTrigger value="groups" className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Groupes
                </TabsTrigger>
                <TabsTrigger value="archived">Archives</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />

      <ScrollArea className="flex-1 min-h-0">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
          {messageSubTab === 'groups' ? (
            <JoinedGroupsList onSelectGroup={handleSelectGroup} />
          ) : (
            <PrivateChatList
              onSelectConversation={handleSelectConversation}
              selectedUserId={null}
              showArchived={messageSubTab === 'archived'}
            />
          )}
        </Suspense>
      </ScrollArea>

      <Suspense fallback={null}>
        <GroupPickerDialog open={showGroupPicker} onOpenChange={setShowGroupPicker} onGroupJoined={handleSelectGroup} />
        <CreateGroupDialog open={showCreateGroup} onOpenChange={setShowCreateGroup} onGroupCreated={(groupId) => navigate(`/chat/${groupId}`)} />
      </Suspense>

      <AnimatePresence>
        {showMemberSearch && (
          <Suspense fallback={null}>
            <MemberSearch
              onSelectUser={(userId) => { handleStartPrivateChat(userId); setShowMemberSearch(false); }}
              onClose={() => setShowMemberSearch(false)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessagesPage;
