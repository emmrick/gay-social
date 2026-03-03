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
  PauseCircle
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
  formatCentsReward,
  invalidateAllTaskQueries,
} from '@/hooks/useModerationTaskQueue';
import { useQueryClient } from '@tanstack/react-query';

// ── Mission arrival sound (synthesized rising chime) ──
let missionAudioCtx: AudioContext | null = null;

const playMissionSound = () => {
  try {
    if (!missionAudioCtx || missionAudioCtx.state === 'closed') {
      missionAudioCtx = new AudioContext();
    }
    const ctx = missionAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    // Three-note rising chime: C5 → E5 → G5 with harmonics
    const notes = [
      { freq: 523.25, start: 0, dur: 0.25 },    // C5
      { freq: 659.25, start: 0.15, dur: 0.25 },  // E5
      { freq: 783.99, start: 0.30, dur: 0.4 },   // G5
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      // Add a subtle harmonic
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now + start);
      gain2.gain.setValueAtTime(0.15, now + start);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(now + start);
      osc2.stop(now + start + dur);

      // Main tone with envelope
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.35, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch {}
};

const playAcceptSound = () => {
  try {
    if (!missionAudioCtx || missionAudioCtx.state === 'closed') {
      missionAudioCtx = new AudioContext();
    }
    const ctx = missionAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    // Satisfying confirmation: G5 → C6 (rising fifth)
    const notes = [
      { freq: 783.99, start: 0, dur: 0.15 },     // G5
      { freq: 1046.50, start: 0.12, dur: 0.35 },  // C6
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.4, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch {}
};

interface TaskQueuePopupProps {
  onNavigateToSection: (section: string) => void;
}

const TRANSITION_DELAY_MS = 1500; // Brief pause between tasks

type QueueState = 'idle' | 'offering' | 'transitioning' | 'active';

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
  
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevActiveTaskIdRef = useRef<string | null>(null);
  const prevNextTaskIdRef = useRef<string | null>(null);

  // ── Repeating sound while offering ──
  useEffect(() => {
    if (queueState === 'offering' && missionsActive) {
      // Clear any existing interval
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
      // Repeat sound every 8 seconds
      soundIntervalRef.current = setInterval(() => {
        playMissionSound();
      }, 3000);
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

  // ── State machine: determine queue state ──
  useEffect(() => {
    // If there's an active task, always show it
    if (activeTask) {
      setQueueState('active');
      prevActiveTaskIdRef.current = activeTask.id;
      return;
    }

    // If missions are off, idle
    if (!missionsActive) {
      setQueueState('idle');
      return;
    }

    // Track previous nextTask id to detect new missions
    const prevNextTaskId = prevNextTaskIdRef.current;
    prevNextTaskIdRef.current = nextTask?.id ?? null;

    // If we just finished/refused a task, show transition before next offer
    if (prevActiveTaskIdRef.current && nextTask) {
      prevActiveTaskIdRef.current = null;
      setQueueState('transitioning');
      transitionTimerRef.current = setTimeout(() => {
        setQueueState('offering');
        playMissionSound();
      }, TRANSITION_DELAY_MS);
      return;
    }

    // If there's a next task available, offer it
    if (nextTask) {
      // Only transition if we're not already offering
      if (queueState !== 'offering') {
        setQueueState('offering');
        // Play sound when a NEW mission appears
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

  // Timer removed — no time limit on tasks

  // ── Actions ──
  const handleAccept = useCallback(() => {
    if (!nextTask) return;
    playAcceptSound();
    reserveTask.mutate(nextTask.id);
  }, [nextTask, reserveTask]);

  const handleRefuse = useCallback(() => {
    if (!nextTask) return;
    // Call backend to durably refuse — this is the key fix
    refuseTask.mutate(nextTask.id);
    setQueueState('transitioning');
    // Brief transition before showing next task
    transitionTimerRef.current = setTimeout(() => {
      // State will be resolved by the useEffect above after refetch
    }, TRANSITION_DELAY_MS);
  }, [nextTask, refuseTask]);

  const handleRefuseActive = useCallback(() => {
    if (!activeTask) return;
    refuseTask.mutate(activeTask.id);
  }, [activeTask, refuseTask]);

  const handleCompleteActive = useCallback(() => {
    if (!activeTask) return;
    completeTask.mutate(activeTask.id);
  }, [activeTask, completeTask]);

  const handleGoToTask = useCallback(() => {
    if (!activeTask) return;
    const section = getTaskTypeSection(activeTask.task_type);
    onNavigateToSection(section);
  }, [activeTask, onNavigateToSection]);

  const handleHoldSupportTask = useCallback(async () => {
    if (!activeTask || !user?.id) return;
    setIsHolding(true);
    try {
      const ticketId = (activeTask.metadata as any)?.ticket_id;
      
      if (ticketId) {
        // Send system message to client
        await supabase
          .from('support_messages' as any)
          .insert({
            ticket_id: ticketId,
            sender_id: user.id,
            content: '⏸️ Votre conversation est en attente. Un agent reprendra votre demande dès que vous répondrez.',
            message_type: 'system',
          } as any);

        // Update ticket status
        await supabase
          .from('support_tickets' as any)
          .update({ status: 'waiting_client', assigned_to: null } as any)
          .eq('id', ticketId);
      }

      // Complete task with half reward
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
        {missionsActive && !activeTask && queueLength > 0 && queueState !== 'transitioning' && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-medium">
              Mission disponible — proposée exclusivement pour vous
            </span>
          </div>
        )}
      </div>

      {/* ── Transition State: "Connecting to next mission…" ── */}
      <AnimatePresence>
        {queueState === 'transitioning' && (
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
                  Connexion à la mission suivante…
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Veuillez patienter
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New Task Offer ── */}
      <AnimatePresence>
        {queueState === 'offering' && nextTask && !activeTask && missionsActive && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 sm:top-2 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-[90vw] sm:max-w-md z-[60]"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="rounded-2xl border-2 border-primary/30 bg-card shadow-2xl shadow-primary/10 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs sm:text-sm text-foreground block">
                      Mission entrante
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Proposée exclusivement pour vous
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/50 text-primary font-bold text-xs shrink-0">
                  <Euro className="w-3 h-3 mr-1" />
                  {formatCentsReward(nextTask.reward_cents)}
                </Badge>
              </div>

              {/* Content */}
              <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                <p className="text-sm sm:text-base font-medium text-foreground">
                  {getTaskTypeLabel(nextTask.task_type)}
                </p>
                {nextTask.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {nextTask.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs sm:text-sm h-11 active:scale-95 transition-transform"
                    onClick={handleRefuse}
                    disabled={refuseTask.isPending || reserveTask.isPending}
                  >
                    {refuseTask.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <X className="w-4 h-4 mr-1" />
                    )}
                    Passer
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-primary hover:bg-primary/90 text-xs sm:text-sm h-11 active:scale-95 transition-transform"
                    onClick={handleAccept}
                    disabled={reserveTask.isPending || refuseTask.isPending}
                  >
                    {reserveTask.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Check className="w-4 h-4 mr-1" />
                    )}
                    Accepter
                  </Button>
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

              {/* Exclusive distribution notice */}

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
