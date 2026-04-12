import { lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useChatRoom } from '@/hooks/useChatRooms';
import { useAnnouncementChannel } from '@/hooks/useAnnouncementChannel';
import { useRegionMemberCount } from '@/hooks/useRegionMemberCounts';
import { usePrivateConversations } from '@/hooks/usePrivateConversations';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';

const ChatRoom = lazy(() => import('@/components/chat/ChatRoom'));
const AnnouncementChannel = lazy(() => import('@/components/chat/AnnouncementChannel'));

const GroupChatPage = () => {
  const { regionCode } = useParams<{ regionCode: string }>();
  const navigate = useNavigate();
  const { getOrCreateConversation } = usePrivateConversations();

  const isAnnouncement = regionCode === 'announcement';
  const { data: roomData } = useChatRoom(isAnnouncement ? '' : (regionCode || ''));
  const { data: announcementChannel } = useAnnouncementChannel();
  const { total: memberCount } = useRegionMemberCount(regionCode || '');

  const handleBack = () => navigate('/messages', { replace: true });

  const handleStartPrivateChat = async (userId: string) => {
    try {
      await getOrCreateConversation.mutateAsync(userId);
      navigate(`/messages/${userId}`);
    } catch (error) {
      console.error('Error starting private chat:', error);
    }
  };

  useMobileNavigation({
    onBack: handleBack,
    enabled: true,
    enableSwipeBack: true,
  });

  if (!regionCode) return null;

  // Announcement channel
  if (isAnnouncement && announcementChannel) {
    return (
      <Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
          className="min-h-screen w-full overflow-hidden"
        >
          <AnnouncementChannel roomId={announcementChannel.id} onBack={handleBack} />
        </motion.div>
      </Suspense>
    );
  }

  // Regular group chat
  if (roomData) {
    return (
      <Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
          className="min-h-screen"
        >
          <ChatRoom
            roomId={roomData.id}
            regionCode={roomData.region_code}
            regionName={roomData.is_custom ? (roomData.custom_name || roomData.region_name) : roomData.region_name}
            memberCount={memberCount}
            isCustomGroup={roomData.is_custom}
            onBack={handleBack}
            onStartPrivateChat={handleStartPrivateChat}
          />
        </motion.div>
      </Suspense>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
};

export default GroupChatPage;
