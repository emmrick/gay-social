import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';

export interface PrivacySettings {
  hideOnlineStatus: boolean;
  hideLastSeen: boolean;
}

export const usePrivacySettings = () => {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const [settings, setSettings] = useState<PrivacySettings>({
    hideOnlineStatus: false,
    hideLastSeen: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load current privacy settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setSettings({ hideOnlineStatus: false, hideLastSeen: false });
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('hide_online_status, hide_last_seen')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        setSettings({
          hideOnlineStatus: data?.hide_online_status || false,
          hideLastSeen: data?.hide_last_seen || false,
        });
      } catch (error) {
        console.error('Error loading privacy settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const updateSetting = useCallback(async (
    setting: keyof PrivacySettings,
    value: boolean
  ) => {
    if (!user) return;
    
    // Only admins can use privacy settings now (VIP removed)
    if (!isAdmin) {
      toast.error('Cette fonctionnalité n\'est plus disponible');
      return;
    }

    const dbField = setting === 'hideOnlineStatus' ? 'hide_online_status' : 'hide_last_seen';
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [dbField]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, [setting]: value }));
      toast.success(value ? 'Confidentialité activée' : 'Confidentialité désactivée');
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  }, [user, isAdmin]);

  const toggleHideOnlineStatus = useCallback(() => {
    updateSetting('hideOnlineStatus', !settings.hideOnlineStatus);
  }, [settings.hideOnlineStatus, updateSetting]);

  const toggleHideLastSeen = useCallback(() => {
    updateSetting('hideLastSeen', !settings.hideLastSeen);
  }, [settings.hideLastSeen, updateSetting]);

  return {
    settings,
    isLoading,
    isAdmin,
    toggleHideOnlineStatus,
    toggleHideLastSeen,
    updateSetting,
  };
};
