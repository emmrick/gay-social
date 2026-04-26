import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Check, 
  X, 
  Euro, 
  ChevronRight, 
  Loader2,
  Power,
  CheckCircle2,
  Phone,
  PhoneOff,
  Headphones,
  PauseCircle,
  Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

const OFFER_TTL_SECONDS = 60;

interface TaskQueuePopupProps {
  onNavigateToSection: (section: string) => void;
}

const TRANSITION_DELAY_MS = 1500;
const REFUSE_COOLDOWN_MS = 10000;

type QueueState = 'idle' | 'offering' | 'transitioning' | 'cooldown' | 'active';

const TaskQueuePopup = ({ onNavigateToSection }: TaskQueuePopupProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { nextTask, queueLength } = useNextTask();
  const { data: activeTask } = useActiveTask();
  const reserveTask = useReserveTask();
  const refuseTask = useRefuseTask();
  const completeTask = useCompleteTask();
  const { isActive: missionsActive, toggle: toggleMissions } = useMissionToggle();
  const [isHolding, setIsHolding] = useState(false);

  const [queueState, setQueueState] = useState<QueueState>('idle');
  
  // 60s countdown timer
  const [countdown, setCountdown] = useState(OFFER_TTL_SECONDS);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offerStartRef = useRef<number | null>(null);

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevActiveTaskIdRef = useRef<string | null>(null);
  const prevNextTaskIdRef = useRef<string | null>(null);
  const isCooldownRef = useRef(false);

  // ── Countdown timer: 60s to accept or refuse ──
  useEffect(() => {
    if (queueState === 'offering' && nextTask && missionsActive) {
      // Start countdown
      offerStartRef.current = Date.now();
      setCountdown(OFFER_TTL_SECONDS);
      
      countdownRef.current = setInterval(() => {
        if (offerStartRef.current) {
          const elapsed = Math.floor((Date.now() - offerStartRef.current) / 1000);
          const remaining = Math.max(0, OFFER_TTL_SECONDS - elapsed);
          setCountdown(remaining);
          
          // Auto-refuse when time runs out
          if (remaining <= 0) {
            // Time's up - the backend will automatically reassign after TTL
            // Just refresh to get new state
            invalidateAllTaskQueries(queryClient);
            setQueueState('transitioning');
            toast.info('Temps écoulé — mission transférée.');
          }
        }
      }, 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      offerStartRef.current = null;
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [queueState, nextTask?.id, missionsActive, queryClient]);

   // ── Repeating sound while offering (delayed start to avoid overlap with initial sound) ──
  useEffect(() => {
    if (queueState === 'offering' && missionsActive) {
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
      // Wait 3s before first repeat to avoid overlapping with the initial sound
      soundIntervalRef.current = setTimeout(() => {
        playMissionSound();
        soundIntervalRef.current = setInterval(() => {
          playMissionSound();
        }, 3000);
      }, 3000) as unknown as ReturnType<typeof setInterval>;
    } else {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
    }
    return () => {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
    };
  }, [queueState, missionsActive]);

  // ── State machine ──
  useEffect(() => {
    if (activeTask) {
      setQueueState('active');
      prevActiveTaskIdRef.current = activeTask.id;
      return;
    }

    if (!missionsActive) {
      setQueueState('idle');
      return;
    }

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
        if (nextTask.id !== prevNextTaskId) {
          playMissionSound();
        }
      }
    } else {
      prevActiveTaskIdRef.current = null;
      setQueueState('idle');
    }

    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [activeTask, nextTask, missionsActive]);

  // ── Actions ──
  const handleAccept = useCallback(() => {
    if (!nextTask) return;
    playAcceptSound();
    reserveTask.mutate(nextTask.id, {
      onSuccess: () => {
        const section = getTaskTypeSection(nextTask.task_type);
        const entityId = getTaskEntityId(nextTask);
        if (entityId) sessionStorage.setItem('admin-navigate-entity-id', entityId);
        setTimeout(() => {
          onNavigateToSection(section);
        }, 300);
      },
    });
  }, [nextTask, reserveTask, onNavigateToSection]);

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

  // ── Keyboard shortcuts: A = accept, R = refuse (only when offering) ──
  useEffect(() => {
    if (queueState !== 'offering' || !nextTask) return;
    const handler = (e: KeyboardEvent) => {
      // Skip if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleAccept();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRefuse();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [queueState, nextTask?.id, handleAccept, handleRefuse]);


  const handleRefuseActive = useCallback(() => {
    if (!activeTask) return;
    startMissionRefuseCooldown(REFUSE_COOLDOWN_MS);
    refuseTask.mutate(activeTask.id);
  }, [activeTask, refuseTask]);

  const handleCompleteActive = useCallback(() => {
    if (!activeTask) return;
    completeTask.mutate(activeTask.id);
  }, [activeTask, completeTask]);

  const handleGoToTask = useCallback(() => {
    if (!activeTask) return;
    const section = getTaskTypeSection(activeTask.task_type);
    const entityId = getTaskEntityId(activeTask);
    if (entityId) sessionStorage.setItem('admin-navigate-entity-id', entityId);
    onNavigateToSection(section);
  }, [activeTask, onNavigateToSection]);

  const handleHoldSupportTask = useCallback(async () => {
    if (!activeTask || !user?.id) return;
    setIsHolding(true);
    try {
      const ticketId = (activeTask.metadata as any)?.ticket_id;
      
      if (ticketId) {
        await supabase
          .from('support_messages' as any)
          .insert({
            ticket_id: ticketId,
            sender_id: user.id,
            content: '⏸️ Votre conversation est en attente. Un agent reprendra votre demande dès que vous répondrez.',
            message_type: 'system',
          } as any);

        await supabase
          .from('support_tickets' as any)
          .update({ status: 'waiting_client', assigned_to: null } as any)
          .eq('id', ticketId);
      }

      const { data: holdResult } = await supabase.rpc('hold_support_task', {
        _task_id: activeTask.id,
        _user_id: user.id,
      });

      const result = holdResult as any;
      if (result?.success && result.reward_cents > 0) {
        const halfCents = result.reward_cents;
        await supabase.from('moderator_earnings').insert({
          user_id: user.id,
          task_type: 'support_chat',
          amount_cents: halfCents,
          target_entity_id: ticketId || null,
          description: `Support en attente (50%)`,
        } as any);

        const { data: wallet } = await supabase
          .from('moderator_wallets')
          .select('balance_cents, total_earned_cents')
          .eq('user_id', user.id)
          .maybeSingle();

        if (wallet) {
          await supabase
            .from('moderator_wallets')
            .update({
              balance_cents: wallet.balance_cents + halfCents,
              total_earned_cents: wallet.total_earned_cents + halfCents,
            } as any)
            .eq('user_id', user.id);
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

  // Countdown display helper
  const countdownColor = countdown <= 10 ? 'text-red-500' : countdown <= 30 ? 'text-orange-500' : 'text-primary';
  const countdownBg = countdown <= 10 ? 'bg-red-500/20' : countdown <= 30 ? 'bg-orange-500/20' : 'bg-primary/20';

  return (
    <>
      {/* ── Mission Toggle + Queue Status ── */}
      <div className="rounded-xl border border-border bg-card p-3 mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              missionsActive ? 'bg-primary/20' : 'bg-muted'
            }`}>
              {missionsActive ? (
                <Headphones className="w-4 h-4 text-primary" />
              ) : (
                <PhoneOff className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {missionsActive ? 'En ligne' : 'Hors ligne'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {!missionsActive 
                  ? 'Activez pour recevoir des missions'
                  : activeTask
                    ? 'Mission en cours de traitement'
                    : queueLength > 0
                      ? 'Une mission vous est proposée'
                      : 'En attente de nouvelles missions…'
                }
              </p>
            </div>
          </div>
          <Switch 
            checked={missionsActive} 
            onCheckedChange={toggleMissions}
            className="shrink-0 ml-2"
          />
        </div>

        {/* Queue position indicator */}
        {missionsActive && !activeTask && queueLength > 0 && queueState !== 'transitioning' && queueState !== 'cooldown' && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-medium">
              Mission disponible — proposée exclusivement pour vous
            </span>
          </div>
        )}
      </div>

      {/* ── Transition State ── */}
      <AnimatePresence>
        {(queueState === 'transitioning' || queueState === 'cooldown') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-4 mb-4"
          >
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {queueState === 'cooldown' ? 'Recherche de la prochaine mission…' : 'Connexion à la mission suivante…'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {queueState === 'cooldown' ? 'Nouvelle proposition dans 10 secondes' : 'Veuillez patienter'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New Task Offer — Modern "Incoming Call" Design ── */}
      <AnimatePresence>
        {queueState === 'offering' && nextTask && !activeTask && missionsActive && (
          <motion.div
            initial={{ opacity: 0, y: -120, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -120, scale: 0.85 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="fixed top-0 left-0 right-0 sm:top-3 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-[92vw] sm:max-w-[420px] z-[60] px-2 sm:px-0"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
          >
            {/* Glow halo derrière la card */}
            <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-3xl blur-2xl opacity-70 animate-pulse pointer-events-none" />

              <div className="relative rounded-3xl border border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/20 overflow-hidden">
                {/* Bandeau supérieur dégradé animé */}
                <div className="relative h-1.5 bg-muted overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-linear ${
                      countdown <= 10
                        ? 'bg-gradient-to-r from-red-500 via-rose-400 to-red-500'
                        : countdown <= 30
                          ? 'bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500'
                          : 'bg-gradient-to-r from-primary via-accent to-primary'
                    } bg-[length:200%_100%] animate-shimmer-bg`}
                    style={{ width: `${(countdown / OFFER_TTL_SECONDS) * 100}%` }}
                  />
                </div>

                {/* Corps principal */}
                <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Avatar pulsant avec anneau de countdown */}
                    <div className="relative shrink-0">
                      {/* Cercles d'onde concentriques */}
                      <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                      <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping [animation-delay:300ms]" />

                      {/* Anneau SVG de progression */}
                      <svg
                        className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] -rotate-90"
                        viewBox="0 0 72 72"
                      >
                        <circle
                          cx="36"
                          cy="36"
                          r="32"
                          fill="none"
                          strokeWidth="3"
                          className="stroke-muted"
                        />
                        <circle
                          cx="36"
                          cy="36"
                          r="32"
                          fill="none"
                          strokeWidth="3"
                          strokeLinecap="round"
                          className={
                            countdown <= 10
                              ? 'stroke-red-500'
                              : countdown <= 30
                                ? 'stroke-orange-500'
                                : 'stroke-primary'
                          }
                          strokeDasharray={2 * Math.PI * 32}
                          strokeDashoffset={
                            2 * Math.PI * 32 * (1 - countdown / OFFER_TTL_SECONDS)
                          }
                          style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                      </svg>

                      {/* Icône centrale */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/40">
                          <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground animate-wiggle" />
                        </div>
                      </div>
                    </div>

                    {/* Infos mission */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">
                          Mission entrante
                        </span>
                      </div>

                      <p className="text-base sm:text-lg font-bold text-foreground leading-tight truncate">
                        {getTaskTypeLabel(nextTask.task_type)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Proposée exclusivement pour vous
                      </p>

                      {/* Récompense + countdown */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/15 to-emerald-400/10 border border-emerald-500/30">
                          <Euro className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                            {formatCentsReward(nextTask.reward_cents)}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                          countdown <= 10
                            ? 'bg-red-500/10 border-red-500/30'
                            : countdown <= 30
                              ? 'bg-orange-500/10 border-orange-500/30'
                              : 'bg-muted border-border'
                        }`}>
                          <Timer className={`w-3 h-3 ${countdownColor}`} />
                          <span className={`text-xs font-bold tabular-nums ${countdownColor}`}>
                            {countdown}s
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description optionnelle */}
                  {nextTask.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-3 line-clamp-2 px-1">
                      {nextTask.description}
                    </p>
                  )}
                </div>

                {/* Actions style "appel entrant" */}
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Refuser — rouge style raccrocher */}
                    <button
                      onClick={handleRefuse}
                      disabled={refuseTask.isPending || reserveTask.isPending}
                      className="group relative h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-semibold shadow-lg shadow-red-500/30 active:scale-95 transition-all hover:shadow-xl hover:shadow-red-500/40 disabled:opacity-50 disabled:active:scale-100 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center justify-center gap-2">
                        {refuseTask.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <PhoneOff className="w-5 h-5 rotate-[135deg]" />
                        )}
                        <span className="text-sm">Passer</span>
                      </div>
                    </button>

                    {/* Accepter — vert style décrocher, avec halo pulsant */}
                    <button
                      onClick={handleAccept}
                      disabled={reserveTask.isPending || refuseTask.isPending}
                      className="group relative h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-semibold shadow-lg shadow-emerald-500/40 active:scale-95 transition-all hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-50 disabled:active:scale-100 overflow-hidden"
                    >
                      <span className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400/60 animate-pulse" />
                      <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center justify-center gap-2">
                        {reserveTask.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Phone className="w-5 h-5" />
                        )}
                        <span className="text-sm">Accepter</span>
                      </div>
                    </button>
                  </div>

                  {/* Hint raccourcis clavier */}
                  <div className="hidden sm:flex items-center justify-center gap-3 mt-2.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">A</kbd>
                      accepter
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">R</kbd>
                      refuser
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active Task Banner ── */}
      <AnimatePresence>
        {activeTask && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5 p-3 sm:p-4 mb-4 space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">Mission en cours</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {getTaskTypeLabel(activeTask.task_type)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    <Euro className="w-3 h-3 mr-1" />
                    +{formatCentsReward(activeTask.reward_cents)}
                  </Badge>
                </div>
              </div>

              {!missionsActive && (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground bg-muted rounded-lg p-2">
                  <Power className="w-3 h-3 shrink-0" />
                  <span>Missions désactivées — aucune nouvelle mission après celle-ci</span>
                </div>
              )}

              <div className={`grid gap-2 ${activeTask.task_type === 'support_chat' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefuseActive}
                  disabled={refuseTask.isPending}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs h-11 active:scale-95 transition-transform"
                >
                  {refuseTask.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </Button>
                {activeTask.task_type === 'support_chat' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-orange-600 border-orange-400/30 hover:bg-orange-500/10 text-xs h-11 active:scale-95 transition-transform"
                    onClick={handleHoldSupportTask}
                    disabled={isHolding}
                  >
                    {isHolding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PauseCircle className="w-4 h-4 mr-1" />}
                    Attente
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-11 active:scale-95 transition-transform"
                  onClick={handleGoToTask}
                >
                  <ChevronRight className="w-4 h-4 mr-1" />
                  Exécuter
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-xs h-11 active:scale-95 transition-transform"
                  onClick={handleCompleteActive}
                  disabled={completeTask.isPending}
                >
                  {completeTask.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      OK
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TaskQueuePopup;
