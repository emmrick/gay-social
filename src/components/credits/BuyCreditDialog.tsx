import { useState } from 'react';
import { 
  ShoppingCart, 
  Coins, 
  ExternalLink,
  Sparkles,
  Check,
  Clock,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CREDIT_OFFERS = [
  { 
    credits: 50, 
    price: 4.99, 
    paymentLink: 'https://checkout.revolut.com/pay/f29c297e-7d41-4f7c-823e-c93f1d53b8dc',
  },
  { 
    credits: 120, 
    price: 9.99, 
    paymentLink: 'https://checkout.revolut.com/pay/4942e50e-e341-47f3-90fc-20da3d070577',
  },
  { 
    credits: 350, 
    price: 19.99, 
    originalPrice: 29.99,
    discount: 33,
    paymentLink: 'https://checkout.revolut.com/pay/a7110be4-4136-4547-945d-e4b3143ea73a',
    highlight: true,
  },
  { 
    credits: 800, 
    price: 39.99, 
    originalPrice: 69.99,
    discount: 43,
    paymentLink: 'https://checkout.revolut.com/pay/8f4981d8-13b3-41df-a92c-562275d13755',
  },
];

interface BuyCreditDialogProps {
  trigger?: React.ReactNode;
}

const BuyCreditDialog = ({ trigger }: BuyCreditDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loadingPaypal, setLoadingPaypal] = useState<number | null>(null);

  const handlePayPal = async (offer: typeof CREDIT_OFFERS[0]) => {
    setLoadingPaypal(offer.credits);
    try {
      const returnUrl = `${window.location.origin}/paypal-return`;

      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: {
          credits: offer.credits,
          price: offer.price,
          return_url: returnUrl,
        },
      });

      if (error) throw error;

      if (data?.approve_url) {
        window.location.href = data.approve_url;
      } else {
        throw new Error('Aucun lien PayPal reçu');
      }
    } catch (err: any) {
      console.error('PayPal error:', err);
      toast.error('Erreur lors de la création du paiement PayPal');
    } finally {
      setLoadingPaypal(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Acheter des crédits
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            Acheter des crédits
          </DialogTitle>
          <DialogDescription>
            Choisissez une offre et payez via PayPal ou Revolut.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {CREDIT_OFFERS.map((offer) => (
            <div
              key={offer.credits}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                offer.highlight 
                  ? 'border-green-500/60 bg-gradient-to-br from-green-500/5 to-emerald-500/5 relative' 
                  : 'border-border'
              }`}
            >
              {offer.highlight && offer.discount && (
                <div className="absolute -top-2.5 right-3">
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px]">
                    <Sparkles className="w-3 h-3 mr-1" />
                    -{offer.discount}%
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Coins className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-lg">{offer.credits} crédits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${offer.highlight ? 'text-green-600' : 'text-primary'}`}>
                      {offer.price.toFixed(2).replace('.', ',')} €
                    </span>
                    {offer.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        {offer.originalPrice.toFixed(2).replace('.', ',')} €
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handlePayPal(offer)}
                  disabled={loadingPaypal !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0070ba] hover:bg-[#005ea6] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {loadingPaypal === offer.credits ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.645h6.577c2.18 0 3.703.562 4.527 1.671.387.52.632 1.09.744 1.74.117.678.12 1.488.006 2.47l-.008.056v.488l.38.216c.32.177.578.38.777.612.332.388.548.876.64 1.449.095.585.064 1.264-.09 2.016-.178.862-.466 1.614-.855 2.23a4.676 4.676 0 0 1-1.337 1.39 5.11 5.11 0 0 1-1.744.773 8.484 8.484 0 0 1-2.146.246h-.51a1.54 1.54 0 0 0-1.522 1.302l-.026.15-.436 2.76-.02.107a.143.143 0 0 1-.04.09.136.136 0 0 1-.09.034z"/>
                      </svg>
                      PayPal
                    </>
                  )}
                </button>
                <button
                  onClick={() => window.open(offer.paymentLink, '_blank')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-muted text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Revolut
                </button>
              </div>

              <div className="flex gap-3 mt-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />Sans expiration</span>
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />Paiement sécurisé</span>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>PayPal : crédits instantanés · Revolut : validation admin</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyCreditDialog;
