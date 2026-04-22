/**
 * Subscribe to typing broadcasts for a list of private conversation partners.
 * Returns a Set of partner user IDs who are currently typing.
 *
 * Uses the same broadcast channel naming as `usePrivateTypingIndicator`
 * (`typing-broadcast-private-<sortedId1>-<sortedId2>`) so it stays compatible
 * with the existing private chat typing system.
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const AUTO_HIDE_MS = 4000;

export const useConversationsTypingStatus = (partnerIds: string[]) => {
  const { user } = useAuth();
  const [typingPartners, setTypingPartners] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Stable key to avoid re-subscribing on every render
  const partnersKey = [...partnerIds].sort().join(',');

  useEffect(() => {
    if (!user?.id || partnerIds.length === 0) return;

    const channels = partnerIds.map((partnerId) => {
      const ids = [user.id, partnerId].sort();
      const key = `private-${ids[0]}-${ids[1]}`;

      const channel = supabase
        .channel(`typing-broadcast-${key}-list`)
        .on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.payload?.user_id !== partnerId) return;
          setTypingPartners((prev) => {
            if (prev.has(partnerId)) return prev;
            const next = new Set(prev);
            next.add(partnerId);
            return next;
          });

          const existing = timeoutsRef.current.get(partnerId);
          if (existing) clearTimeout(existing);
          const t = setTimeout(() => {
            setTypingPartners((prev) => {
              if (!prev.has(partnerId)) return prev;
              const next = new Set(prev);
              next.delete(partnerId);
              return next;
            });
            timeoutsRef.current.delete(partnerId);
          }, AUTO_HIDE_MS);
          timeoutsRef.current.set(partnerId, t);
        })
        .on('broadcast', { event: 'stop_typing' }, (payload) => {
          if (payload.payload?.user_id !== partnerId) return;
          setTypingPartners((prev) => {
            if (!prev.has(partnerId)) return prev;
            const next = new Set(prev);
            next.delete(partnerId);
            return next;
          });
          const existing = timeoutsRef.current.get(partnerId);
          if (existing) {
            clearTimeout(existing);
            timeoutsRef.current.delete(partnerId);
          }
        })
        .subscribe();

      return channel;
    });

    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, partnersKey]);

  return typingPartners;
};
