import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, CreditCard, Loader2, Ticket } from 'lucide-react';

interface TopupDialogProps {
  open: boolean;
  onClose: () => void;
  topupAmount: number;
  setTopupAmount: (v: number) => void;
  onTopup: () => void;
  topupLoading: boolean;
  advertiserEmail?: string;
}

const TopupDialog = ({
  open,
  onClose,
  topupAmount,
  setTopupAmount,
  onTopup,
  topupLoading,
  advertiserEmail,
}: TopupDialogProps) => {
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ bonus_cents: number; bonus_percent: number; code_id: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const queryClient = useQueryClient();

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoApplied(null);
    try {
      const code = promoCode.trim().toUpperCase();
      const { data, error } = await supabase.from('advertiser_promo_codes' as any)
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) { setPromoError('Code invalide ou expiré'); return; }
      const promo = data as any;

      if (promo.expires_at && new Date(promo.expires_at) < new Date()) { setPromoError('Code expiré'); return; }
      if (promo.max_uses && promo.times_used >= promo.max_uses) { setPromoError('Code épuisé'); return; }

      if (advertiserEmail) {
        const { data: alreadyRedeemed } = await supabase.rpc('has_advertiser_redeemed_promo' as any, {
          _code_id: promo.id,
          _advertiser_email: advertiserEmail,
        });
        if (alreadyRedeemed) { setPromoError('Vous avez déjà utilisé ce code'); return; }
      }

      setPromoApplied({ bonus_cents: promo.bonus_cents || 0, bonus_percent: promo.bonus_percent || 0, code_id: promo.id });
    } catch {
      setPromoError('Erreur de validation');
    } finally {
      setPromoLoading(false);
    }
  };

  const bonusAmount = promoApplied
    ? (promoApplied.bonus_cents / 100) + (topupAmount * promoApplied.bonus_percent / 100)
    : 0;

  const handleTopupWithPromo = async () => {
    if (promoApplied && advertiserEmail) {
      try {
        await supabase.rpc('apply_advertiser_promo', {
          _code_id: promoApplied.code_id,
          _advertiser_email: advertiserEmail,
          _bonus_cents: Math.round(bonusAmount * 100),
        });
        queryClient.invalidateQueries({ queryKey: ['advertiser-wallet'] });
      } catch (e) {
        console.error('apply_advertiser_promo failed', e);
      }
    }
    onTopup();
  };

  const reset = () => {
    setPromoApplied(null);
    setPromoCode('');
    setPromoError('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Recharger mon portefeuille
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 20, 50, 100, 200].map((v) => (
              <Button key={v} variant={topupAmount === v ? 'default' : 'outline'} size="sm" onClick={() => setTopupAmount(v)} className="text-xs">
                {v} €
              </Button>
            ))}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Ou montant personnalisé :</label>
            <Input type="number" min={5} value={topupAmount} onChange={(e) => setTopupAmount(Number(e.target.value))} className="mt-1" />
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-primary" />
              Code promo (optionnel)
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="CODE2024"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); setPromoApplied(null); }}
                className="text-xs uppercase"
              />
              <Button size="sm" variant="outline" onClick={validatePromo} disabled={promoLoading || !promoCode.trim()} className="shrink-0 text-xs">
                {promoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Appliquer'}
              </Button>
            </div>
            {promoError && <p className="text-xs text-destructive">{promoError}</p>}
            {promoApplied && (
              <div className="text-xs bg-green-500/10 text-green-600 rounded-lg p-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Bonus : {promoApplied.bonus_cents > 0 && `+${(promoApplied.bonus_cents / 100).toFixed(2)}€`}
                {promoApplied.bonus_percent > 0 && `${promoApplied.bonus_cents > 0 ? ' + ' : '+'}${promoApplied.bonus_percent}% sur votre recharge`}
                {bonusAmount > 0 && ` = +${bonusAmount.toFixed(2)}€ offerts`}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">Le paiement sera effectué via PayPal. Montant minimum : 5€.</p>
          {bonusAmount > 0 && (
            <p className="text-xs font-medium text-primary">
              Total crédité : {topupAmount}€ + {bonusAmount.toFixed(2)}€ bonus = {(topupAmount + bonusAmount).toFixed(2)}€
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleTopupWithPromo} disabled={topupLoading || topupAmount < 5} className="gap-2">
            {topupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Payer {topupAmount}€ via PayPal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TopupDialog;
