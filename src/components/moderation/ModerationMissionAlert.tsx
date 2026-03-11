import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, X, ChevronRight, CheckCircle2, Play, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useReserveTask,
  useRefuseTask,
  useCompleteTask,
  getTaskTypeSection,
  invalidateAllTaskQueries,
  useMissionToggle,
} from '@/hooks/useModerationTaskQueue';

const TASK_TYPE_LABELS: Record<string, string> = {
  identity_verification: '🪪 Vérification d\'identité',
  report_review: '🚨 Signalement',
  content_moderation: '📸 Modération contenu',
  user_suspension: '🔒 Suspension',
  credit_management: '💰 Crédits',
  withdrawal_management: '🏦 Retrait',
  promo_validation: '🎟️ Code promo',
  support_chat: '🆘 Support',
};

const formatReward = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' €';

const COUNTDOWN_SECONDS = 60;
const COOLDOWN_MS = 5000;

// ── Audio helpers ──
let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

const unlockAudio = () => {
  if (audioUnlocked) return;
  try {
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start();
    audioUnlocked = true;
  } catch {}
};

if (typeof window !== 'undefined') {
  const evts = ['touchstart', 'touchend', 'click', 'keydown'];
  const h = () => { unlockAudio(); evts.forEach(e => document.removeEventListener(e, h, true)); };
  evts.forEach(e => document.addEventListener(e, h, { capture: true, once: false, passive: true }));
}

