/**
 * Tasks-section API additions (Missions / Support / Avis).
 * Centralized so the UI never queries Supabase directly.
 */
import { supabase } from '@/integrations/supabase/client';

export type SupportTicketRow = {
  id: string;
  ticket_number: string;
  user_id: string;
  assigned_to: string | null;
  status: string;
  subject: string | null;
  created_at: string;
  closed_at: string | null;
  rating_emoji: string | null;
  rating_comment: string | null;
  rated_at: string | null;
};

export type SupportRatingRow = {
  id: string;
  ticket_number: string;
  rating_emoji: string;
  rating_comment: string | null;
  rated_at: string;
  user_id: string;
  closed_at: string | null;
};

export const tasksApi = {
  async listSupportTickets(params: { assignedTo?: string; status?: string; limit?: number } = {}) {
    const { assignedTo, status, limit = 100 } = params;
    let q = supabase
      .from('support_tickets' as any)
      .select('id,ticket_number,user_id,assigned_to,status,subject,created_at,closed_at,rating_emoji,rating_comment,rated_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (assignedTo) q = q.eq('assigned_to', assignedTo);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as SupportTicketRow[];
  },

  async listMyRatings(userId: string) {
    const { data, error } = await supabase
      .from('support_tickets' as any)
      .select('id,ticket_number,rating_emoji,rating_comment,rated_at,user_id,closed_at')
      .eq('assigned_to', userId)
      .not('rating_emoji', 'is', null)
      .order('rated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as SupportRatingRow[];
  },

  async fetchUsernamesByIds(userIds: string[]) {
    if (!userIds.length) return {} as Record<string, string>;
    const { data } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('user_id', userIds);
    const map: Record<string, string> = {};
    data?.forEach((p) => {
      map[p.user_id] = p.username;
    });
    return map;
  },
};
