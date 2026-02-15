import { useState, useEffect, useCallback } from 'react';
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
  Power
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  useAvailableTasks,
  useActiveTask,
  useReserveTask,
  useRefuseTask,
  useMissionToggle,
  getTaskTypeLabel,
  getTaskTypeSection,
  formatCentsReward,
  ModerationTask,
} from '@/hooks/useModerationTaskQueue';

interface TaskQueuePopupProps {
  onNavigateToSection: (section: string) => void;
}

const RESERVATION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const TaskQueuePopup = ({ onNavigateToSection }: TaskQueuePopupProps) => {
  const { data: availableTasks } = useAvailableTasks();
  const { data: activeTask } = useActiveTask();
  const reserveTask = useReserveTask();
  const refuseTask = useRefuseTask();
  const { isActive: missionsActive, toggle: toggleMissions } = useMissionToggle();

  const [showPopup, setShowPopup] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<ModerationTask | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Show popup only when missions are active AND no active task
  useEffect(() => {
    if (activeTask || !missionsActive) {
      setShowPopup(false);
      setCurrentOffer(null);
      return;
    }

    if (availableTasks && availableTasks.length > 0) {
      const nextTask = availableTasks.find(t => !dismissed.has(t.id));
      if (nextTask && (!currentOffer || currentOffer.id !== nextTask.id)) {
        setCurrentOffer(nextTask);
        setShowPopup(true);
      }
    } else {
      setShowPopup(false);
      setCurrentOffer(null);
    }
  }, [availableTasks, activeTask, dismissed, currentOffer, missionsActive]);

  // Countdown timer for active task
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

  const handleAccept = useCallback(async () => {
    if (!currentOffer) return;
    reserveTask.mutate(currentOffer.id);
    setShowPopup(false);
  }, [currentOffer, reserveTask]);

  const handleRefuse = useCallback(async () => {
    if (!currentOffer) return;
    setDismissed(prev => new Set(prev).add(currentOffer.id));
    setShowPopup(false);
    setCurrentOffer(null);
  }, [currentOffer]);

  const handleRefuseActive = useCallback(async () => {
    if (!activeTask) return;
    refuseTask.mutate(activeTask.id);
  }, [activeTask, refuseTask]);

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
      {/* Mission Toggle */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 mb-4">
        <div className="flex items-center gap-2">
          <Power className={`w-4 h-4 ${missionsActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <div>
            <p className="text-sm font-medium text-foreground">
              {missionsActive ? 'Missions actives' : 'Missions désactivées'}
            </p>
            <p className="text-xs text-muted-foreground">
              {missionsActive 
                ? activeTask 
                  ? 'Vous ne recevrez plus de missions après celle en cours' 
                  : 'Vous recevez les nouvelles missions'
                : 'Activez pour recevoir des missions'
              }
            </p>
          </div>
        </div>
        <Switch 
          checked={missionsActive} 
          onCheckedChange={toggleMissions}
        />
      </div>

      {/* New Task Offer Popup */}
      <AnimatePresence>
        {showPopup && currentOffer && !activeTask && missionsActive && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[90vw] max-w-md"
          >
            <div className="rounded-2xl border-2 border-primary/30 bg-card shadow-2xl shadow-primary/10 overflow-hidden">
              {/* Header glow */}
              <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">Nouvelle mission !</span>
                </div>
                <Badge variant="outline" className="border-primary/50 text-primary font-bold">
                  <Euro className="w-3 h-3 mr-1" />
                  {formatCentsReward(currentOffer.reward_cents)}
                </Badge>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <p className="text-base font-medium text-foreground">
                  {getTaskTypeLabel(currentOffer.task_type)}
                </p>
                {currentOffer.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {currentOffer.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleRefuse}
                    disabled={reserveTask.isPending}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Passer
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={handleAccept}
                    disabled={reserveTask.isPending}
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

      {/* Active Task Banner */}
      <AnimatePresence>
        {activeTask && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5 p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Mission en cours</p>
                    <p className="text-xs text-muted-foreground">
                      {getTaskTypeLabel(activeTask.task_type)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={timeRemaining < 60000 ? 'destructive' : 'outline'}
                    className="font-mono tabular-nums"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(timeRemaining)}
                  </Badge>
                  <p className="text-xs text-primary font-medium mt-1">
                    +{formatCentsReward(activeTask.reward_cents)}
                  </p>
                </div>
              </div>

              <Progress value={progressPercent} className="h-1.5" />

              {timeRemaining < 60000 && timeRemaining > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="w-3 h-3" />
                  <span>Moins d'une minute restante !</span>
                </div>
              )}

              {!missionsActive && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-lg p-2">
                  <Power className="w-3 h-3" />
                  <span>Missions désactivées — aucune nouvelle mission après celle-ci</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefuseActive}
                  disabled={refuseTask.isPending}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <X className="w-4 h-4 mr-1" />
                  Abandonner
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleGoToTask}
                >
                  Exécuter la mission
                  <ChevronRight className="w-4 h-4 ml-1" />
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
