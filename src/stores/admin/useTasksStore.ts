/**
 * Tasks Section store slice (Missions / Support / Avis).
 * Cached, realtime-friendly, used by the refactored Tasks panels.
 */
import { create } from 'zustand';
import { tasksApi, type SupportTicketRow, type SupportRatingRow } from '@/services/admin/tasksApi';
import { adminApi } from '@/services/admin/adminApi';

type LoadState = 'idle' | 'loading' | 'success' | 'error';
const TTL_MS = 20_000;
const stale = (ts: number) => Date.now() - ts > TTL_MS;

interface TasksStore {
  // Missions (moderation_tasks)
  missions: any[];
  missionsState: LoadState;
  missionsError: string | null;
  missionsFetchedAt: number;
  fetchMissions: (status?: 'pending' | 'reserved' | 'completed', opts?: { force?: boolean }) => Promise<void>;
  removeMission: (id: string) => void;

  // Support tickets
  tickets: SupportTicketRow[];
  ticketsState: LoadState;
  ticketsFetchedAt: number;
  fetchTickets: (params?: { assignedTo?: string; status?: string }, opts?: { force?: boolean }) => Promise<void>;
  upsertTicket: (row: Partial<SupportTicketRow> & { id: string }) => void;

  // Ratings
  ratings: SupportRatingRow[];
  ratingsState: LoadState;
  ratingsFetchedAt: number;
  ratingsUsernames: Record<string, string>;
  fetchRatings: (userId: string, opts?: { force?: boolean }) => Promise<void>;
}

export const useTasksStore = create<TasksStore>((set, get) => ({
  missions: [],
  missionsState: 'idle',
  missionsError: null,
  missionsFetchedAt: 0,
  fetchMissions: async (status = 'pending', opts) => {
    const { missionsState, missionsFetchedAt } = get();
    if (!opts?.force && missionsState === 'success' && !stale(missionsFetchedAt)) return;
    set({ missionsState: 'loading', missionsError: null });
    try {
      // We list both pending and reserved at once for the panel
      const [pending, reserved] = await Promise.all([
        adminApi.listModerationTasks('pending', 200),
        adminApi.listModerationTasks('reserved', 200),
      ]);
      set({
        missions: [...reserved, ...pending],
        missionsState: 'success',
        missionsFetchedAt: Date.now(),
      });
    } catch (e: any) {
      set({ missionsState: 'error', missionsError: e?.message ?? 'Erreur' });
    }
  },
  removeMission: (id) => set((s) => ({ missions: s.missions.filter((m) => m.id !== id) })),

  tickets: [],
  ticketsState: 'idle',
  ticketsFetchedAt: 0,
  fetchTickets: async (params, opts) => {
    const { ticketsState, ticketsFetchedAt } = get();
    if (!opts?.force && ticketsState === 'success' && !stale(ticketsFetchedAt)) return;
    set({ ticketsState: 'loading' });
    try {
      const tickets = await tasksApi.listSupportTickets(params);
      set({ tickets, ticketsState: 'success', ticketsFetchedAt: Date.now() });
    } catch {
      set({ ticketsState: 'error' });
    }
  },
  upsertTicket: (row) =>
    set((s) => {
      const idx = s.tickets.findIndex((t) => t.id === row.id);
      if (idx === -1) return { tickets: [row as SupportTicketRow, ...s.tickets] };
      const next = [...s.tickets];
      next[idx] = { ...next[idx], ...row } as SupportTicketRow;
      return { tickets: next };
    }),

  ratings: [],
  ratingsState: 'idle',
  ratingsFetchedAt: 0,
  ratingsUsernames: {},
  fetchRatings: async (userId, opts) => {
    const { ratingsState, ratingsFetchedAt } = get();
    if (!opts?.force && ratingsState === 'success' && !stale(ratingsFetchedAt)) return;
    set({ ratingsState: 'loading' });
    try {
      const ratings = await tasksApi.listMyRatings(userId);
      const ids = [...new Set(ratings.map((r) => r.user_id))];
      const usernames = await tasksApi.fetchUsernamesByIds(ids);
      set({
        ratings,
        ratingsUsernames: usernames,
        ratingsState: 'success',
        ratingsFetchedAt: Date.now(),
      });
    } catch {
      set({ ratingsState: 'error' });
    }
  },
}));
