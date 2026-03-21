import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Coins, Plus, Pencil, Trash2, Eye, EyeOff, Star, Loader2, GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CreditOffer {
  id: string;
  credits: number;
  price_euros: number;
  original_price_euros: number | null;
  discount_percent: number | null;
  is_highlighted: boolean;
  is_active: boolean;
  label: string | null;
  display_order: number;
  created_at: string;
}

const CreditOffersPanel = () => {
  const [editOffer, setEditOffer] = useState<CreditOffer | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['admin-credit-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_offers')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as CreditOffer[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('credit_offers').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-credit-offers'] });
      toast.success('Offre mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('credit_offers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-credit-offers'] });
      toast.success('Offre supprimée');
    },
  });

  const highlightMutation = useMutation({
    mutationFn: async ({ id, is_highlighted }: { id: string; is_highlighted: boolean }) => {
      const { error } = await supabase.from('credit_offers').update({ is_highlighted }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-credit-offers'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Offres d'achat de crédits
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Les nouvelles offres apparaissent instantanément dans le pop-up d'achat.
          </p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" /> Nouvelle offre
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-2">
            {offers.map((offer) => (
              <Card key={offer.id} className={`transition-all ${!offer.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{offer.credits} crédits</span>
                      <span className="text-sm text-primary font-semibold">
                        {offer.price_euros.toFixed(2)} €
                      </span>
                      {offer.original_price_euros && (
                        <span className="text-xs text-muted-foreground line-through">
                          {offer.original_price_euros.toFixed(2)} €
                        </span>
                      )}
                      {offer.discount_percent && (
                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          -{offer.discount_percent}%
                        </Badge>
                      )}
                      {offer.label && (
                        <Badge variant="secondary" className="text-[10px]">{offer.label}</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Ordre : {offer.display_order} · {(offer.price_euros / offer.credits * 100).toFixed(1)}c/crédit
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Highlight toggle */}
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => highlightMutation.mutate({ id: offer.id, is_highlighted: !offer.is_highlighted })}
                      title={offer.is_highlighted ? 'Retirer la mise en avant' : 'Mettre en avant'}
                    >
                      <Star className={`w-3.5 h-3.5 ${offer.is_highlighted ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                    </Button>

                    {/* Active toggle */}
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => toggleMutation.mutate({ id: offer.id, is_active: !offer.is_active })}
                      title={offer.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {offer.is_active ? (
                        <Eye className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </Button>

                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditOffer(offer)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => {
                        if (confirm('Supprimer cette offre ?')) deleteMutation.mutate(offer.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {offers.length === 0 && (
              <p className="text-center py-8 text-sm text-muted-foreground">Aucune offre créée.</p>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Create/Edit Dialog */}
      <OfferFormDialog
        offer={editOffer}
        open={showCreate || !!editOffer}
        onClose={() => { setShowCreate(false); setEditOffer(null); }}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-credit-offers'] });
          setShowCreate(false);
          setEditOffer(null);
        }}
      />
    </div>
  );
};

// ─── Form Dialog ───
const OfferFormDialog = ({
  offer, open, onClose, onSaved
}: {
  offer: CreditOffer | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [credits, setCredits] = useState(offer?.credits?.toString() || '100');
  const [price, setPrice] = useState(offer?.price_euros?.toString() || '9.99');
  const [originalPrice, setOriginalPrice] = useState(offer?.original_price_euros?.toString() || '');
  const [discount, setDiscount] = useState(offer?.discount_percent?.toString() || '');
  const [label, setLabel] = useState(offer?.label || '');
  const [order, setOrder] = useState(offer?.display_order?.toString() || '0');
  const [highlighted, setHighlighted] = useState(offer?.is_highlighted || false);
  const [saving, setSaving] = useState(false);

  // Reset form when offer changes
  useState(() => {
    if (offer) {
      setCredits(offer.credits.toString());
      setPrice(offer.price_euros.toString());
      setOriginalPrice(offer.original_price_euros?.toString() || '');
      setDiscount(offer.discount_percent?.toString() || '');
      setLabel(offer.label || '');
      setOrder(offer.display_order.toString());
      setHighlighted(offer.is_highlighted);
    } else {
      setCredits('100');
      setPrice('9.99');
      setOriginalPrice('');
      setDiscount('');
      setLabel('');
      setOrder('0');
      setHighlighted(false);
    }
  });

  const handleSave = async () => {
    const numCredits = parseFloat(credits);
    const numPrice = parseFloat(price);
    if (!numCredits || !numPrice || numCredits <= 0 || numPrice <= 0) {
      toast.error('Crédits et prix doivent être positifs');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        credits: numCredits,
        price_euros: numPrice,
        original_price_euros: originalPrice ? parseFloat(originalPrice) : null,
        discount_percent: discount ? parseInt(discount) : null,
        label: label || null,
        display_order: parseInt(order) || 0,
        is_highlighted: highlighted,
        is_active: true,
      };

      if (offer) {
        const { error } = await supabase.from('credit_offers').update(payload).eq('id', offer.id);
        if (error) throw error;
        toast.success('Offre mise à jour — visible instantanément !');
      } else {
        const { error } = await supabase.from('credit_offers').insert(payload);
        if (error) throw error;
        toast.success('Offre créée — visible instantanément dans le pop-up !');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{offer ? 'Modifier l\'offre' : 'Nouvelle offre de crédits'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Crédits *</Label>
              <Input type="number" min={1} value={credits} onChange={e => setCredits(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Prix (€) *</Label>
              <Input type="number" min={0.01} step={0.01} value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Prix barré (€)</Label>
              <Input type="number" min={0} step={0.01} value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} placeholder="Optionnel" />
            </div>
            <div>
              <Label className="text-xs">Réduction (%)</Label>
              <Input type="number" min={0} max={99} value={discount} onChange={e => setDiscount(e.target.value)} placeholder="Ex: 33" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Label</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Populaire" />
            </div>
            <div>
              <Label className="text-xs">Ordre d'affichage</Label>
              <Input type="number" value={order} onChange={e => setOrder(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={highlighted} onCheckedChange={setHighlighted} />
            <Label className="text-xs">Mettre en avant (bordure + style)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {offer ? 'Sauvegarder' : 'Créer l\'offre'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreditOffersPanel;
