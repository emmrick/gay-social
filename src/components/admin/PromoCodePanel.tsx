import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Ticket, 
  Percent, 
  Gift,
  Calendar,
  Hash,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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

interface PromoCode {
  id: string;
  code: string;
  couponId: string;
  percentOff: number | null;
  amountOff: number | null;
  duration: string;
  durationInMonths: number | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const usePromoCodes = () => {
  return useQuery({
    queryKey: ['admin-promo-codes'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-promo-codes', {
        body: { action: 'list' },
      });
      if (error) throw error;
      return data as PromoCode[];
    },
  });
};

const useCreatePromoCode = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      code: string;
      name: string;
      percentOff?: number;
      amountOff?: number;
      freeTrial?: boolean;
      duration?: string;
      durationInMonths?: number;
      maxRedemptions?: number;
      expiresAt?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('manage-promo-codes', {
        body: { action: 'create', ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
      toast.success('Code promo créé avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
};

const useDeactivatePromoCode = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (promoCodeId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-promo-codes', {
        body: { action: 'deactivate', promoCodeId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] });
      toast.success('Code promo désactivé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
};

const PromoCodePanel = () => {
  const { data: promoCodes, isLoading } = usePromoCodes();
  const createPromoCode = useCreatePromoCode();
  const deactivatePromoCode = useDeactivatePromoCode();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'amount' | 'freeTrial'>('percent');
  const [percentOff, setPercentOff] = useState('');
  const [amountOff, setAmountOff] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');

  const resetForm = () => {
    setCode('');
    setName('');
    setDiscountType('percent');
    setPercentOff('');
    setAmountOff('');
    setMaxRedemptions('');
    setHasExpiry(false);
    setExpiryDate('');
  };

  const handleCreate = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error('Veuillez remplir le code et le nom');
      return;
    }

    const params: any = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
    };

    if (discountType === 'freeTrial') {
      params.freeTrial = true;
    } else if (discountType === 'percent') {
      const pct = parseFloat(percentOff);
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        toast.error('Pourcentage invalide (1-100)');
        return;
      }
      params.percentOff = pct;
    } else {
      const amt = parseFloat(amountOff);
      if (isNaN(amt) || amt <= 0) {
        toast.error('Montant invalide');
        return;
      }
      params.amountOff = Math.round(amt * 100); // Convert to cents
    }

    if (maxRedemptions) {
      params.maxRedemptions = parseInt(maxRedemptions);
    }

    if (hasExpiry && expiryDate) {
      params.expiresAt = expiryDate;
    }

    await createPromoCode.mutateAsync(params);
    resetForm();
    setIsCreateDialogOpen(false);
  };

  const activeCodes = promoCodes?.filter(pc => pc.active) || [];
  const inactiveCodes = promoCodes?.filter(pc => !pc.active) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Codes Promo</h2>
          <Badge variant="secondary">{activeCodes.length} actifs</Badge>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau code
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                Créer un code promo
              </DialogTitle>
              <DialogDescription>
                Créez un code promotionnel pour offrir des réductions à vos utilisateurs.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Code */}
              <div className="space-y-2">
                <Label htmlFor="code">Code promo</Label>
                <Input
                  id="code"
                  placeholder="PROMO2024"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la promotion</Label>
                <Input
                  id="name"
                  placeholder="Promotion de lancement"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Discount Type */}
              <div className="space-y-2">
                <Label>Type de réduction</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">
                      <span className="flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        Pourcentage
                      </span>
                    </SelectItem>
                    <SelectItem value="amount">
                      <span className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Montant fixe (€)
                      </span>
                    </SelectItem>
                    <SelectItem value="freeTrial">
                      <span className="flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        30 jours gratuits
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Discount Value */}
              {discountType === 'percent' && (
                <div className="space-y-2">
                  <Label htmlFor="percentOff">Pourcentage de réduction</Label>
                  <div className="relative">
                    <Input
                      id="percentOff"
                      type="number"
                      min="1"
                      max="100"
                      placeholder="20"
                      value={percentOff}
                      onChange={(e) => setPercentOff(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
              )}

              {discountType === 'amount' && (
                <div className="space-y-2">
                  <Label htmlFor="amountOff">Montant de réduction</Label>
                  <div className="relative">
                    <Input
                      id="amountOff"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="2.00"
                      value={amountOff}
                      onChange={(e) => setAmountOff(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  </div>
                </div>
              )}

              {discountType === 'freeTrial' && (
                <div className="p-3 rounded-lg bg-primary/10 text-sm">
                  <Gift className="w-4 h-4 inline mr-2 text-primary" />
                  Ce code offrira <strong>100% de réduction</strong> sur le premier mois.
                </div>
              )}

              {/* Max Redemptions */}
              <div className="space-y-2">
                <Label htmlFor="maxRedemptions">Limite d'utilisation (optionnel)</Label>
                <Input
                  id="maxRedemptions"
                  type="number"
                  min="1"
                  placeholder="Illimité"
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                />
              </div>

              {/* Expiry */}
              <div className="flex items-center justify-between">
                <Label htmlFor="hasExpiry">Date d'expiration</Label>
                <Switch
                  id="hasExpiry"
                  checked={hasExpiry}
                  onCheckedChange={setHasExpiry}
                />
              </div>

              {hasExpiry && (
                <div className="space-y-2">
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={createPromoCode.isPending}>
                {createPromoCode.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Promo Codes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Codes actifs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : activeCodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Aucun code promo actif</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeCodes.map((promo) => (
                  <PromoCodeCard
                    key={promo.id}
                    promo={promo}
                    onDeactivate={() => deactivatePromoCode.mutate(promo.id)}
                    isDeactivating={deactivatePromoCode.isPending}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Inactive Promo Codes */}
      {inactiveCodes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="w-4 h-4 text-muted-foreground" />
              Codes désactivés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {inactiveCodes.map((promo) => (
                  <PromoCodeCard key={promo.id} promo={promo} inactive />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const PromoCodeCard = ({ 
  promo, 
  onDeactivate, 
  isDeactivating,
  inactive 
}: { 
  promo: PromoCode; 
  onDeactivate?: () => void;
  isDeactivating?: boolean;
  inactive?: boolean;
}) => {
  const getDiscountLabel = () => {
    if (promo.percentOff === 100 && promo.durationInMonths === 1) {
      return '30 jours gratuits';
    }
    if (promo.percentOff) {
      return `${promo.percentOff}% de réduction`;
    }
    if (promo.amountOff) {
      return `${(promo.amountOff / 100).toFixed(2)}€ de réduction`;
    }
    return 'Réduction';
  };

  return (
    <div className={`p-4 rounded-lg border ${inactive ? 'bg-muted/50 opacity-60' : 'bg-card'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            promo.percentOff === 100 
              ? 'bg-primary/20 text-primary' 
              : 'bg-green-500/20 text-green-500'
          }`}>
            {promo.percentOff === 100 ? <Gift className="w-5 h-5" /> : <Percent className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <code className="font-mono font-bold text-lg">{promo.code}</code>
              <Badge variant={inactive ? 'secondary' : 'default'} className="text-xs">
                {getDiscountLabel()}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span>{promo.timesRedeemed} utilisation{promo.timesRedeemed > 1 ? 's' : ''}</span>
              {promo.maxRedemptions && (
                <span>/ {promo.maxRedemptions} max</span>
              )}
              {promo.expiresAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Expire le {format(new Date(promo.expiresAt), 'dd/MM/yyyy', { locale: fr })}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {!inactive && onDeactivate && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDeactivate}
            disabled={isDeactivating}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {isDeactivating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PromoCodePanel;
