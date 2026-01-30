import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';

const NotificationPermissionBanner = () => {
  const { user } = useAuth();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('notification-banner-dismissed') === 'true';
  });
  const [isRequesting, setIsRequesting] = useState(false);

  // Don't show if not logged in, not supported, already granted/denied, or dismissed
  if (!user || !isSupported || permission !== 'default' || dismissed) {
    return null;
  }

  const handleRequest = async () => {
    setIsRequesting(true);
    await requestPermission();
    setIsRequesting(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('notification-banner-dismissed', 'true');
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 px-4 py-2">
      <div className="flex items-center justify-between gap-3 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 flex-1">
          <Bell className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-sm text-foreground">
            Active les notifications pour ne rien manquer !
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={handleRequest}
            disabled={isRequesting}
            className="text-xs"
          >
            {isRequesting ? 'Activation...' : 'Activer'}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-7 w-7"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionBanner;
