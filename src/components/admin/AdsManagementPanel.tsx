import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Megaphone, Plus, Check, X, Pause, Play, Trash2, Eye, MousePointerClick,
  ExternalLink, Clock, AlertTriangle, Image as ImageIcon, Search, Filter,
  Ticket, Loader2, Infinity as InfinityIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  advertiser_name: string;
  advertiser_email: string | null;
  placement: string;
  status: string;
  rejection_reason: string | null;
  target_pages: string[];
  budget_cents: number;
  spent_cents: number;
  cost_per_click_cents: number;
  cost_per_mille_cents: number;
  impressions_count: number;
  clicks_count: number;
  max_impressions: number | null;
  max_clicks: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  always_active?: boolean;
  created_at: string;
  updated_at: string;
  geo_targeting: string;
  geo_postal_codes: string[];
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock },
  approved: { label: 'Approuvée', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: Check },
  rejected: { label: 'Refusée', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: X },
  paused: { label: 'En pause', color: 'bg-muted text-muted-foreground border-border', icon: Pause },
  expired: { label: 'Expirée', color: 'bg-muted text-muted-foreground border-border', icon: Clock },
};

const placementLabels: Record<string, string> = {
  compact: '📦 Bannière compacte',
  native: '📱 Bannière native',
  sponsored_card: '🧾 Carte sponsorisée',
};

const emptyForm = {
  title: '',
  description: '',
  image_url: '',
  link_url: '',
  advertiser_name: '',
  advertiser_email: '',
  placement: 'native',
  target_pages: [] as string[],
  cost_per_click_cents: 1,
  cost_per_mille_cents: 10,
  max_impressions: '',
  max_clicks: '',
  starts_at: '',
  ends_at: '',
};

