import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ShoppingCart, 
  Coins, 
  Euro, 
  Loader2, 
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import ContactCreditIssueDialog from './ContactCreditIssueDialog';

// Credit packages
const CREDIT_PACKAGES = [
  { credits: 50, price: 4.99 },
  { credits: 120, price: 9.99 },
  { credits: 300, price: 19.99 },
  { credits: 700, price: 39.99 },
];

// Special offer - Revolut direct payment
const SPECIAL_OFFER = {
  credits: 250,
  price: 10.99,
  originalPrice: 15.99,
  paymentLink: 'https://checkout.revolut.com/pay/45dd2e98-7ab4-40e7-ad01-5a64dedee6dd',
};

const PAYMENT_METHODS = [
  { value: 'paypal', label: 'PayPal' },
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'crypto', label: 'Cryptomonnaie' },
  { value: 'other', label: 'Autre' },
];

interface BuyCreditDialogProps {
  trigger?: React.ReactNode;
}

const BuyCreditDialog = ({ trigger }: BuyCreditDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<typeof CREDIT_PACKAGES[0] | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Fetch user's purchase requests
  const { data: myRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['my-credit-purchase-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('credit_purchase_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const pendingRequest = myRequests.find(r => r.status === 'pending');

  // Submit purchase request
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const amount = selectedPackage?.credits || parseFloat(customAmount);
      const price = selectedPackage?.price || (parseFloat(customAmount) * 0.1); // 0.1€ per credit for custom

      if (!amount || amount <= 0) {
        throw new Error('Montant invalide');
      }

      if (!paymentMethod) {
        throw new Error('Veuillez sélectionner une méthode de paiement');
      }

      const { error } = await supabase
        .from('credit_purchase_requests')
        .insert({
          user_id: user.id,
          amount,
          price_euros: price,
          payment_method: paymentMethod,
          payment_reference: paymentReference || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Demande envoyée !', {
        description: 'Un administrateur validera votre achat prochainement.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-credit-purchase-requests', user?.id] });
      setSelectedPackage(null);
      setCustomAmount('');
      setPaymentMethod('');
      setPaymentReference('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'envoi');
    },
  });

  const handleSelectPackage = (pkg: typeof CREDIT_PACKAGES[0]) => {
    setSelectedPackage(pkg);
    setCustomAmount('');
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    setSelectedPackage(null);
  };

  const currentAmount = selectedPackage?.credits || parseFloat(customAmount) || 0;
  const currentPrice = selectedPackage?.price || (currentAmount * 0.1);

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

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            Acheter des crédits
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un pack ou entrez un montant personnalisé
          </DialogDescription>
        </DialogHeader>

        {pendingRequest ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Demande en attente</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Vous avez une demande de {pendingRequest.amount} crédits ({pendingRequest.price_euros}€) en cours de validation.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Envoyée {formatDistanceToNow(new Date(pendingRequest.created_at), { addSuffix: true, locale: fr })}
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? 'Masquer l\'historique' : 'Voir l\'historique'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Special Offer - Highlighted */}
            <div className="relative p-4 rounded-lg border-2 border-amber-500 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
              <div className="absolute -top-2 left-3">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
                  <Sparkles className="w-3 h-3" />
                  Offre spéciale
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Coins className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-lg">{SPECIAL_OFFER.credits} crédits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">{SPECIAL_OFFER.price.toFixed(2)}€</span>
                    <span className="text-sm text-muted-foreground line-through">{SPECIAL_OFFER.originalPrice.toFixed(2)}€</span>
                    <Badge variant="secondary" className="text-xs">-31%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Un prix plus agréable !</p>
                </div>
                <Button 
                  onClick={() => window.open(SPECIAL_OFFER.paymentLink, '_blank')}
                  className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <ExternalLink className="w-4 h-4" />
                  Acheter
                </Button>
              </div>
            </div>

            {/* Credit Packages */}
            <div className="grid grid-cols-2 gap-2">
              {CREDIT_PACKAGES.map((pkg) => (
                <button
                  key={pkg.credits}
                  onClick={() => handleSelectPackage(pkg)}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all",
                    selectedPackage?.credits === pkg.credits
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="font-bold">{pkg.credits}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-primary">
                    <Euro className="w-3 h-3" />
                    <span>{pkg.price.toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="space-y-2">
              <Label>Ou montant personnalisé</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="10"
                  step="1"
                  placeholder="Ex: 200"
                  value={customAmount}
                  onChange={(e) => handleCustomAmount(e.target.value)}
                />
                <div className="flex items-center gap-1 px-3 bg-muted rounded-md text-sm">
                  <Euro className="w-3 h-3" />
                  <span>{(parseFloat(customAmount) * 0.1 || 0).toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                0.10€ par crédit pour les achats personnalisés
              </p>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Méthode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Reference */}
            <div className="space-y-2">
              <Label>Référence de paiement (optionnel)</Label>
              <Textarea
                placeholder="Ex: ID de transaction PayPal, numéro de virement..."
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                rows={2}
              />
            </div>

            {/* Summary */}
            {currentAmount > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-muted-foreground">Crédits</span>
                  <span className="font-medium">{currentAmount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Prix</span>
                  <span className="font-bold text-primary">{currentPrice.toFixed(2)}€</span>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                <p className="text-muted-foreground">
                  Après avoir effectué le paiement, un administrateur validera votre achat et les crédits seront ajoutés à votre compte.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Purchase History */}
        {showHistory && myRequests.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium">Historique des achats</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {myRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                  <div>
                    <span className="font-medium">{request.amount} crédits</span>
                    <span className="text-muted-foreground ml-2">({request.price_euros}€)</span>
                  </div>
                  <Badge
                    className={cn(
                      "text-white",
                      request.status === 'pending' && "bg-amber-500",
                      request.status === 'approved' && "bg-green-500",
                      request.status === 'rejected' && "bg-red-500"
                    )}
                  >
                    {request.status === 'pending' && 'En attente'}
                    {request.status === 'approved' && 'Validé'}
                    {request.status === 'rejected' && 'Rejeté'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact for credit issues */}
        <div className="pt-4 border-t">
          <ContactCreditIssueDialog />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
          {!pendingRequest && (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || currentAmount <= 0 || !paymentMethod}
              className="gap-2"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Envoyer la demande
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BuyCreditDialog;
