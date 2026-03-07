import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConversationMute } from '@/hooks/useConversationMute';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MuteButtonProps {
  conversationId: string;
  size?: 'icon' | 'sm';
  className?: string;
}

const MuteButton = ({ conversationId, size = 'icon', className }: MuteButtonProps) => {
  const { isMuted, toggleMute } = useConversationMute(conversationId);

  const handleToggle = () => {
    toggleMute.mutate(undefined, {
      onSuccess: () => {
        toast.success(isMuted ? '🔔 Notifications activées' : '🔕 Notifications désactivées');
      },
    });
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleToggle}
      className={cn('flex-shrink-0', className)}
      title={isMuted ? 'Réactiver les notifications' : 'Couper les notifications'}
    >
      {isMuted ? (
        <BellOff className="w-5 h-5 text-muted-foreground" />
      ) : (
        <Bell className="w-5 h-5" />
      )}
    </Button>
  );
};

export default MuteButton;
