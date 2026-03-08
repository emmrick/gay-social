import { useState } from 'react';
import { 
  ShoppingCart, 
  Coins, 
  ExternalLink,
  Sparkles,
  Check,
  Clock
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
            Choisissez une offre et payez en toute sécurité via Revolut.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {CREDIT_OFFERS.map((offer) => (
            <button
              key={offer.credits}
              onClick={() => window.open(offer.paymentLink, '_blank')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-md active:scale-[0.98] ${
                offer.highlight 
                  ? 'border-green-500/60 bg-gradient-to-br from-green-500/5 to-emerald-500/5 relative' 
                  : 'border-border hover:border-primary/50'
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
              <div className="flex items-center justify-between">
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  offer.highlight ? 'bg-green-500/20' : 'bg-primary/10'
                }`}>
                  <ExternalLink className={`w-5 h-5 ${offer.highlight ? 'text-green-600' : 'text-primary'}`} />
                </div>
              </div>
              <div className="flex gap-3 mt-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />Sans expiration</span>
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />Paiement sécurisé</span>
              </div>
            </button>
          ))}

          <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Crédits ajoutés après validation par un administrateur</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyCreditDialog;
