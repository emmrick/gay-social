/**
 * Admin API Service — single source of truth for all admin data fetching.
 * Centralizes Supabase queries used across admin panels so individual pages
 * never call supabase directly. Keeps RLS-safe queries, consistent error
 * shapes, and lets stores/hooks subscribe without duplicating logic.
 */
import { supabase } from '@/integrations/supabase/client';

export type AdminUserRow = {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  region: string | null;
  bio: string | null;
  is_online: boolean | null;
  last_seen: string | null;
  is_verified: boolean;
  is_premium: boolean | null;
  created_at: string;
  age: number | null;
  hide_online_status: boolean | null;
  hide_last_seen: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type AdminListParams = {
  search?: string;
  filter?: 'all' | 'online' | 'verified' | 'unverified' | 'premium';
  limit?: number;
  offset?: number;
};

export const adminApi = {
  // ---------- USERS ----------
  async listUsers({ search, filter = 'all', limit = 50, offset = 0 }: AdminListParams = {}) {
    let query = supabase
      .from('profiles')
      .select(
        'id,user_id,username,avatar_url,region,bio,is_online,last_seen,is_verified,is_premium,created_at,age,hide_online_status,hide_last_seen,latitude,longitude',
        { count: 'exact' },
      )
      .order('last_seen', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (search?.trim()) {
      query = query.ilike('username', `%${search.trim()}%`);
    }

    if (filter === 'online') {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      query = query.eq('is_online', true).gte('last_seen', fiveMinAgo);
    } else if (filter === 'verified') {
      query = query.eq('is_verified', true);
    } else if (filter === 'unverified') {
      query = query.eq('is_verified', false);
    } else if (filter === 'premium') {
      query = query.eq('is_premium', true);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: (data ?? []) as AdminUserRow[], total: count ?? 0 };
  },

  // ---------- STATS ----------
  async getGlobalStats() {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [usersTotal, usersOnline, usersVerified, signupsToday, reportsPending] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_online', true)
        .gte('last_seen', fiveMinAgo),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_verified', true),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    return {
      usersTotal: usersTotal.count ?? 0,
      usersOnline: usersOnline.count ?? 0,
      usersVerified: usersVerified.count ?? 0,
      signupsToday: signupsToday.count ?? 0,
      reportsPending: reportsPending.count ?? 0,
    };
  },

  // ---------- TASKS ----------
  async listModerationTasks(status: 'pending' | 'reserved' | 'completed' = 'pending', limit = 100) {
    const { data, error } = await supabase
      .from('moderation_tasks')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  // ---------- REPORTS ----------
  async listReports(status: 'pending' | 'resolved' | 'dismissed' = 'pending', limit = 100) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },
};

export type AdminApi = typeof adminApi;
