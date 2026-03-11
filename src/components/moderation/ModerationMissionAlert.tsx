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
  // Track by id+updated_at so recycled tasks (same id, new updated_at) trigger again
  const lastSeenKeyRef = useRef<string | null>(null);
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const isOnAdminPage = location.pathname === '/admin';

  // Poll for pending tasks every 10s (always active when staff + not on admin)
  const { data: pendingTask } = useQuery({
    queryKey: ['mission-alert-poll', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('moderation_tasks')
        .select('id, task_type, description, reward_cents, created_at, updated_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data as MissionData | null;
    },
    enabled: !!user?.id && !!isStaff && !isOnAdminPage,
    refetchInterval: 10_000,
    staleTime: 8_000,
  });

  // Trigger alert when a new/recycled pending task appears
  useEffect(() => {
    if (!pendingTask || isOnAdminPage) return;
    
    const taskKey = `${pendingTask.id}::${pendingTask.updated_at}`;
    if (taskKey === lastSeenKeyRef.current) return;
    
    // New task or recycled task detected
    lastSeenKeyRef.current = taskKey;
    setMission(pendingTask);
    setVisible(true);
    playAlertSound();

    // Auto-dismiss after 30s
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 30000);
  }, [pendingTask, isOnAdminPage]);

  // Realtime: detect new/updated tasks instantly
  useEffect(() => {
    if (!user?.id || !isStaff || isOnAdminPage) return;

    const channel = supabase
      .channel('mission-alert-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'moderation_tasks' },
        (payload) => {
          const task = payload.new as any;
          if (!task || task.status !== 'pending') return;
          
          const taskKey = `${task.id}::${task.updated_at}`;
          if (taskKey === lastSeenKeyRef.current) return;

          lastSeenKeyRef.current = taskKey;
          setMission({
            id: task.id,
            task_type: task.task_type,
            description: task.description,
            reward_cents: task.reward_cents,
            created_at: task.created_at,
            updated_at: task.updated_at,
          });
          setVisible(true);
          playAlertSound();

          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = setTimeout(() => setVisible(false), 30000);
          
          // Also refresh the poll query
          queryClient.invalidateQueries({ queryKey: ['mission-alert-poll'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, isStaff, isOnAdminPage, queryClient]);

  // Repeat sound every 4s while visible
  useEffect(() => {
    if (visible && mission && !isOnAdminPage) {
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
  }, [visible, mission, isOnAdminPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
    };
  }, []);

  const handleGoToMission = useCallback(() => {
    setVisible(false);
    navigate('/admin');
  }, [navigate]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!isStaff || isOnAdminPage || !mission || !visible) return null;

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
              Voir la mission
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModerationMissionAlert;
