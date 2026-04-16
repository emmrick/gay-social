/**
 * Centralized admin store (Zustand).
 * Holds users, stats, tasks, reports + caches with TTL.
 * Used by every admin panel via selectors — no panel calls Supabase directly.
 */
import { create } from 'zustand';
import { adminApi, type AdminUserRow, type AdminListParams } from '@/services/admin/adminApi';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

interface AdminStats {
  usersTotal: number;
  usersOnline: number;
  usersVerified: number;
  signupsToday: number;
  reportsPending: number;
}

interface AdminStoreState {
  // Users
  users: AdminUserRow[];
  usersTotal: number;
  usersState: LoadState;
  usersError: string | null;
  usersFetchedAt: number;

  // Stats
  stats: AdminStats | null;
  statsState: LoadState;
  statsFetchedAt: number;

  // Tasks
  tasks: any[];
  tasksState: LoadState;
  tasksFetchedAt: number;

  // Reports
  reports: any[];
  reportsState: LoadState;
  reportsFetchedAt: number;

  // Actions
  fetchUsers: (params?: AdminListParams, opts?: { force?: boolean }) => Promise<void>;
  upsertUser: (row: Partial<AdminUserRow> & { user_id: string }) => void;
  removeUser: (userId: string) => void;

  fetchStats: (opts?: { force?: boolean }) => Promise<void>;
  bumpStat: (key: keyof AdminStats, delta: number) => void;

  fetchTasks: (status?: 'pending' | 'reserved' | 'completed', opts?: { force?: boolean }) => Promise<void>;
  fetchReports: (status?: 'pending' | 'resolved' | 'dismissed', opts?: { force?: boolean }) => Promise<void>;
}

const TTL_MS = 30_000; // 30s cache before we refetch unless forced

const stale = (ts: number) => Date.now() - ts > TTL_MS;

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  users: [],
  usersTotal: 0,
  usersState: 'idle',
  usersError: null,
  usersFetchedAt: 0,

  stats: null,
  statsState: 'idle',
  statsFetchedAt: 0,

  tasks: [],
  tasksState: 'idle',
  tasksFetchedAt: 0,

  reports: [],
  reportsState: 'idle',
  reportsFetchedAt: 0,

  fetchUsers: async (params, opts) => {
    const { usersState, usersFetchedAt } = get();
    if (!opts?.force && usersState === 'success' && !stale(usersFetchedAt)) return;
    set({ usersState: 'loading', usersError: null });
    try {
      const { rows, total } = await adminApi.listUsers(params);
      set({ users: rows, usersTotal: total, usersState: 'success', usersFetchedAt: Date.now() });
    } catch (e: any) {
      set({ usersState: 'error', usersError: e?.message ?? 'Erreur inconnue' });
    }
  },

  upsertUser: (row) =>
    set((s) => {
      const idx = s.users.findIndex((u) => u.user_id === row.user_id);
      if (idx === -1) return s;
      const next = [...s.users];
      next[idx] = { ...next[idx], ...row } as AdminUserRow;
      return { users: next };
    }),

  removeUser: (userId) => set((s) => ({ users: s.users.filter((u) => u.user_id !== userId) })),

  fetchStats: async (opts) => {
    const { statsState, statsFetchedAt } = get();
    if (!opts?.force && statsState === 'success' && !stale(statsFetchedAt)) return;
    set({ statsState: 'loading' });
    try {
      const stats = await adminApi.getGlobalStats();
      set({ stats, statsState: 'success', statsFetchedAt: Date.now() });
    } catch {
      set({ statsState: 'error' });
    }
  },

  bumpStat: (key, delta) =>
    set((s) => (s.stats ? { stats: { ...s.stats, [key]: Math.max(0, s.stats[key] + delta) } } : s)),

  fetchTasks: async (status = 'pending', opts) => {
    const { tasksState, tasksFetchedAt } = get();
    if (!opts?.force && tasksState === 'success' && !stale(tasksFetchedAt)) return;
    set({ tasksState: 'loading' });
    try {
      const tasks = await adminApi.listModerationTasks(status);
      set({ tasks, tasksState: 'success', tasksFetchedAt: Date.now() });
    } catch {
      set({ tasksState: 'error' });
    }
  },

  fetchReports: async (status = 'pending', opts) => {
    const { reportsState, reportsFetchedAt } = get();
    if (!opts?.force && reportsState === 'success' && !stale(reportsFetchedAt)) return;
    set({ reportsState: 'loading' });
    try {
      const reports = await adminApi.listReports(status);
      set({ reports, reportsState: 'success', reportsFetchedAt: Date.now() });
    } catch {
      set({ reportsState: 'error' });
    }
  },
}));

// ---------- Selectors (memo-friendly) ----------
export const selectUsers = (s: AdminStoreState) => s.users;
export const selectStats = (s: AdminStoreState) => s.stats;
export const selectTasks = (s: AdminStoreState) => s.tasks;
export const selectReports = (s: AdminStoreState) => s.reports;
