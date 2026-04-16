import { useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useOnlineHeartbeat = (user: User | null) => {
  useEffect(() => {
    if (!user) return;

    const updateOnlineStatus = async () => {
      await supabase
        .from('profiles')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('user_id', user.id);
    };

    updateOnlineStatus();

    // Heartbeat every 60s — keeps "online" fresh and the realtime UPDATE
    // event flowing to all subscribers (presenceStore + queries).
    const heartbeatInterval = setInterval(updateOnlineStatus, 60 * 1000);

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await updateOnlineStatus();
      } else {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    };

    const handleBeforeUnload = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch {
        // Ignore errors during unload
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);
};
