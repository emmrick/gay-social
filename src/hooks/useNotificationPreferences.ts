import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ERROR_COOLDOWN_MS = 3000;

interface NotificationPreferences {
  id: string;
  user_id: string;
  push_private_messages: boolean;
  push_group_messages: boolean;
  push_favorites: boolean;
  push_reactions: boolean;
  push_album_shares: boolean;
  push_matches: boolean;
  push_mentions: boolean;
  push_credits: boolean;
  push_verification: boolean;
  suggestion_decisions_inapp: boolean;
  suggestion_decisions_push: boolean;
  suggestion_decisions_email: boolean;
  sound_enabled: boolean;
  notification_sound: string;
  created_at: string;
  updated_at: string;
}

const defaultPreferences = {
  push_private_messages: true,
  push_group_messages: true,
  push_favorites: true,
  push_reactions: true,
  push_album_shares: true,
  push_matches: true,
  push_mentions: true,
  push_credits: true,
  push_verification: true,
  suggestion_decisions_inapp: true,
  suggestion_decisions_push: true,
  suggestion_decisions_email: true,
  sound_enabled: true,
  notification_sound: 'default',
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const cooldownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        window.clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const triggerCooldown = useCallback(() => {
    setIsCoolingDown(true);
    if (cooldownTimerRef.current) window.clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = window.setTimeout(() => {
      setIsCoolingDown(false);
      cooldownTimerRef.current = null;
    }, ERROR_COOLDOWN_MS);
  }, []);

  const query = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async (): Promise<NotificationPreferences> => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            ...defaultPreferences,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user,
  });

  // Tracks keys currently being toggled — prevents race when user spams a switch
  const inFlightRef = useRef<Set<string>>(new Set());

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (updates) => {
      // Optimistic update — guarantees UI reflects user intent immediately
      // and that the next toggle reads the freshest value (no stale-read race).
      await queryClient.cancelQueries({ queryKey: ['notification-preferences', user?.id] });
      const previous = queryClient.getQueryData<NotificationPreferences>(['notification-preferences', user?.id]);
      if (previous) {
        queryClient.setQueryData(['notification-preferences', user?.id], { ...previous, ...updates });
      }
      return { previous };
    },
    onSuccess: (data) => {
      // Sync with server response (handles updated_at etc.)
      queryClient.setQueryData(['notification-preferences', user?.id], data);
    },
    onError: (error: any, _updates, context) => {
      // Rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(['notification-preferences', user?.id], context.previous);
      }
      console.error('Error updating preferences:', error);
      const description =
        error?.message && typeof error.message === 'string'
          ? error.message
          : 'Vérifie ta connexion et réessaie dans quelques secondes.';
      toast.error('Échec de la mise à jour', {
        description,
      });
      triggerCooldown();
    },
  });

  const togglePreference = useCallback(async (key: keyof typeof defaultPreferences) => {
    if (isCoolingDown) return;
    // Per-key lock : empêche la double mutation concurrente sur la même clé
    if (inFlightRef.current.has(key)) return;

    // Lit la valeur LA PLUS RÉCENTE depuis le cache (pas la prop figée query.data)
    const current = queryClient.getQueryData<NotificationPreferences>(['notification-preferences', user?.id]);
    if (!current) return;

    inFlightRef.current.add(key);
    try {
      await updatePreferences.mutateAsync({ [key]: !current[key] });
    } catch {
      /* géré par onError */
    } finally {
      inFlightRef.current.delete(key);
    }
  }, [isCoolingDown, queryClient, updatePreferences, user?.id]);

  return {
    preferences: query.data || {
      ...defaultPreferences,
      id: '',
      user_id: user?.id || '',
      created_at: '',
      updated_at: '',
    } as NotificationPreferences,
    isLoading: query.isLoading,
    error: query.error,
    updatePreferences: updatePreferences.mutate,
    togglePreference,
    isUpdating: updatePreferences.isPending || isCoolingDown,
    hasError: updatePreferences.isError,
  };
};