const playAlertSound = () => {
  try {
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioContext();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const notes = [
      { freq: 587.33, start: 0, dur: 0.2 },
      { freq: 783.99, start: 0.15, dur: 0.2 },
      { freq: 1046.50, start: 0.30, dur: 0.35 },
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.3, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch {}
};

const playSuccessSound = () => {
  try {
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioContext();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(1318.51, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch {}
};

interface MissionData {
  id: string;
  task_type: string;
  description: string | null;
  reward_cents: number;
  created_at: string;
  updated_at: string;
}

type PopupStep = 'propose' | 'accepted' | 'resolved';

const ModerationMissionAlert = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [visible, setVisible] = useState(false);
  const [mission, setMission] = useState<MissionData | null>(null);
  const [step, setStep] = useState<PopupStep>('propose');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const lastSeenKeyRef = useRef<string | null>(null);
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownUntilRef = useRef<number>(0);
  const dismissedIdsRef = useRef<Set<string>>(new Set());

  const reserveTask = useReserveTask();
  const refuseTask = useRefuseTask();
  const completeTask = useCompleteTask();
  const { isActive: missionsActive, setActive: setMissionsActive } = useMissionToggle();

  const lastMissionReceivedRef = useRef<number>(Date.now());
  const autoOfflineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOnAdminPage = location.pathname === '/admin';

  // Check if user is moderator or admin
  const { data: isStaff } = useQuery({
    queryKey: ['is-staff-for-alert', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data: adminData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (adminData === true) return true;
      const { data: modData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' });
      return modData === true;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  // Poll for exclusively offered task via RPC (checks online status server-side)
  const { data: pendingTasks, refetch: refetchPending } = useQuery({
    queryKey: ['mission-alert-poll', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .rpc('get_exclusive_next_task', { _user_id: user.id, _offer_ttl_seconds: COUNTDOWN_SECONDS });
      if (error || !data) return [];
      // RPC returns a set, normalize to array
      const arr = Array.isArray(data) ? data : [data];
      return arr.filter(Boolean).map((t: any) => ({
        id: t.id,
        task_type: t.task_type,
        description: t.description,
        reward_cents: t.reward_cents,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })) as MissionData[];
    },
    enabled: !!user?.id && !!isStaff && missionsActive,
    refetchInterval: missionsActive ? 10_000 : false,
    staleTime: 8_000,
  });

  const nextAvailableTask = pendingTasks?.find(t => !dismissedIdsRef.current.has(t.id)) ?? null;

  // ── Countdown timer ──
  useEffect(() => {
    if (visible && step === 'propose') {
      setCountdown(COUNTDOWN_SECONDS);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // Time's up — auto-skip this mission
            clearInterval(countdownRef.current!);
            countdownRef.current = null;
            handleSkip();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [visible, step, mission?.id]);

  // ── Show new mission (with cooldown) ──
  useEffect(() => {
    // Don't propose new tasks when we're in accepted/resolved step
    if (step !== 'propose' && visible) return;

    if (!nextAvailableTask) {
      if (visible && step === 'propose') setVisible(false);
      return;
    }

    const taskKey = `${nextAvailableTask.id}::${nextAvailableTask.updated_at}`;
    if (taskKey === lastSeenKeyRef.current) return;

    const now = Date.now();
    const cooldownRemaining = cooldownUntilRef.current - now;
    if (cooldownRemaining > 0) {
      const delayTimer = setTimeout(() => {
        if (lastSeenKeyRef.current === taskKey) return;
        showMission(nextAvailableTask, taskKey);
      }, cooldownRemaining);
      return () => clearTimeout(delayTimer);
    }

    if (dismissedIdsRef.current.has(nextAvailableTask.id)) {
      dismissedIdsRef.current.delete(nextAvailableTask.id);
    }

    showMission(nextAvailableTask, taskKey);
  }, [nextAvailableTask, step, visible]);

  const showMission = (task: MissionData, taskKey: string) => {
    lastSeenKeyRef.current = taskKey;
    lastMissionReceivedRef.current = Date.now(); // Reset 2h inactivity timer
    setMission(task);
    setStep('propose');
    setVisible(true);
    playAlertSound();
  };

  // Realtime
  useEffect(() => {
    if (!user?.id || !isStaff) return;
    const channel = supabase
      .channel('mission-alert-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moderation_tasks' }, () => {
        refetchPending();
        queryClient.invalidateQueries({ queryKey: ['mission-alert-poll'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, isStaff, queryClient, refetchPending]);

  // Sound repeat only during 'propose' step
  useEffect(() => {
    if (visible && step === 'propose' && mission) {
      soundIntervalRef.current = setInterval(playAlertSound, 4000);
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
  }, [visible, step, mission]);

  // Hide mission when toggling offline
  useEffect(() => {
    if (!missionsActive && visible) {
      setVisible(false);
      setMission(null);
      setStep('propose');
      lastSeenKeyRef.current = null;
    }
  }, [missionsActive]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
      if (autoOfflineTimerRef.current) clearInterval(autoOfflineTimerRef.current);
    };
  }, []);

  // ── Auto-offline after 2h without any mission ──
  const AUTO_OFFLINE_MS = 2 * 60 * 60 * 1000; // 2 hours

  useEffect(() => {
    if (!missionsActive || !isStaff) {
      if (autoOfflineTimerRef.current) {
        clearInterval(autoOfflineTimerRef.current);
        autoOfflineTimerRef.current = null;
      }
      return;
    }

    // Reset timer start when going online
    lastMissionReceivedRef.current = Date.now();

    // Check every 60s if 2h passed without a mission
    autoOfflineTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastMissionReceivedRef.current;
      if (elapsed >= AUTO_OFFLINE_MS) {
        setMissionsActive(false);
        toast.info('Vous avez été passé Hors ligne automatiquement après 2h sans mission.', { duration: 8000 });
        if (autoOfflineTimerRef.current) {
          clearInterval(autoOfflineTimerRef.current);
          autoOfflineTimerRef.current = null;
        }
      }
    }, 60_000);

    return () => {
      if (autoOfflineTimerRef.current) {
        clearInterval(autoOfflineTimerRef.current);
        autoOfflineTimerRef.current = null;
      }
    };
  }, [missionsActive, isStaff, setMissionsActive]);

  // ── Actions ──
  const handleSkip = useCallback(() => {
    if (mission) {
      dismissedIdsRef.current.add(mission.id);
      lastSeenKeyRef.current = null;
      cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
    }
    setVisible(false);
    setMission(null);
    setStep('propose');
  }, [mission]);

  const handleAccept = useCallback(async () => {
    if (!mission) return;
    try {
      await reserveTask.mutateAsync(mission.id);
      setStep('accepted');
      playSuccessSound();
    } catch {
      // Reserve failed (already taken) — skip to next
      handleSkip();
    }
  }, [mission, reserveTask, handleSkip]);

  const handleExecute = useCallback(() => {
    if (!mission) return;
    const section = getTaskTypeSection(mission.task_type);
    navigate(`/admin?section=${section}`);
  }, [mission, navigate]);

  const handleResolved = useCallback(async () => {
    if (!mission) return;
    try {
      await completeTask.mutateAsync(mission.id);
      playSuccessSound();
      setStep('resolved');
      // After 5s cooldown, hide and show next
      setTimeout(() => {
        dismissedIdsRef.current.add(mission.id);
        lastSeenKeyRef.current = null;
        cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
        setVisible(false);
        setMission(null);
        setStep('propose');
        invalidateAllTaskQueries(queryClient);
      }, COOLDOWN_MS);
    } catch {
      // Already completed or error
      handleSkip();
    }
  }, [mission, completeTask, queryClient, handleSkip]);

  if (!isStaff || !mission || !visible || !missionsActive) return null;

  const countdownPercent = (countdown / COUNTDOWN_SECONDS) * 100;
  const isUrgent = countdown <= 10;
  const isWarning = countdown <= 20 && countdown > 10;
  const countdownColor = isUrgent ? 'text-destructive' : isWarning ? 'text-yellow-500' : 'text-muted-foreground';
  const barColor = isUrgent ? 'bg-destructive' : isWarning ? 'bg-yellow-500' : 'bg-primary';

  return (
    <AnimatePresence>
      <motion.div
        key={mission.id + step}
        initial={{ opacity: 0, y: -80, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -80, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 z-[100] sm:top-3 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-[92vw] sm:max-w-md"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="bg-card border-2 border-primary/40 rounded-b-2xl sm:rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden">
          {/* Countdown progress bar — only in propose step */}
          {step === 'propose' && (
            <div className="h-1.5 bg-muted relative overflow-hidden">
              <motion.div
                className={`h-full ${barColor}`}
                initial={{ width: '100%' }}
                animate={{ width: `${countdownPercent}%` }}
                transition={{ duration: 0.5, ease: 'linear' }}
              />
            </div>
          )}

          {/* Accepted/resolved gradient bar */}
          {step === 'accepted' && (
            <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
          )}
          {step === 'resolved' && (
            <div className="h-1.5 bg-gradient-to-r from-green-500 to-emerald-400" />
          )}

          <div className="p-3 sm:p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'resolved' 
                    ? 'bg-green-500/20' 
                    : step === 'accepted' 
                    ? 'bg-primary/20' 
                    : 'bg-primary/20 animate-pulse'
                }`}>
                  {step === 'resolved' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Zap className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {step === 'propose' && 'Nouvelle mission !'}
                    {step === 'accepted' && 'Mission acceptée'}
                    {step === 'resolved' && 'Mission terminée ✓'}
                  </p>
                  {step === 'propose' && (
                    <div className="flex items-center gap-1.5">
                      <span className={`text-base font-bold tabular-nums ${countdownColor} transition-colors`}>
                        {countdown}s
                      </span>
                      <span className="text-[10px] text-muted-foreground">pour accepter</span>
                    </div>
                  )}
                  {step === 'accepted' && <p className="text-[10px] text-muted-foreground">Cliquez sur Exécuter pour commencer</p>}
                  {step === 'resolved' && <p className="text-[10px] text-muted-foreground">Prochaine mission dans 5s...</p>}
                </div>
              </div>
              {step === 'propose' && (
                <button
                  onClick={handleSkip}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                  title="Passer cette mission"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Mission details */}
            <div className={`border rounded-xl p-3 mb-3 ${
              step === 'resolved' 
                ? 'bg-green-500/5 border-green-500/10' 
                : 'bg-primary/5 border-primary/10'
            }`}>
              <p className="text-sm font-semibold text-foreground">
                {TASK_TYPE_LABELS[mission.task_type] || mission.task_type}
              </p>
              {mission.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {mission.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  +{formatReward(mission.reward_cents)}
                </span>
              </div>
            </div>

            {/* Action buttons per step */}
            {step === 'propose' && (
              <Button
                onClick={handleAccept}
                disabled={reserveTask.isPending}
                className="w-full h-11 text-sm font-semibold gap-2"
                size="sm"
              >
                <Zap className="w-4 h-4" />
                {reserveTask.isPending ? 'Acceptation...' : 'Accepter la mission'}
              </Button>
            )}

            {step === 'accepted' && (
              <div className="flex gap-2">
                <Button
                  onClick={handleExecute}
                  className="flex-1 h-11 text-sm font-semibold gap-2"
                  size="sm"
                >
                  <Play className="w-4 h-4" />
                  Exécuter
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleResolved}
                  disabled={completeTask.isPending}
                  variant="outline"
                  className="flex-1 h-11 text-sm font-semibold gap-2 border-green-500/30 text-green-600 hover:bg-green-500/10"
                  size="sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {completeTask.isPending ? '...' : 'Résolu'}
                </Button>
              </div>
            )}

            {step === 'resolved' && (
              <div className="flex items-center justify-center gap-2 h-11 text-sm text-green-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Bien joué ! Prochaine mission en cours...
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModerationMissionAlert;
