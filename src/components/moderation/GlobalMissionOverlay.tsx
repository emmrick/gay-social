import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, X, Euro, Loader2, Phone, Timer,
  ChevronRight, CheckCircle2, Headphones, PauseCircle, Power
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  useNextTask,
  useActiveTask,
  useReserveTask,
  useRefuseTask,
  useCompleteTask,
  useMissionToggle,
  getTaskTypeLabel,
  getTaskTypeSection,
  getTaskEntityId,
  formatCentsReward,
  invalidateAllTaskQueries,
  startMissionRefuseCooldown,
} from '@/hooks/useModerationTaskQueue';
import { useQueryClient } from '@tanstack/react-query';
import { playMissionSound, playAcceptSound } from '@/utils/missionAudio';
import { buildAdminPath } from '@/config/adminRoutes';
import type { AdminSection } from '@/components/admin/AdminSidebar';

const OFFER_TTL_SECONDS = 60;

type QueueState = 'idle' | 'offering' | 'transitioning' | 'cooldown' | 'active';
const TRANSITION_DELAY_MS = 1500;
const REFUSE_COOLDOWN_MS = 10000;

const GlobalMissionOverlay = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Check if user is admin or moderator
  const { data: isAdminOrMod, isLoading: roleLoading } = useQuery({
    queryKey: ['is-admin-or-mod-global', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const [{ data: adminData }, { data: modData }] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' }),
      ]);
      return adminData === true || modData === true;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  // Don't render anything on admin page (TaskQueuePopup handles it there)
  const isOnAdminPage = location.pathname === '/admin';

  // Only activate hooks if user is admin/mod and NOT on admin page
  const shouldActivate = !!isAdminOrMod && !isOnAdminPage;

  const { nextTask, queueLength } = useNextTask();
  const { data: activeTask } = useActiveTask();
  const reserveTask = useReserveTask();
  const refuseTask = useRefuseTask();
  const completeTask = useCompleteTask();
  const { isActive: missionsActive } = useMissionToggle();

  const [isHolding, setIsHolding] = useState(false);
  const [queueState, setQueueState] = useState<QueueState>('idle');
  const [countdown, setCountdown] = useState(OFFER_TTL_SECONDS);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offerStartRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevActiveTaskIdRef = useRef<string | null>(null);
  const prevNextTaskIdRef = useRef<string | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCooldownRef = useRef(false);

  // Countdown
  useEffect(() => {
    if (!shouldActivate) return;
    if (queueState === 'offering' && nextTask && missionsActive) {
      offerStartRef.current = Date.now();
      setCountdown(OFFER_TTL_SECONDS);
      countdownRef.current = setInterval(() => {
        if (offerStartRef.current) {
          const elapsed = Math.floor((Date.now() - offerStartRef.current) / 1000);
          const remaining = Math.max(0, OFFER_TTL_SECONDS - elapsed);
          setCountdown(remaining);
          if (remaining <= 0) {
            invalidateAllTaskQueries(queryClient);
            setQueueState('transitioning');
            toast.info('Temps écoulé — mission transférée.');
          }
        }
      }, 1000);
    } else {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      offerStartRef.current = null;
    }
    return () => { if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; } };
  }, [queueState, nextTask?.id, missionsActive, queryClient, shouldActivate]);

  useEffect(() => {
    if (!shouldActivate || !missionsActive) return;
    invalidateAllTaskQueries(queryClient);
  }, [missionsActive, shouldActivate, queryClient]);

  // Repeating sound
  useEffect(() => {
    if (!shouldActivate) return;
    if (queueState === 'offering' && missionsActive) {
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = setTimeout(() => {
        playMissionSound();
        soundIntervalRef.current = setInterval(() => { playMissionSound(); }, 3000);
      }, 3000) as unknown as ReturnType<typeof setInterval>;
    } else {
      if (soundIntervalRef.current) { clearInterval(soundIntervalRef.current); soundIntervalRef.current = null; }
    }
    return () => { if (soundIntervalRef.current) { clearInterval(soundIntervalRef.current); soundIntervalRef.current = null; } };
  }, [queueState, missionsActive, shouldActivate]);

  // State machine
  useEffect(() => {
    if (!shouldActivate) { setQueueState('idle'); return; }

    if (activeTask) {
      setQueueState('active');
      prevActiveTaskIdRef.current = activeTask.id;
      return;
    }
    if (!missionsActive) { setQueueState('idle'); return; }
    if (isCooldownRef.current) return;

    const prevNextTaskId = prevNextTaskIdRef.current;
    prevNextTaskIdRef.current = nextTask?.id ?? null;

    if (prevActiveTaskIdRef.current && nextTask) {
      prevActiveTaskIdRef.current = null;
      setQueueState('transitioning');
      transitionTimerRef.current = setTimeout(() => {
        setQueueState('offering');
        playMissionSound();
      }, TRANSITION_DELAY_MS);
      return;
    }

    if (nextTask) {
      if (queueState !== 'offering') {
        setQueueState('offering');
        if (nextTask.id !== prevNextTaskId) playMissionSound();
      }
    } else {
      prevActiveTaskIdRef.current = null;
      if (!isCooldownRef.current) setQueueState('idle');
    }

    return () => { if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current); };
  }, [activeTask, nextTask, missionsActive, shouldActivate, queryClient, queueState]);

  const handleAccept = useCallback(() => {
    if (!nextTask) return;
    playAcceptSound();
    reserveTask.mutate(nextTask.id, {
      onSuccess: () => {
        const section = getTaskTypeSection(nextTask.task_type) as AdminSection;
        const entityId = getTaskEntityId(nextTask);
        if (entityId) sessionStorage.setItem('admin-navigate-entity-id', entityId);
        navigate(buildAdminPath(section));
      },
    });
  }, [nextTask, reserveTask, navigate]);

  const handleRefuse = useCallback(() => {
    if (!nextTask) return;
    startMissionRefuseCooldown(REFUSE_COOLDOWN_MS);
    refuseTask.mutate(nextTask.id);
    setQueueState('cooldown');
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    isCooldownRef.current = true;
    cooldownTimerRef.current = setTimeout(() => {
      cooldownTimerRef.current = null;
      isCooldownRef.current = false;
      invalidateAllTaskQueries(queryClient);
      setQueueState('idle');
    }, REFUSE_COOLDOWN_MS);
  }, [nextTask, refuseTask, queryClient]);

  const handleGoToTask = useCallback(() => {
    if (!activeTask) return;
    const section = getTaskTypeSection(activeTask.task_type) as AdminSection;
    const entityId = getTaskEntityId(activeTask);
    if (entityId) sessionStorage.setItem('admin-navigate-entity-id', entityId);
    navigate(buildAdminPath(section));
  }, [activeTask, navigate]);

  const handleCompleteActive = useCallback(() => {
    if (!activeTask) return;
    completeTask.mutate(activeTask.id);
  }, [activeTask, completeTask]);

  const handleRefuseActive = useCallback(() => {
    if (!activeTask) return;
    startMissionRefuseCooldown(REFUSE_COOLDOWN_MS);
    refuseTask.mutate(activeTask.id);
  }, [activeTask, refuseTask]);

  const handleHoldSupportTask = useCallback(async () => {
    if (!activeTask || !user?.id) return;
    setIsHolding(true);
    try {
      const ticketId = (activeTask.metadata as any)?.ticket_id;
      if (ticketId) {
        await supabase.from('support_messages' as any).insert({
          ticket_id: ticketId, sender_id: user.id,
          content: '⏸️ Votre conversation est en attente. Un agent reprendra votre demande dès que vous répondrez.',
          message_type: 'system',
        } as any);
        await supabase.from('support_tickets' as any).update({ status: 'waiting_client', assigned_to: null } as any).eq('id', ticketId);
      }
      const { data: holdResult } = await supabase.rpc('hold_support_task', { _task_id: activeTask.id, _user_id: user.id });
      const result = holdResult as any;
      if (result?.success && result.reward_cents > 0) {
        const halfCents = result.reward_cents;
        await supabase.from('moderator_earnings').insert({
          user_id: user.id, task_type: 'support_chat', amount_cents: halfCents,
          target_entity_id: ticketId || null, description: `Support en attente (50%)`,
        } as any);
        const { data: wallet } = await supabase.from('moderator_wallets').select('balance_cents, total_earned_cents').eq('user_id', user.id).maybeSingle();
        if (wallet) {
          await supabase.from('moderator_wallets').update({
            balance_cents: wallet.balance_cents + halfCents, total_earned_cents: wallet.total_earned_cents + halfCents,
          } as any).eq('user_id', user.id);
        }
      }
      invalidateAllTaskQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Ticket mis en attente');
    } catch (err) {
      console.error('Hold support task error:', err);
      toast.error('Erreur lors de la mise en attente');
    } finally {
      setIsHolding(false);
    }
  }, [activeTask, user?.id, queryClient]);

  // Don't render if not admin/mod, loading, or on admin page
  if (!shouldActivate || roleLoading) return null;
  if (queueState === 'idle' && !activeTask && !nextTask) return null;

  const countdownColor = countdown <= 10 ? 'text-red-500' : countdown <= 30 ? 'text-orange-500' : 'text-primary';
  const countdownBg = countdown <= 10 ? 'bg-red-500/20' : countdown <= 30 ? 'bg-orange-500/20' : 'bg-primary/20';

  return (
    <>
      {/* Transitioning */}
      <AnimatePresence>
        {(queueState === 'transitioning' || queueState === 'cooldown') && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[90vw] sm:max-w-md z-[60]"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
          >
            <div className="rounded-xl border border-primary/20 bg-card shadow-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <p className="text-sm font-medium text-foreground">
                  {queueState === 'cooldown' ? 'Recherche de la prochaine mission…' : 'Connexion à la mission suivante…'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offering */}
      <AnimatePresence>
        {queueState === 'offering' && nextTask && !activeTask && missionsActive && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-[90vw] sm:max-w-md z-[60]"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
          >
            <div className="rounded-2xl border-2 border-primary/30 bg-card shadow-2xl shadow-primary/10 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs sm:text-sm text-foreground block">Mission entrante</span>
                    <span className="text-[10px] text-muted-foreground">Proposée exclusivement pour vous</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${countdownBg}`}>
                    <Timer className={`w-3 h-3 ${countdownColor}`} />
                    <span className={`text-xs font-bold tabular-nums ${countdownColor}`}>{countdown}s</span>
                  </div>
                  <Badge variant="outline" className="border-primary/50 text-primary font-bold text-xs">
                    <Euro className="w-3 h-3 mr-1" />
                    {formatCentsReward(nextTask.reward_cents)}
                  </Badge>
                </div>
              </div>
              <div className="h-1 bg-muted">
                <div
                  className={`h-full transition-all duration-1000 ease-linear ${countdown <= 10 ? 'bg-red-500' : countdown <= 30 ? 'bg-orange-500' : 'bg-primary'}`}
                  style={{ width: `${(countdown / OFFER_TTL_SECONDS) * 100}%` }}
                />
              </div>
              <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                <p className="text-sm sm:text-base font-medium text-foreground">{getTaskTypeLabel(nextTask.task_type)}</p>
                {nextTask.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{nextTask.description}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm h-11 active:scale-95 transition-transform" onClick={handleRefuse} disabled={refuseTask.isPending || reserveTask.isPending}>
                    {refuseTask.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <X className="w-4 h-4 mr-1" />}
                    Passer
                  </Button>
                  <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 text-xs sm:text-sm h-11 active:scale-95 transition-transform" onClick={handleAccept} disabled={reserveTask.isPending || refuseTask.isPending}>
                    {reserveTask.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                    Accepter
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Task floating banner */}
      <AnimatePresence>
        {activeTask && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-[90vw] sm:max-w-md z-[60]"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
          >
            <div className="rounded-xl border border-primary/30 bg-card shadow-lg p-3 sm:p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Headphones className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">Mission en cours</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{getTaskTypeLabel(activeTask.task_type)}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                  <Euro className="w-3 h-3 mr-1" />+{formatCentsReward(activeTask.reward_cents)}
                </Badge>
              </div>
              <div className={`grid gap-2 ${activeTask.task_type === 'support_chat' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <Button variant="outline" size="sm" onClick={handleRefuseActive} disabled={refuseTask.isPending} className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs h-11 active:scale-95 transition-transform">
                  {refuseTask.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-4 h-4" />}
                </Button>
                {activeTask.task_type === 'support_chat' && (
                  <Button size="sm" variant="outline" className="text-orange-600 border-orange-400/30 hover:bg-orange-500/10 text-xs h-11 active:scale-95 transition-transform" onClick={handleHoldSupportTask} disabled={isHolding}>
                    {isHolding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PauseCircle className="w-4 h-4 mr-1" />}
                    Attente
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-xs h-11 active:scale-95 transition-transform" onClick={handleGoToTask}>
                  <ChevronRight className="w-4 h-4 mr-1" />Exécuter
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs h-11 active:scale-95 transition-transform" onClick={handleCompleteActive} disabled={completeTask.isPending}>
                  {completeTask.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" />OK</>}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalMissionOverlay;
