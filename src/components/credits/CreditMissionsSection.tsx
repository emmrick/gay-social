import { 
  Shield, Users, Camera, UserCheck, MessageCircle,
  CheckCircle2, ChevronRight, Flame, Target, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CREDIT_REWARDS } from '@/hooks/useCredits';
import { useDynamicCreditCosts } from '@/hooks/useDynamicCreditCosts';
import { useAuth } from '@/contexts/AuthContext';
import { useProfilePhotos } from '@/hooks/useProfilePhotos';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CreditMissionsSection = () => {
  const { data: dynamicCosts } = useDynamicCreditCosts();
  const { user, profile } = useAuth();
  const { photos } = useProfilePhotos(user?.id);

  // Check verification status
  const { data: verification } = useQuery({
    queryKey: ['verification-status-mission', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('identity_verifications')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Check referral count
  const { data: referralCount } = useQuery({
    queryKey: ['referral-count-mission', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('transaction_type', 'earn')
        .like('description', '%parrainage%');
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Check message count (today)
  const { data: todayMessageCount } = useQuery({
    queryKey: ['message-count-mission', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .eq('is_private', true)
        .gte('created_at', todayStart.toISOString());
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const isVerified = profile?.is_verified === true || verification?.status === 'approved';
  const hasPhotos = (photos?.length ?? 0) >= 3;
  const isProfileComplete = !!(profile?.bio && profile?.age && profile?.avatar_url && profile?.sexual_position);
  const hasReferrals = (referralCount ?? 0) > 0;
  const hasSent10Messages = (todayMessageCount ?? 0) >= 10;

  const handleCompletedClick = (label: string) => {
    toast.info('Mission déjà effectuée ✅', {
      description: `« ${label} » est terminée. Bravo !`,
      duration: 3000,
    });
  };

  const missions = [
    {
      icon: Shield,
      label: 'Vérifier mon identité',
      reward: `+${CREDIT_REWARDS.identity_verification}`,
      color: 'text-blue-500 bg-blue-500/10',
      completedColor: 'text-emerald-500 bg-emerald-500/10',
      done: isVerified,
      cta: 'Vérifier',
      navTarget: 'verification',
    },
    {
      icon: Users,
      label: 'Parrainer un ami',
      reward: `+${dynamicCosts?.referral_reward ?? CREDIT_REWARDS.referral_success}`,
      color: 'text-purple-500 bg-purple-500/10',
      completedColor: 'text-emerald-500 bg-emerald-500/10',
      done: hasReferrals,
      cta: 'Inviter',
      navTarget: 'referral',
    },
    {
      icon: Camera,
      label: 'Ajouter 3+ photos',
      reward: '+2',
      color: 'text-pink-500 bg-pink-500/10',
      completedColor: 'text-emerald-500 bg-emerald-500/10',
      done: hasPhotos,
      cta: 'Ajouter',
      navTarget: 'photos',
    },
    {
      icon: UserCheck,
      label: 'Compléter mon profil',
      reward: '+3',
      color: 'text-emerald-500 bg-emerald-500/10',
      completedColor: 'text-emerald-500 bg-emerald-500/10',
      done: isProfileComplete,
      cta: 'Compléter',
      navTarget: 'profile',
    },
    {
      icon: MessageCircle,
      label: 'Envoyer 10 messages',
      reward: '+1',
      color: 'text-amber-500 bg-amber-500/10',
      completedColor: 'text-emerald-500 bg-emerald-500/10',
      done: hasSent10Messages,
      cta: 'Discuter',
      navTarget: 'messages',
      progress: Math.min(todayMessageCount ?? 0, 10),
      progressMax: 10,
    },
  ];

  const completedCount = missions.filter(m => m.done).length;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Gagner des crédits</h2>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
          {completedCount}/{missions.length} terminées
        </span>
      </div>

      <div className="space-y-2">
        {missions.map((mission, i) => {
          const Icon = mission.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                mission.done
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-border/60 bg-card hover:bg-muted/30"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                mission.done ? mission.completedColor : mission.color
              )}>
                {mission.done ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[13px] font-medium truncate",
                  mission.done && "line-through text-muted-foreground"
                )}>
                  {mission.label}
                </p>
                {mission.done ? (
                  <p className="text-xs font-semibold text-emerald-500">✓ Terminée</p>
                ) : (
                  <>
                    <p className="text-xs font-mono font-semibold text-emerald-500">{mission.reward} crédits</p>
                    {mission.progress !== undefined && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${(mission.progress / mission.progressMax!) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {mission.progress}/{mission.progressMax}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
              {mission.done ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs font-medium gap-1 shrink-0 text-emerald-500 hover:text-emerald-600"
                  onClick={() => handleCompletedClick(mission.label)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Fait
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs font-medium gap-1 shrink-0 text-primary"
                  onClick={() => {
                    // Navigate using sessionStorage-based nav
                    if (mission.navTarget === 'verification') {
                      window.location.href = '/?showVerification=true';
                    } else if (mission.navTarget === 'referral' || mission.navTarget === 'profile' || mission.navTarget === 'photos') {
                      // Switch to profile tab
                      const stored = sessionStorage.getItem('gc_nav_state');
                      if (stored) {
                        const state = JSON.parse(stored);
                        state.currentView = 'profile';
                        state.activeTab = 'profile';
                        sessionStorage.setItem('gc_nav_state', JSON.stringify(state));
                      }
                      window.location.reload();
                    } else if (mission.navTarget === 'messages') {
                      const stored = sessionStorage.getItem('gc_nav_state');
                      if (stored) {
                        const state = JSON.parse(stored);
                        state.currentView = 'home';
                        state.activeTab = 'messages';
                        sessionStorage.setItem('gc_nav_state', JSON.stringify(state));
                      }
                      window.location.reload();
                    }
                  }}
                >
                  {mission.cta}
                  <ChevronRight className="w-3 h-3" />
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Streak hint */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15"
      >
        <Flame className="w-5 h-5 text-orange-500 shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">Connexion quotidienne</p>
          <p className="text-[11px] text-muted-foreground">
            5 crédits rechargés chaque jour. Revenez régulièrement !
          </p>
        </div>
      </motion.div>
    </section>
  );
};

export default CreditMissionsSection;
