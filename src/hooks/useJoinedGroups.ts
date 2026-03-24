import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { deductCredits, checkSufficientCredits, getDynamicCreditCost } from '@/hooks/useCredits';
import { toast } from 'sonner';

const MAX_GROUPS = 3;
const STORAGE_KEY = 'joined_groups';

interface JoinedGroup {
  regionCode: string;
  regionName: string;
  joinedAt: string;
  isHomeGroup?: boolean;
  isMuted?: boolean;
}

export const useJoinedGroups = () => {
  const { user, profile } = useAuth();
  const [joinedGroups, setJoinedGroups] = useState<JoinedGroup[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get user's home region code from their profile
  const homeRegionCode = profile?.region || null;

  // Load from localStorage on mount and auto-join home group
  useEffect(() => {
    if (user?.id && homeRegionCode) {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      let groups: JoinedGroup[] = [];
      
      if (stored) {
        try {
          groups = JSON.parse(stored);
        } catch {
          groups = [];
        }
      }

      // Auto-join home group if not already in the list
      const hasHomeGroup = groups.some(g => g.regionCode === homeRegionCode);
      if (!hasHomeGroup) {
        // Find the region name from chat_rooms
        supabase
          .from('chat_rooms')
          .select('region_name')
          .eq('region_code', homeRegionCode)
          .maybeSingle()
          .then(({ data }) => {
            const homeGroup: JoinedGroup = {
              regionCode: homeRegionCode,
              regionName: data?.region_name || homeRegionCode,
              joinedAt: new Date().toISOString(),
              isHomeGroup: true,
            };
            const updatedGroups = [homeGroup, ...groups.filter(g => g.regionCode !== homeRegionCode)];
            localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(updatedGroups));
            setJoinedGroups(updatedGroups);
            setIsInitialized(true);
          });
      } else {
        // Mark home group
        const updatedGroups = groups.map(g => ({
          ...g,
          isHomeGroup: g.regionCode === homeRegionCode,
        }));
        setJoinedGroups(updatedGroups);
        setIsInitialized(true);
      }
    } else if (user?.id) {
      // User without profile region yet
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      if (stored) {
        try {
          setJoinedGroups(JSON.parse(stored));
        } catch {
          setJoinedGroups([]);
        }
      }
      setIsInitialized(true);
    }
  }, [user?.id, homeRegionCode]);

  // Save to localStorage when groups change
  const saveGroups = useCallback((groups: JoinedGroup[]) => {
    if (user?.id) {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(groups));
      setJoinedGroups(groups);
    }
  }, [user?.id]);

  // Send system notification message when joining a group
  const sendJoinNotification = useCallback(async (regionCode: string, username: string) => {
    try {
      // Get chat room id
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('region_code', regionCode)
        .maybeSingle();

      if (room && user?.id) {
        // Insert a system message
        await supabase
          .from('messages')
          .insert({
            chat_room_id: room.id,
            sender_id: user.id,
            content: `👋 ${username} a rejoint le groupe !`,
            message_type: 'system',
            is_private: false,
          });
      }
    } catch (error) {
      console.error('Error sending join notification:', error);
    }
  }, [user?.id]);

  const joinGroup = useCallback(async (
    regionCode: string, 
    regionName: string,
    skipCreditCheck: boolean = false
  ): Promise<{ success: boolean; reason?: string }> => {
    if (!user?.id) {
      return { success: false, reason: 'not_authenticated' };
    }

    // Check if already joined
    if (joinedGroups.some(g => g.regionCode === regionCode)) {
      return { success: true }; // Already joined
    }

    // Check max limit
    if (joinedGroups.length >= MAX_GROUPS) {
      return { success: false, reason: 'max_limit' };
    }

    // Check if this is the home group (free) or extra group (costs credits)
    const isHomeGroup = regionCode === homeRegionCode;

    // If not home group and not skipping check, charge credits
    if (!isHomeGroup && !skipCreditCheck) {
      const cost = CREDIT_COSTS.join_extra_group;
      const hasCredits = await checkSufficientCredits(user.id, cost);
      
      if (!hasCredits) {
        return { success: false, reason: 'insufficient_credits' };
      }

      // Deduct credits
      const result = await deductCredits(
        user.id,
        cost,
        'join_extra_group',
        `Rejoindre le groupe ${regionName}`
      );

      if (!result.success) {
        return { success: false, reason: 'deduction_failed' };
      }
    }

    const newGroup: JoinedGroup = {
      regionCode,
      regionName,
      joinedAt: new Date().toISOString(),
      isHomeGroup,
    };

    saveGroups([...joinedGroups, newGroup]);

    // Send join notification
    if (profile?.username) {
      sendJoinNotification(regionCode, profile.username);
    }

    return { success: true };
  }, [user?.id, profile?.username, joinedGroups, homeRegionCode, saveGroups, sendJoinNotification]);

  const leaveGroup = useCallback((regionCode: string) => {
    // Prevent leaving home group
    const group = joinedGroups.find(g => g.regionCode === regionCode);
    if (group?.isHomeGroup) {
      toast.error('Impossible de quitter ton groupe régional');
      return;
    }
    saveGroups(joinedGroups.filter(g => g.regionCode !== regionCode));
  }, [joinedGroups, saveGroups]);

  const toggleMuteGroup = useCallback(async (regionCode: string) => {
    if (!user?.id) return;

    const currentGroup = joinedGroups.find(g => g.regionCode === regionCode);
    const newMutedState = !currentGroup?.isMuted;

    // Update local state
    const updatedGroups = joinedGroups.map(g => 
      g.regionCode === regionCode 
        ? { ...g, isMuted: newMutedState }
        : g
    );
    saveGroups(updatedGroups);

    // Sync with database
    try {
      if (newMutedState) {
        // Insert or update mute preference
        await supabase
          .from('group_mute_preferences')
          .upsert({
            user_id: user.id,
            region_code: regionCode,
            is_muted: true,
          }, { onConflict: 'user_id,region_code' });
      } else {
        // Remove mute preference
        await supabase
          .from('group_mute_preferences')
          .delete()
          .eq('user_id', user.id)
          .eq('region_code', regionCode);
      }

      if (newMutedState) {
        toast.success('Groupe mis en sourdine');
      } else {
        toast.success('Notifications réactivées');
      }
    } catch (error) {
      console.error('Error updating mute preference:', error);
      // Revert on error
      saveGroups(joinedGroups);
      toast.error('Erreur lors de la mise à jour');
    }
  }, [user?.id, joinedGroups, saveGroups]);

  const isGroupMuted = useCallback((regionCode: string) => {
    return joinedGroups.find(g => g.regionCode === regionCode)?.isMuted || false;
  }, [joinedGroups]);

  const isJoined = useCallback((regionCode: string) => {
    return joinedGroups.some(g => g.regionCode === regionCode);
  }, [joinedGroups]);

  const isHomeGroup = useCallback((regionCode: string) => {
    return regionCode === homeRegionCode;
  }, [homeRegionCode]);

  const canJoinMore = joinedGroups.length < MAX_GROUPS;

  return {
    joinedGroups,
    joinGroup,
    leaveGroup,
    toggleMuteGroup,
    isGroupMuted,
    isJoined,
    isHomeGroup,
    canJoinMore,
    maxGroups: MAX_GROUPS,
    remainingSlots: MAX_GROUPS - joinedGroups.length,
    homeRegionCode,
    isInitialized,
  };
};
