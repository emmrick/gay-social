import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

interface MissionData {
  id: string;
  task_type: string;
  description: string | null;
  reward_cents: number;
  created_at: string;
  updated_at: string;
}

const ModerationMissionAlert = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [mission, setMission] = useState<MissionData | null>(null);
  const lastSeenKeyRef = useRef<string | null>(null);
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track dismissed mission IDs so we skip them until a new one arrives
  const cooldownUntilRef = useRef<number>(0); // timestamp until which new alerts are suppressed
  const dismissedIdsRef = useRef<Set<string>>(new Set());

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

  // Poll for pending tasks every 10s — ALWAYS active when staff (including on admin page)
  const { data: pendingTasks, refetch: refetchPending } = useQuery({
    queryKey: ['mission-alert-poll', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('moderation_tasks')
        .select('id, task_type, description, reward_cents, created_at, updated_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5);
      if (error) return [];
      return (data || []) as MissionData[];
    },
    enabled: !!user?.id && !!isStaff,
    refetchInterval: 10_000,
    staleTime: 8_000,
  });

  // Find the first non-dismissed pending task
  const nextAvailableTask = pendingTasks?.find(t => !dismissedIdsRef.current.has(t.id)) ?? null;

  // Trigger alert when a new/recycled pending task appears (with 5s cooldown after dismiss)
  useEffect(() => {
    if (!nextAvailableTask) {
      if (visible) setVisible(false);
      return;
    }

    const taskKey = `${nextAvailableTask.id}::${nextAvailableTask.updated_at}`;
    if (taskKey === lastSeenKeyRef.current) return;

    // If we're in cooldown after a dismiss, delay the alert
    const now = Date.now();
    const cooldownRemaining = cooldownUntilRef.current - now;
    if (cooldownRemaining > 0) {
      const delayTimer = setTimeout(() => {
        // Re-check the key hasn't been set by another effect in the meantime
        if (lastSeenKeyRef.current === taskKey) return;
        lastSeenKeyRef.current = taskKey;
        setMission(nextAvailableTask);
        setVisible(true);
        playAlertSound();

        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(() => setVisible(false), 30000);
      }, cooldownRemaining);
      return () => clearTimeout(delayTimer);
    }

    // New task or recycled task detected
    if (dismissedIdsRef.current.has(nextAvailableTask.id)) {
      dismissedIdsRef.current.delete(nextAvailableTask.id);
    }

    lastSeenKeyRef.current = taskKey;
    setMission(nextAvailableTask);
    setVisible(true);
    playAlertSound();

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 30000);
  }, [nextAvailableTask]);

  // Realtime: detect new/updated tasks instantly
  useEffect(() => {
    if (!user?.id || !isStaff) return;

    const channel = supabase
      .channel('mission-alert-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'moderation_tasks' },
        () => {
          // Just invalidate the poll query to pick up changes
          refetchPending();
          queryClient.invalidateQueries({ queryKey: ['mission-alert-poll'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, isStaff, queryClient, refetchPending]);

  // Repeat sound every 4s while visible
  useEffect(() => {
    if (visible && mission) {
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
  }, [visible, mission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
    };
  }, []);

  const handleGoToMission = useCallback(() => {
    setVisible(false);
    if (!isOnAdminPage) navigate('/admin');
  }, [navigate, isOnAdminPage]);

  const handleDismiss = useCallback(() => {
    // Dismiss current mission and wait 5s before proposing the next one
    if (mission) {
      dismissedIdsRef.current.add(mission.id);
      lastSeenKeyRef.current = null;
      cooldownUntilRef.current = Date.now() + 5000; // 5s cooldown
    }
    setVisible(false);
    setMission(null);
  }, [mission]);

  if (!isStaff || !mission || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -80, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -80, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 z-[100] sm:top-3 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-[92vw] sm:max-w-md"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="bg-card border-2 border-primary/40 rounded-b-2xl sm:rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary animate-pulse" />

          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Nouvelle mission !</p>
                  <p className="text-[10px] text-muted-foreground">Cliquez pour traiter</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 mb-3">
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

            <Button
              onClick={handleGoToMission}
              className="w-full h-11 text-sm font-semibold gap-2"
              size="sm"
            >
              <Zap className="w-4 h-4" />
              {isOnAdminPage ? 'Traiter la mission' : 'Voir la mission'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModerationMissionAlert;