const AdsManagementPanel = ({ initialAdId }: { initialAdId?: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [initialAdLoaded, setInitialAdLoaded] = useState(false);

  const { data: ads, isLoading } = useQuery({
    queryKey: ['admin-ads', statusFilter],
    queryFn: async () => {
      let query = supabase.from('ads').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Ad[];
    },
  });

  // Auto-open specific ad from task navigation
  useEffect(() => {
    if (initialAdId && ads && !initialAdLoaded) {
      const ad = ads.find(a => a.id === initialAdId);
      if (ad) {
        setSelectedAd(ad);
        setInitialAdLoaded(true);
      }
    }
  }, [initialAdId, ads, initialAdLoaded]);

  const createAd = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ads').insert({
        title: form.title,
        description: form.description || null,
        image_url: form.image_url || null,
        link_url: form.link_url || null,
        advertiser_name: form.advertiser_name,
        advertiser_email: form.advertiser_email || null,
        placement: form.placement,
        target_pages: form.target_pages,
        cost_per_click_cents: form.cost_per_click_cents,
        cost_per_mille_cents: form.cost_per_mille_cents,
        max_impressions: form.max_impressions ? parseInt(form.max_impressions) : null,
        max_clicks: form.max_clicks ? parseInt(form.max_clicks) : null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        created_by: user?.id,
        status: 'approved', // Admin-created ads are auto-approved
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      setShowCreate(false);
      setForm(emptyForm);
      toast.success('Annonce créée avec succès');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateAdStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const update: any = { status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() };
      if (reason) update.rejection_reason = reason;
      const { error } = await supabase.from('ads').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      setSelectedAd(null);
      setShowRejectDialog(false);
      setRejectionReason('');
      toast.success('Statut mis à jour');
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('ads').update({ is_active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success('Annonce mise à jour');
    },
  });

  const toggleAlwaysActive = useMutation({
    mutationFn: async ({ id, always_active }: { id: string; always_active: boolean }) => {
      const patch: any = { always_active };
      // Si on active la diffusion continue, on réactive aussi l'annonce.
      if (always_active) patch.is_active = true;
      const { error } = await supabase.from('ads').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      setSelectedAd((prev) =>
        prev && prev.id === vars.id
          ? { ...prev, always_active: vars.always_active, is_active: vars.always_active ? true : prev.is_active }
          : prev,
      );
      toast.success(vars.always_active ? 'Diffusion continue activée' : 'Diffusion continue désactivée');
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  });

  const deleteAd = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      setSelectedAd(null);
      toast.success('Annonce supprimée');
    },
  });

  const filtered = ads?.filter(ad =>
    !search || ad.title.toLowerCase().includes(search.toLowerCase()) ||
    ad.advertiser_name.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = ads?.filter(a => a.status === 'pending').length || 0;

  // Stats
  const totalImpressions = ads?.reduce((s, a) => s + a.impressions_count, 0) || 0;
  const totalClicks = ads?.reduce((s, a) => s + a.clicks_count, 0) || 0;
  const totalRevenue = ads?.reduce((s, a) => s + a.spent_cents, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Gestion des annonces</h2>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-xs">{pendingCount} en attente</Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{ads?.length || 0}</p>
            <p className="text-[11px] text-muted-foreground">Annonces totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Impressions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Clics</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{(totalRevenue / 100).toFixed(2)}€</p>
            <p className="text-[11px] text-muted-foreground">Revenus</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une annonce..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="approved">Approuvées</SelectItem>
            <SelectItem value="rejected">Refusées</SelectItem>
            <SelectItem value="paused">En pause</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Créer
        </Button>
      </div>

      {/* Ads List */}
      <ScrollArea className="h-[calc(100dvh-400px)]">
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Chargement...</p>
          ) : filtered?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune annonce trouvée</p>
            </div>
          ) : (
            filtered?.map(ad => {
              const cfg = statusConfig[ad.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              const ctr = ad.impressions_count > 0 ? ((ad.clicks_count / ad.impressions_count) * 100).toFixed(1) : '0.0';
              return (
                <Card
                  key={ad.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedAd(ad)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {ad.image_url ? (
                        <img src={ad.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{ad.title}</p>
                          <Badge variant="outline" className={`text-[10px] ${cfg.color} border`}>
                            <StatusIcon className="w-3 h-3 mr-0.5" />
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {ad.advertiser_name} · {placementLabels[ad.placement] || ad.placement}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {ad.impressions_count.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointerClick className="w-3 h-3" /> {ad.clicks_count}
                          </span>
                          <span>CTR {ctr}%</span>
                          <span className="font-medium">{(ad.spent_cents / 100).toFixed(2)}€</span>
                        </div>
                      </div>
                      {ad.always_active && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary">
                          <InfinityIcon className="w-3 h-3" /> Continue
                        </Badge>
                      )}
                      {!ad.is_active && ad.status === 'approved' && !ad.always_active && (
                        <Badge variant="outline" className="text-[10px]">Inactive</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" /> Créer une annonce
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre de l'annonce" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description courte" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Annonceur *</Label>
                <Input value={form.advertiser_name} onChange={e => setForm(f => ({ ...f, advertiser_name: e.target.value }))} placeholder="Nom" />
              </div>
              <div className="space-y-2">
                <Label>Email annonceur</Label>
                <Input type="email" value={form.advertiser_email} onChange={e => setForm(f => ({ ...f, advertiser_email: e.target.value }))} placeholder="email@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL de l'image</Label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Lien externe</Label>
              <Input value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={form.placement} onValueChange={v => setForm(f => ({ ...f, placement: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">📦 Bannière compacte</SelectItem>
                  <SelectItem value="native">📱 Bannière native</SelectItem>
                  <SelectItem value="sponsored_card">🧾 Carte sponsorisée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Coût/clic (centimes)</Label>
                <Input type="number" value={form.cost_per_click_cents} onChange={e => setForm(f => ({ ...f, cost_per_click_cents: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Coût/1000 impressions (centimes)</Label>
                <Input type="number" value={form.cost_per_mille_cents} onChange={e => setForm(f => ({ ...f, cost_per_mille_cents: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Début</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button
              onClick={() => createAd.mutate()}
              disabled={!form.title || !form.advertiser_name || createAd.isPending}
            >
              {createAd.isPending ? 'Création...' : 'Créer & Approuver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAd} onOpenChange={(open) => !open && setSelectedAd(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-auto">
          {selectedAd && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{selectedAd.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedAd.image_url && (
                  <img src={selectedAd.image_url} alt="" className="w-full h-40 object-cover rounded-xl" />
                )}
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Annonceur</p>
                    <p className="font-medium">{selectedAd.advertiser_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Format</p>
                    <p className="font-medium">{placementLabels[selectedAd.placement]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Statut</p>
                    <Badge variant="outline" className={statusConfig[selectedAd.status]?.color}>
                      {statusConfig[selectedAd.status]?.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Créée le</p>
                    <p className="font-medium text-xs">{format(new Date(selectedAd.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                  </div>
                </div>

                {selectedAd.description && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Description</p>
                    <p className="text-sm">{selectedAd.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-muted-foreground text-xs mb-1">Zone de diffusion</p>
                  <p className="text-sm font-medium">
                    {selectedAd.geo_targeting === 'local' ? '🏘️ Local' : selectedAd.geo_targeting === 'regional' ? '🗺️ Régional' : '🇫🇷 National'}
                    {selectedAd.geo_postal_codes?.length > 0 && (
                      <span className="text-muted-foreground font-normal ml-1">— {selectedAd.geo_postal_codes.join(', ')}</span>
                    )}
                  </p>
                </div>

                {selectedAd.link_url && (
                  <a href={selectedAd.link_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" /> {selectedAd.link_url}
                  </a>
                )}

                {selectedAd.rejection_reason && (
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Raison du refus
                    </p>
                    <p className="text-sm mt-1">{selectedAd.rejection_reason}</p>
                  </div>
                )}

                <Separator />

                {/* Performance */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{selectedAd.impressions_count.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Impressions</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{selectedAd.clicks_count}</p>
                    <p className="text-[10px] text-muted-foreground">Clics</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold">{(selectedAd.spent_cents / 100).toFixed(2)}€</p>
                    <p className="text-[10px] text-muted-foreground">Dépensé</p>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {selectedAd.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => updateAdStatus.mutate({ id: selectedAd.id, status: 'approved' })}
                      >
                        <Check className="w-3.5 h-3.5" /> Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => setShowRejectDialog(true)}
                      >
                        <X className="w-3.5 h-3.5" /> Refuser
                      </Button>
                    </>
                  )}
                  {selectedAd.status === 'approved' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => toggleActive.mutate({ id: selectedAd.id, is_active: !selectedAd.is_active })}
                        disabled={!!selectedAd.always_active}
                        title={selectedAd.always_active ? 'Diffusion continue activée — la pause est désactivée' : undefined}
                      >
                        {selectedAd.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {selectedAd.is_active ? 'Mettre en pause' : 'Réactiver'}
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedAd.always_active ? 'default' : 'outline'}
                        className="gap-1.5"
                        onClick={() =>
                          toggleAlwaysActive.mutate({
                            id: selectedAd.id,
                            always_active: !selectedAd.always_active,
                          })
                        }
                        disabled={toggleAlwaysActive.isPending}
                      >
                        <InfinityIcon className="w-3.5 h-3.5" />
                        {selectedAd.always_active ? 'Diffusion continue ✓' : 'Diffusion continue'}
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => { if (confirm('Supprimer cette annonce ?')) deleteAd.mutate(selectedAd.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Refuser l'annonce</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Raison du refus</Label>
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Contenu non conforme, lien suspect..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRejectDialog(false)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={!rejectionReason}
              onClick={() => selectedAd && updateAdStatus.mutate({ id: selectedAd.id, status: 'rejected', reason: rejectionReason })}
            >
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advertiser Promo Codes Section */}
      <Separator className="my-6" />
      <AdvertiserPromoCodes />
    </div>
  );
};

// ─── Advertiser Promo Codes Admin ───
const AdvertiserPromoCodes = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState('');
  const [bonusCents, setBonusCents] = useState('');
  const [bonusPercent, setBonusPercent] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();

  const { data: promoCodes, isLoading } = useQuery({
    queryKey: ['admin-advertiser-promo-codes'],
    queryFn: async () => {
      const { data } = await supabase.from('advertiser_promo_codes' as any).select('*').order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  const handleCreate = async () => {
    if (!code.trim()) { toast.error('Code requis'); return; }
    setCreating(true);
    try {
      await supabase.from('advertiser_promo_codes' as any).insert({
        code: code.trim().toUpperCase(),
        bonus_cents: parseInt(bonusCents) || 0,
        bonus_percent: parseInt(bonusPercent) || 0,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt || null,
        created_by: user?.id,
      } as any);
      toast.success('Code promo annonceur créé');
      queryClient.invalidateQueries({ queryKey: ['admin-advertiser-promo-codes'] });
      setShowCreate(false);
      setCode(''); setBonusCents(''); setBonusPercent(''); setMaxUses(''); setExpiresAt('');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally { setCreating(false); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('advertiser_promo_codes' as any).update({ is_active: active } as any).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-advertiser-promo-codes'] });
    toast.success(active ? 'Code activé' : 'Code désactivé');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">Codes promo annonceurs</h3>
          <Badge variant="secondary" className="text-xs">{promoCodes?.filter((c: any) => c.is_active).length || 0} actifs</Badge>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Nouveau
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : !promoCodes?.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucun code promo annonceur</p>
      ) : (
        <div className="space-y-2">
          {promoCodes.map((pc: any) => (
            <Card key={pc.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-bold text-sm">{pc.code}</code>
                    <Badge variant={pc.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {pc.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {pc.bonus_cents > 0 && `+${(pc.bonus_cents / 100).toFixed(2)}€`}
                    {pc.bonus_cents > 0 && pc.bonus_percent > 0 && ' + '}
                    {pc.bonus_percent > 0 && `+${pc.bonus_percent}%`}
                    {' · '}{pc.times_used} utilisé{pc.times_used > 1 ? 's' : ''}
                    {pc.max_uses && ` / ${pc.max_uses} max`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={pc.is_active ? 'destructive' : 'default'}
                  className="text-xs"
                  onClick={() => toggleActive(pc.id, !pc.is_active)}
                >
                  {pc.is_active ? 'Désactiver' : 'Activer'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nouveau code promo annonceur</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Code</Label>
              <Input placeholder="BONUS2024" value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="uppercase" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Bonus fixe (centimes)</Label>
                <Input type="number" placeholder="500 = 5€" value={bonusCents} onChange={e => setBonusCents(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Bonus % sur recharge</Label>
                <Input type="number" placeholder="20" value={bonusPercent} onChange={e => setBonusPercent(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Limite d'utilisations</Label>
              <Input type="number" placeholder="Illimité" value={maxUses} onChange={e => setMaxUses(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Date d'expiration</Label>
              <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdsManagementPanel;
