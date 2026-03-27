import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

interface ProfileVisit {
  id: string;
  visitor_user_id: string;
  visited_at: string;
  visitor_username: string;
  visitor_avatar: string | null;
  visitor_age: number | null;
}

export const useProfileVisits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['profile-visits', user?.id],
    queryFn: async (): Promise<ProfileVisit[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('profile_visits')
        .select('id, visitor_user_id, visited_at')
        .eq('visited_user_id', user.id)
        .order('visited_at', { ascending: false })
        .limit(100);

      if (error || !data) return [];

      // Fetch visitor profiles
      const visitorIds = data.map(v => v.visitor_user_id);
      if (visitorIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, age')
        .in('user_id', visitorIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return data.map(visit => {
        const profile = profileMap.get(visit.visitor_user_id);
        return {
          id: visit.id,
          visitor_user_id: visit.visitor_user_id,
          visited_at: visit.visited_at,
          visitor_username: profile?.username || 'Anonyme',
          visitor_avatar: profile?.avatar_url || null,
          visitor_age: profile?.age || null,
        };
      });
    },
    enabled: !!user?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-visits-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_visits',
          filter: `visited_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['profile-visits', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
};

export const useRecordProfileVisit = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (visitedUserId: string) => {
      if (!user?.id || user.id === visitedUserId) return;

      await supabase
        .from('profile_visits')
        .upsert(
          {
            visitor_user_id: user.id,
            visited_user_id: visitedUserId,
            visited_at: new Date().toISOString(),
          },
          { onConflict: 'visited_user_id,visitor_user_id' }
        );
    },
  });
};
