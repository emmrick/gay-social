import { Zap, Shield, Clock, Users } from 'lucide-react';
import { CREDIT_REWARDS } from '@/hooks/useCredits';
import { useDynamicCreditCosts } from '@/hooks/useDynamicCreditCosts';

const EarnCreditsSection = () => {
  const { data: dynamicCosts } = useDynamicCreditCosts();

  const items = [
    { icon: <Zap className="w-4 h-4" />, label: 'Inscription', value: `+${CREDIT_REWARDS.signup}`, color: 'text-green-500 bg-green-500/10' },
    { icon: <Shield className="w-4 h-4" />, label: 'Vérification d\'identité', value: `+${CREDIT_REWARDS.identity_verification}`, color: 'text-blue-500 bg-blue-500/10' },
    { icon: <Clock className="w-4 h-4" />, label: 'Crédits quotidiens', value: `+${CREDIT_REWARDS.daily_claim}/j`, color: 'text-amber-500 bg-amber-500/10' },
    { icon: <Clock className="w-4 h-4" />, label: 'Crédits passifs', value: '+0.1/6h (max 10)', color: 'text-yellow-500 bg-yellow-500/10' },
    { icon: <Users className="w-4 h-4" />, label: 'Parrainage', value: `+${dynamicCosts?.referral_reward ?? CREDIT_REWARDS.referral_success}`, color: 'text-purple-500 bg-purple-500/10' },
  ];

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
              {item.icon}
            </div>
            <span className="text-[13px]">{item.label}</span>
          </div>
          <span className="text-[13px] font-mono font-semibold text-green-500">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

export default EarnCreditsSection;
