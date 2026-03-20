import { useState } from 'react';
import { 
  Shield, Users, Camera, UserCheck, MessageCircle,
  CheckCircle2, ChevronRight, Flame, Trophy, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CREDIT_REWARDS } from '@/hooks/useCredits';
import { useDynamicCreditCosts } from '@/hooks/useDynamicCreditCosts';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const CreditMissionsSection = () => {
  const { data: dynamicCosts } = useDynamicCreditCosts();
  const navigate = useNavigate();

  const missions = [
    {
      icon: Shield,
      label: 'Vérifier mon identité',
      reward: `+${CREDIT_REWARDS.identity_verification}`,
      color: 'text-blue-500 bg-blue-500/10',
      action: () => navigate('/?showVerification=true'),
      cta: 'Vérifier',
    },
    {
      icon: Users,
      label: 'Parrainer un ami',
      reward: `+${dynamicCosts?.referral_reward ?? CREDIT_REWARDS.referral_success}`,
      color: 'text-purple-500 bg-purple-500/10',
      action: () => navigate('/?tab=profile'),
      cta: 'Inviter',
    },
    {
      icon: Camera,
      label: 'Ajouter des photos',
      reward: '+2',
      color: 'text-pink-500 bg-pink-500/10',
      action: () => navigate('/?tab=profile'),
      cta: 'Ajouter',
    },
    {
      icon: UserCheck,
      label: 'Compléter mon profil',
      reward: '+3',
      color: 'text-emerald-500 bg-emerald-500/10',
      action: () => navigate('/?tab=profile'),
      cta: 'Compléter',
    },
    {
      icon: MessageCircle,
      label: 'Envoyer 10 messages',
      reward: '+1',
      color: 'text-amber-500 bg-amber-500/10',
      cta: 'Discuter',
      action: () => navigate('/?tab=chat'),
    },
  ];

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Gagner des crédits</h2>
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
              className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors group"
            >
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", mission.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{mission.label}</p>
                <p className="text-xs font-mono font-semibold text-emerald-500">{mission.reward} crédits</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs font-medium gap-1 shrink-0 text-primary"
                onClick={mission.action}
              >
                {mission.cta}
                <ChevronRight className="w-3 h-3" />
              </Button>
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
