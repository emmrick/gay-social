import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Clock, 
  Check, 
  X, 
  Euro, 
  ChevronRight, 
  Loader2,
  AlertCircle,
  Power,
  CheckCircle2,
  Phone,
  PhoneOff,
  Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
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
} from '@/hooks/useModerationTaskQueue';

interface TaskQueuePopupProps {
  onNavigateToSection: (section: string) => void;
}

const RESERVATION_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const TRANSITION_DELAY_MS = 1500; // Brief pause between tasks

type QueueState = 'idle' | 'offering' | 'transitioning' | 'active';

const TaskQueuePopup = ({ onNavigateToSection }: TaskQueuePopupProps) => {
  const { nextTask, queueLength } = useNextTask();
  const { data: activeTask } = useActiveTask();
  const reserveTask = useReserveTask();
  const refuseTask = useRefuseTask();
  const completeTask = useCompleteTask();
  const { isActive: missionsActive, toggle: toggleMissions } = useMissionToggle();

  const [queueState, setQueueState] = useState<QueueState>('idle');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevActiveTaskIdRef = useRef<string | null>(null);

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

    // If we just finished/refused a task, show transition before next offer
    if (prevActiveTaskIdRef.current && nextTask) {
      prevActiveTaskIdRef.current = null;
      setQueueState('transitioning');
      transitionTimerRef.current = setTimeout(() => {
        setQueueState('offering');
      }, TRANSITION_DELAY_MS);
      return;
    }

    // If there's a next task available, offer it
    if (nextTask) {
      // Only transition if we're not already offering
      if (queueState !== 'offering') {
        setQueueState('offering');
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

  // ── Countdown timer for active task ──
  useEffect(() => {
    if (!activeTask?.reserved_at) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - new Date(activeTask.reserved_at!).getTime();
      const remaining = Math.max(0, RESERVATION_DURATION_MS - elapsed);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeTask]);

  // ── Actions ──
  const handleAccept = useCallback(() => {
    if (!nextTask) return;
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

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = activeTask 
    ? (timeRemaining / RESERVATION_DURATION_MS) * 100 
    : 0;

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
                      ? `${queueLength} mission${queueLength > 1 ? 's' : ''} en file d'attente`
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
            <div className="flex gap-0.5">
              {Array.from({ length: Math.min(queueLength, 5) }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-4 rounded-full ${i === 0 ? 'bg-primary animate-pulse' : 'bg-primary/30'}`}
                />
              ))}
              {queueLength > 5 && (
                <span className="text-[10px] text-primary ml-1">+{queueLength - 5}</span>
              )}
            </div>
            <span className="text-xs text-primary font-medium">
              Prochaine mission prête
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
            className="fixed top-2 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-[90vw] sm:max-w-md z-[60]"
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
                    {queueLength > 1 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{queueLength - 1} en file d'attente
                      </span>
                    )}
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
                    className="flex-1 text-xs sm:text-sm h-9"
                    onClick={handleRefuse}
                    disabled={refuseTask.isPending || reserveTask.isPending}
                  >
                    {refuseTask.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    )}
                    Passer
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-primary hover:bg-primary/90 text-xs sm:text-sm h-9"
                    onClick={handleAccept}
                    disabled={reserveTask.isPending || refuseTask.isPending}
                  >
                    {reserveTask.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin mr-1" />
                    ) : (
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
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
                  <Badge 
                    variant={timeRemaining < 60000 ? 'destructive' : 'outline'}
                    className="font-mono tabular-nums text-[10px] sm:text-xs"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(timeRemaining)}
                  </Badge>
                  <p className="text-[10px] sm:text-xs text-primary font-medium mt-1">
                    +{formatCentsReward(activeTask.reward_cents)}
                  </p>
                </div>
              </div>

              <Progress value={progressPercent} className="h-1.5" />

              {timeRemaining < 60000 && timeRemaining > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-destructive">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>Moins d'une minute restante !</span>
                </div>
              )}

              {!missionsActive && (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground bg-muted rounded-lg p-2">
                  <Power className="w-3 h-3 shrink-0" />
                  <span>Missions désactivées — aucune nouvelle mission après celle-ci</span>
                </div>
              )}

              {/* Queue info while working */}
              {queueLength > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                  <Phone className="w-3 h-3 shrink-0 text-primary" />
                  <span>{queueLength} mission{queueLength > 1 ? 's' : ''} en attente après celle-ci</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefuseActive}
                  disabled={refuseTask.isPending}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs h-9"
                >
                  {refuseTask.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <X className="w-3.5 h-3.5 mr-1" />
                  )}
                  Abandonner
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-9"
                  onClick={handleGoToTask}
                >
                  Exécuter la mission
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-primary hover:bg-primary/90 text-xs h-9"
                  onClick={handleCompleteActive}
                  disabled={completeTask.isPending}
                >
                  {completeTask.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  )}
                  Terminer
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
