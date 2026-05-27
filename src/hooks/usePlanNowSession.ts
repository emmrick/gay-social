import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { deductCredits } from './useCredits';
import { useDynamicCreditCosts } from './useDynamicCreditCosts';
import { toast } from 'sonner';

const SESSION_DURATION_MINUTES = 30;
const DEFAULT_COST = 5;

interface PlanNowSession {
  id: string;
  user_id: string;
  started_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'cancelled';
  credits_spent: number;
}

/* ------------------------------ Current user ------------------------------ */

export const usePlanNowSession = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: costs } = useDynamicCreditCosts();
  const cost = costs?.plan_now_activation ?? DEFAULT_COST;

  const { data: activeSession, isLoading } = useQuery({
    queryKey: ['plan-now-session', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('plan_now_sessions' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as PlanNowSession | null;
    },
    enabled: !!user?.id,
    refetchInterval: 60_000,
  });

  // Auto-invalidate when expiration is reached
  useEffect(() => {
    if (!activeSession?.expires_at) return;
    const ms = new Date(activeSession.expires_at).getTime() - Date.now();
    if (ms <= 0) {
      queryClient.invalidateQueries({ queryKey: ['plan-now-session', user?.id] });
      return;
    }
    const t = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['plan-now-session', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['plan-now-active-users'] });
    }, ms + 1500);
    return () => clearTimeout(t);
  }, [activeSession?.expires_at, queryClient, user?.id]);

  const activate = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non authentifié');
      const result = await deductCredits(
        user.id,
        cost,
        'plan_now_activation',
        `Activation Plan Now (${SESSION_DURATION_MINUTES} min)`,
      );
      if (!result.success) throw new Error(result.error || 'Crédits insuffisants');

      const expiresAt = new Date(Date.now() + SESSION_DURATION_MINUTES * 60_000).toISOString();
      const { error } = await supabase.from('plan_now_sessions' as any).insert({
        user_id: user.id,
        expires_at: expiresAt,
        credits_spent: cost,
        status: 'active',
      } as any);
      if (error) throw error;

      // Notifie les profils proches (best-effort, ignore les erreurs)
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, maximumAge: 60_000 }),
        );
        void supabase.functions.invoke('notify-plan-now-nearby', {
          body: { lat: pos.coords.latitude, lon: pos.coords.longitude },
        });
      } catch { /* géo refusée — pas de notif aux proches */ }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-now-session', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['plan-now-active-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-credits', user?.id] });
      toast.success('⚡ Plan Now activé !', {
        description: `Ton profil est mis en avant pendant ${SESSION_DURATION_MINUTES} minutes.`,
      });
    },
    onError: (err: Error) => toast.error('Erreur', { description: err.message }),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      if (!user?.id || !activeSession?.id) return;
      const { error } = await supabase
        .from('plan_now_sessions' as any)
        .update({ status: 'cancelled' } as any)
        .eq('id', activeSession.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-now-session', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['plan-now-active-users'] });
      toast.success('Plan Now désactivé');
    },
  });

  return {
    activeSession,
    isActive: !!activeSession,
    isLoading,
    activate: activate.mutate,
    isActivating: activate.isPending,
    cancel: cancel.mutate,
    isCancelling: cancel.isPending,
    cost,
    durationMinutes: SESSION_DURATION_MINUTES,
  };
};

/* ------------------------------ Countdown UI ------------------------------ */

export const usePlanNowCountdown = (expiresAt: string | null | undefined) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return useMemo(() => {
    if (!expiresAt) return { remainingMs: 0, label: '' };
    const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return {
      remainingMs: remaining,
      label: `${minutes}:${seconds.toString().padStart(2, '0')}`,
    };
  }, [expiresAt, now]);
};

/* ----------------------- Global set of active users ----------------------- */

export const usePlanNowActiveUsers = () => {
  const queryClient = useQueryClient();

  const { data: ids = new Set<string>() } = useQuery({
    queryKey: ['plan-now-active-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_now_sessions' as any)
        .select('user_id, expires_at')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());
      if (error) return new Set<string>();
      return new Set<string>((data as any[]).map((r) => r.user_id));
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('plan-now-active-users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plan_now_sessions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['plan-now-active-users'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return ids;
};

export const useIsPlanNowActive = (userId?: string | null) => {
  const ids = usePlanNowActiveUsers();
  return !!userId && ids.has(userId);
};
