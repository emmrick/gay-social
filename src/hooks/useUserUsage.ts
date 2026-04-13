import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FREE_LIMITS } from './useSubscription';
import { startOfWeek, startOfDay, isAfter } from 'date-fns';

interface UserUsage {
  id: string;
  user_id: string;
  ephemeral_media_count: number;
  ephemeral_media_last_reset: string | null;
  profile_photos_viewed: number;
  profile_photos_last_reset: string | null;
  nearby_profiles_viewed: number;
  nearby_profiles_last_reset: string | null;
  conversations_started: number;
  conversations_last_reset: string | null;
  saved_messages_count: number;
  albums_count: number;
}

export const useUserUsage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const limits = FREE_LIMITS;

  // Fetch or create user usage record
  const query = useQuery({
    queryKey: ['user-usage', user?.id],
    queryFn: async (): Promise<UserUsage | null> => {
      if (!user) return null;

      // Try to get existing usage record
      const { data: existing, error: fetchError } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        return existing as UserUsage;
      }

      // Create new usage record if doesn't exist
      const { data: created, error: createError } = await supabase
        .from('user_usage')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (createError) throw createError;
      return created as UserUsage;
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Helper to check if we need to reset weekly counters
  const shouldResetWeekly = (lastReset: string | null): boolean => {
    if (!lastReset) return true;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return isAfter(weekStart, new Date(lastReset));
  };

  // Helper to check if we need to reset daily counters
  const shouldResetDaily = (lastReset: string | null): boolean => {
    if (!lastReset) return true;
    const dayStart = startOfDay(new Date());
    return isAfter(dayStart, new Date(lastReset));
  };

  // Get current ephemeral media count (reset daily)
  const getEphemeralMediaCount = (): number => {
    if (!query.data) return 0;
    if (shouldResetDaily(query.data.ephemeral_media_last_reset)) {
      return 0;
    }
    return query.data.ephemeral_media_count;
  };

  // Get current conversations count (reset weekly)
  const getConversationsCount = (): number => {
    if (!query.data) return 0;
    if (shouldResetWeekly(query.data.conversations_last_reset)) {
      return 0;
    }
    return query.data.conversations_started;
  };

  // Get current profile photos viewed (reset daily)
  const getProfilePhotosCount = (): number => {
    if (!query.data) return 0;
    if (shouldResetDaily(query.data.profile_photos_last_reset)) {
      return 0;
    }
    return query.data.profile_photos_viewed;
  };

  // Get nearby profiles viewed (reset daily)
  const getNearbyProfilesCount = (): number => {
    if (!query.data) return 0;
    if (shouldResetDaily(query.data.nearby_profiles_last_reset)) {
      return 0;
    }
    return query.data.nearby_profiles_viewed;
  };

  // Check limits
  const canSendEphemeralMedia = (): boolean => {
    return getEphemeralMediaCount() < limits.ephemeralMediaPerDay;
  };

  const canStartConversation = (): boolean => {
    return getConversationsCount() < limits.conversationsPerWeek;
  };

  const canViewNearbyProfiles = (): boolean => {
    return getNearbyProfilesCount() < limits.nearbyProfiles;
  };

  const canAddSavedMessage = (): boolean => {
    return (query.data?.saved_messages_count || 0) < 10;
  };

  const canCreateAlbum = (): boolean => {
    return (query.data?.albums_count || 0) < limits.maxAlbums;
  };

  // Increment mutations
  const incrementEphemeralMedia = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const resetNeeded = shouldResetDaily(query.data?.ephemeral_media_last_reset || null);
      const newCount = resetNeeded ? 1 : (query.data?.ephemeral_media_count || 0) + 1;

      const { error } = await supabase
        .from('user_usage')
        .update({
          ephemeral_media_count: newCount,
          ephemeral_media_last_reset: resetNeeded ? new Date().toISOString() : query.data?.ephemeral_media_last_reset,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-usage', user?.id] });
    },
  });

  const incrementConversations = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const resetNeeded = shouldResetWeekly(query.data?.conversations_last_reset || null);
      const newCount = resetNeeded ? 1 : (query.data?.conversations_started || 0) + 1;

      const { error } = await supabase
        .from('user_usage')
        .update({
          conversations_started: newCount,
          conversations_last_reset: resetNeeded ? new Date().toISOString() : query.data?.conversations_last_reset,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-usage', user?.id] });
    },
  });

  const incrementNearbyProfiles = useMutation({
    mutationFn: async (count: number = 1) => {
      if (!user) throw new Error('Not authenticated');

      const resetNeeded = shouldResetDaily(query.data?.nearby_profiles_last_reset || null);
      const newCount = resetNeeded ? count : (query.data?.nearby_profiles_viewed || 0) + count;

      const { error } = await supabase
        .from('user_usage')
        .update({
          nearby_profiles_viewed: newCount,
          nearby_profiles_last_reset: resetNeeded ? new Date().toISOString() : query.data?.nearby_profiles_last_reset,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-usage', user?.id] });
    },
  });

  const incrementSavedMessages = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_usage')
        .update({
          saved_messages_count: (query.data?.saved_messages_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-usage', user?.id] });
    },
  });

  const decrementSavedMessages = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_usage')
        .update({
          saved_messages_count: Math.max(0, (query.data?.saved_messages_count || 1) - 1),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-usage', user?.id] });
    },
  });

  const incrementAlbums = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_usage')
        .update({
          albums_count: (query.data?.albums_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-usage', user?.id] });
    },
  });

  const decrementAlbums = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_usage')
        .update({
          albums_count: Math.max(0, (query.data?.albums_count || 1) - 1),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-usage', user?.id] });
    },
  });

  return {
    usage: query.data,
    isLoading: query.isLoading,
    limits,
    // Current counts
    ephemeralMediaCount: getEphemeralMediaCount(),
    conversationsCount: getConversationsCount(),
    profilePhotosCount: getProfilePhotosCount(),
    nearbyProfilesCount: getNearbyProfilesCount(),
    savedMessagesCount: query.data?.saved_messages_count || 0,
    albumsCount: query.data?.albums_count || 0,
    // Check functions
    canSendEphemeralMedia,
    canStartConversation,
    canViewNearbyProfiles,
    canAddSavedMessage,
    canCreateAlbum,
    // Increment functions
    incrementEphemeralMedia: incrementEphemeralMedia.mutateAsync,
    incrementConversations: incrementConversations.mutateAsync,
    incrementNearbyProfiles: incrementNearbyProfiles.mutateAsync,
    incrementSavedMessages: incrementSavedMessages.mutateAsync,
    decrementSavedMessages: decrementSavedMessages.mutateAsync,
    incrementAlbums: incrementAlbums.mutateAsync,
    decrementAlbums: decrementAlbums.mutateAsync,
  };
};
