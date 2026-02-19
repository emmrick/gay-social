import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface CreateEventParams {
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
}

export const useGroupEvents = (roomId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ['group-events', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_events')
        .select('*')
        .eq('chat_room_id', roomId)
        .order('event_date', { ascending: true });

      if (error) throw error;

      // Get RSVPs for each event
      const eventIds = (data || []).map(e => e.id);
      if (eventIds.length === 0) return [];

      const { data: rsvps } = await supabase
        .from('group_event_rsvps')
        .select('*, profiles:user_id(username, avatar_url)')
        .in('event_id', eventIds);

      // Get creator profiles
      const creatorIds = [...new Set((data || []).map(e => e.created_by))];
      const { data: creators } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', creatorIds);

      const creatorMap = new Map(creators?.map(c => [c.user_id, c.username]) || []);

      return (data || []).map(event => ({
        ...event,
        creatorName: creatorMap.get(event.created_by) || 'Inconnu',
        rsvps: (rsvps || []).filter(r => r.event_id === event.id),
        goingCount: (rsvps || []).filter(r => r.event_id === event.id && r.status === 'going').length,
        maybeCount: (rsvps || []).filter(r => r.event_id === event.id && r.status === 'maybe').length,
      }));
    },
    enabled: !!roomId,
  });

  // Realtime
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`events-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_events', filter: `chat_room_id=eq.${roomId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['group-events', roomId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_event_rsvps' }, () => {
        queryClient.invalidateQueries({ queryKey: ['group-events', roomId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, queryClient]);

  const createEvent = useMutation({
    mutationFn: async (params: CreateEventParams) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('group_events')
        .insert({
          chat_room_id: roomId,
          title: params.title,
          description: params.description || null,
          event_date: params.eventDate,
          location: params.location || null,
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-events', roomId] });
      toast.success('Événement créé !');
    },
    onError: () => toast.error("Erreur lors de la création de l'événement"),
  });

  const rsvpEvent = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: 'going' | 'maybe' | 'not_going' }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('group_event_rsvps')
        .upsert({ event_id: eventId, user_id: user.id, status }, { onConflict: 'event_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-events', roomId] });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from('group_events').delete().eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-events', roomId] });
      toast.success('Événement supprimé');
    },
  });

  const getUserRsvp = (eventId: string) => {
    if (!user?.id || !events) return null;
    const event = events.find((e: any) => e.id === eventId);
    return event?.rsvps?.find((r: any) => r.user_id === user.id)?.status || null;
  };

  return {
    events: events || [],
    isLoading,
    createEvent,
    rsvpEvent,
    deleteEvent,
    getUserRsvp,
  };
};
