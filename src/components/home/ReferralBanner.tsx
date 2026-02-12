import { Gift, ArrowRight, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReferral } from '@/hooks/useReferral';
import { CREDIT_REWARDS } from '@/hooks/useCredits';

const ReferralBanner = () => {
  const { referralCode, shareReferralLink, isLoading } = useReferral();

  if (isLoading || !referralCode) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Invite tes amis, gagne {CREDIT_REWARDS.referral_success} crédits !
          </p>
          <p className="text-xs text-muted-foreground">
            Toi et ton filleul recevez des crédits gratuits
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={shareReferralLink}
          className="flex-shrink-0"
        >
          <Share2 className="w-4 h-4 mr-1" />
          Inviter
        </Button>
      </div>
    </div>
  );
};

export default ReferralBanner;
