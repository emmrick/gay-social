import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notifyInsufficientCreditsSync } from '@/lib/credits/insufficientCreditsToast';
import { BanIcon, Check, Loader2, Sparkles, Star, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAdFreeSubscription } from '@/hooks/useAds';

interface AdFreeSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AdFreePlan {
  id: string;
  label: string;
  duration_days: number;
  credits_cost: number;
  tag: string | null;
  is_popular: boolean;
  display_order: number;
}

const BENEFITS = [
  'Aucune publicité visible sur le site',
  'Navigation plus rapide et épurée',
  'Renouvellement flexible à tout moment',
];

const AdFreeSubscriptionDialog = ({ open, onOpenChange }: AdFreeSubscriptionDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { data: currentSub } = useAdFreeSubscription();
  const isExtending = !!currentSub?.isActive;

  const { data: plans } = useQuery({
    queryKey: ['ad-free-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_free_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as AdFreePlan[];
    },
    enabled: open,
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('ad-free-plans-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_free_plans' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ad-free-plans'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Auto-select popular or first plan
  useEffect(() => {
    if (plans?.length && !selectedPlanId) {
      const popular = plans.find(p => p.is_popular);
      setSelectedPlanId(popular?.id || plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const selected = plans?.find(p => p.id === selectedPlanId);

  const handleSubscribe = async () => {
    if (!user?.id || !selectedPlanId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('subscribe_ad_free' as any, {
        _user_id: user.id,
        _plan_id: selectedPlanId,
      });

      const result = data as any;
      if (error || !result?.success) {
        const msg = result?.error || error?.message || 'Erreur inconnue';
        if (msg.includes('Insufficient') || msg.includes('insuffisants')) {
          toast.error('Crédits insuffisants', { description: 'Rechargez votre solde pour souscrire.' });
        } else {
          toast.error(msg);
        }
        return;
      }

      toast.success('🎉 Abonnement sans pub activé !', {
        description: `Valable jusqu'au ${new Date(result.expires_at).toLocaleDateString('fr-FR')}`,
      });

      queryClient.invalidateQueries({ queryKey: ['ad-free-status'] });
      queryClient.invalidateQueries({ queryKey: ['ad-free-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user-credits'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la souscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <BanIcon className="w-4 h-4 text-primary" />
            </div>
            {isExtending ? 'Prolonger sans pub' : 'Navigation sans pub'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isExtending
              ? 'Ajoutez du temps à votre abonnement actuel en utilisant des crédits.'
              : "Profitez d'une expérience sans publicité en échange de crédits."}
          </DialogDescription>
        </DialogHeader>

        {/* Active subscription banner */}
        {isExtending && currentSub?.isActive && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Abonnement actif
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Expire le <strong className="text-foreground">{currentSub.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              {' '}({currentSub.daysRemaining > 0 ? `${currentSub.daysRemaining} j` : `${currentSub.hoursRemaining} h`} restant{currentSub.daysRemaining > 1 ? 's' : ''}).
              {' '}La nouvelle durée s'<strong className="text-foreground">ajoutera</strong> à cette date.
            </p>
          </div>
        )}

        <div className="space-y-4 pt-2">
          {/* Plans */}
          <div className={cn("grid gap-2", plans && plans.length <= 3 ? `grid-cols-${plans.length}` : 'grid-cols-2')}>
            {plans?.map((plan) => (
              <motion.button
                key={plan.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedPlanId(plan.id)}
                className={cn(
                  "relative rounded-xl border-2 p-3 text-center transition-all duration-200",
                  selectedPlanId === plan.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/50 bg-card hover:border-border"
                )}
              >
                {plan.is_popular && plan.tag && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full whitespace-nowrap">
                    {plan.tag}
                  </span>
                )}
                {!plan.is_popular && plan.tag && (
                  <Badge variant="secondary" className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0 whitespace-nowrap">
                    {plan.tag}
                  </Badge>
                )}
                <p className="text-lg font-bold text-foreground">{plan.credits_cost}</p>
                <p className="text-[10px] text-muted-foreground font-medium">crédits</p>
                <p className="text-xs font-semibold text-foreground mt-1">{plan.label}</p>
                {plan.duration_days > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    {(plan.credits_cost / plan.duration_days).toFixed(1)} cr/jour
                  </p>
                )}
              </motion.button>
            ))}
          </div>

          {!plans?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune offre disponible pour le moment.</p>
          )}

          {/* Benefits */}
          <div className="space-y-2 px-1">
            {BENEFITS.map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Subscribe button */}
          <Button
            onClick={handleSubscribe}
            disabled={isLoading || !selected}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {isExtending ? 'Prolonger pour' : 'Souscrire pour'} {selected?.credits_cost ?? '...'} crédits
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            {isExtending
              ? 'Les crédits seront déduits immédiatement. La durée choisie s\'ajoute à votre période actuelle.'
              : 'Les crédits seront déduits immédiatement. Pas de renouvellement automatique.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdFreeSubscriptionDialog;
