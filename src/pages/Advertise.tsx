import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Megaphone, Send, CheckCircle2, BarChart3, Users, Shield, Sparkles, Wallet, Eye, MousePointerClick, Pencil, RefreshCw, CreditCard, Loader2, Search, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SEOHead from '@/components/seo/SEOHead';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const advertiseSchema = z.object({
  advertiser_name: z.string().trim().min(2, 'Nom requis').max(100),
  advertiser_email: z.string().trim().email('Email invalide').max(255),
  title: z.string().trim().min(3, 'Titre requis (min. 3 caractères)').max(120),
  description: z.string().trim().max(500, 'Max 500 caractères').optional(),
  image_url: z.string().url('URL invalide').max(500).optional().or(z.literal('')),
  link_url: z.string().url('URL invalide').max(500).optional().or(z.literal('')),
  placement: z.enum(['compact', 'native', 'sponsored_card']),
  budget_cents: z.coerce.number().min(500, 'Budget minimum : 5€').max(1000000),
});

type AdvertiseForm = z.infer<typeof advertiseSchema>;

const placementLabels: Record<string, { label: string; desc: string }> = {
  compact: { label: 'Bandeau compact', desc: 'Petit format discret intégré aux listes' },
  native: { label: 'Natif (flux)', desc: 'Intégré naturellement dans le contenu' },
  sponsored_card: { label: 'Carte sponsorisée', desc: 'Format visuel large avec image' },
};

const benefits = [
  { icon: Users, title: 'Audience ciblée', desc: 'Touchez une communauté LGBTQ+ active et engagée.' },
  { icon: Shield, title: 'Modération stricte', desc: 'Chaque annonce est vérifiée manuellement par notre équipe.' },
  { icon: BarChart3, title: 'Stats en temps réel', desc: 'Suivez impressions, clics et CTR de vos campagnes.' },
  { icon: Sparkles, title: 'Non intrusif', desc: 'Formats respectueux intégrés à l\'expérience utilisateur.' },
];

const Advertise = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dashboardEmail, setDashboardEmail] = useState('');
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState(10);
  const [topupLoading, setTopupLoading] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const queryClient = useQueryClient();

  // Check URL params for PayPal return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const depositId = params.get('ad_deposit');
    const token = params.get('token');
    if (depositId && token) {
      captureAdPayment(depositId, token);
      window.history.replaceState({}, '', '/advertise');
    }
  }, []);

  const captureAdPayment = async (depositId: string, orderId: string) => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/capture-ad-paypal-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ deposit_id: depositId, order_id: orderId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Paiement reçu ! ${(data.amount_cents / 100).toFixed(2)}€ ajoutés à votre portefeuille.`);
        queryClient.invalidateQueries({ queryKey: ['advertiser-wallet'] });
        queryClient.invalidateQueries({ queryKey: ['advertiser-deposits'] });
      } else if (data.already_captured) {
        toast.info('Ce paiement a déjà été traité.');
      } else {
        toast.error(data.error || 'Erreur de paiement');
      }
    } catch {
      toast.error('Erreur lors de la capture du paiement');
    }
  };

  // Dashboard data
  const { data: wallet } = useQuery({
    queryKey: ['advertiser-wallet', activeEmail],
    queryFn: async () => {
      const { data } = await supabase.from('advertiser_wallets' as any)
        .select('*').eq('advertiser_email', activeEmail).maybeSingle();
      return data as any;
    },
    enabled: !!activeEmail,
  });

  const { data: campaigns } = useQuery({
    queryKey: ['advertiser-campaigns', activeEmail],
    queryFn: async () => {
      const { data } = await supabase.from('ads')
        .select('*').eq('advertiser_email', activeEmail).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!activeEmail,
  });

  const { data: deposits } = useQuery({
    queryKey: ['advertiser-deposits', wallet?.id],
    queryFn: async () => {
      const { data } = await supabase.from('advertiser_deposits' as any)
        .select('*').eq('wallet_id', wallet.id).order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!wallet?.id,
  });

  const handleDashboardAccess = () => {
    if (!dashboardEmail.trim() || !dashboardEmail.includes('@')) {
      toast.error('Veuillez entrer un email valide');
      return;
    }
    setActiveEmail(dashboardEmail.trim().toLowerCase());
  };

  const handleTopup = async () => {
    if (!activeEmail || topupAmount < 5) return;
    setTopupLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/create-ad-paypal-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ advertiser_email: activeEmail, amount_euros: topupAmount, return_url: window.location.origin + '/advertise' }),
      });
      const data = await res.json();
      if (data.approve_url) {
        window.location.href = data.approve_url;
      } else {
        toast.error(data.error || 'Erreur PayPal');
      }
    } catch {
      toast.error('Erreur de connexion PayPal');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleUpdateAd = async (adId: string, updates: Record<string, any>) => {
    const { error } = await supabase.from('ads').update(updates).eq('id', adId);
    if (error) { toast.error('Erreur de mise à jour'); return; }
    toast.success('Annonce mise à jour');
    queryClient.invalidateQueries({ queryKey: ['advertiser-campaigns'] });
    setEditingAd(null);
  };

  const form = useForm<AdvertiseForm>({
    resolver: zodResolver(advertiseSchema),
    defaultValues: {
      advertiser_name: '',
      advertiser_email: '',
      title: '',
      description: '',
      image_url: '',
      link_url: '',
      placement: 'native',
      budget_cents: 1000,
    },
  });

  const onSubmit = async (values: AdvertiseForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('ads').insert({
        advertiser_name: values.advertiser_name,
        advertiser_email: values.advertiser_email,
        title: values.title,
        description: values.description || null,
        image_url: values.image_url || null,
        link_url: values.link_url || null,
        placement: values.placement,
        budget_cents: values.budget_cents,
        status: 'pending',
        is_active: false,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success('Demande envoyée avec succès !');
    } catch {
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <>
        <SEOHead title="Demande envoyée — GayConnect Publicité" description="Votre demande de publicité a été soumise avec succès." />
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Demande reçue !</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Notre équipe examinera votre annonce sous 24 à 48h. N'oubliez pas de recharger votre portefeuille pour que votre annonce soit diffusée une fois approuvée.
              </p>
              <div className="flex gap-2 justify-center pt-2">
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Soumettre une autre
                </Button>
                <Button onClick={() => { setActiveEmail(form.getValues('advertiser_email')); setSubmitted(false); }}>
                  Mon espace annonceur
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Annoncez sur GayConnect — Publicité partenaire"
        description="Faites découvrir votre marque à une communauté LGBTQ+ engagée. Formats publicitaires non intrusifs et modérés."
      />
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-5xl mx-auto flex items-center gap-3 px-4 h-14">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm">Espace Annonceurs</span>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
          {/* Dashboard Access */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex-1 space-y-1">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    Accéder à mon espace annonceur
                  </h3>
                  <p className="text-xs text-muted-foreground">Entrez l'email utilisé lors de la soumission pour gérer vos campagnes.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    value={dashboardEmail}
                    onChange={(e) => setDashboardEmail(e.target.value)}
                    className="text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleDashboardAccess()}
                  />
                  <Button size="sm" onClick={handleDashboardAccess} className="shrink-0 gap-1">
                    <Search className="w-3.5 h-3.5" /> Accéder
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advertiser Dashboard */}
          {activeEmail && (
            <AdvertiserDashboard
              email={activeEmail}
              wallet={wallet}
              campaigns={campaigns || []}
              deposits={deposits || []}
              onTopup={() => setShowTopup(true)}
              onEditAd={setEditingAd}
              onUpdateAd={handleUpdateAd}
              onLogout={() => setActiveEmail(null)}
            />
          )}

          {/* Hero */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Faites rayonner votre marque
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
              Touchez une communauté LGBTQ+ active avec des formats publicitaires 
              respectueux et non intrusifs. Chaque annonce est vérifiée manuellement.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {benefits.map((b) => (
              <Card key={b.title} className="border-border/50">
                <CardContent className="p-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                    <b.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xs font-bold text-foreground">{b.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-snug">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Form */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Soumettre une annonce</CardTitle>
              <CardDescription>
                Remplissez le formulaire ci-dessous. Notre équipe examinera votre demande sous 24-48h.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="advertiser_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom / Entreprise *</FormLabel>
                          <FormControl><Input placeholder="Votre nom ou entreprise" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="advertiser_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email de contact *</FormLabel>
                          <FormControl><Input type="email" placeholder="contact@exemple.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titre de l'annonce *</FormLabel>
                        <FormControl><Input placeholder="Ex: Découvrez notre nouvelle collection" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Décrivez brièvement votre offre..." rows={3} {...field} />
                        </FormControl>
                        <FormDescription>500 caractères max.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="image_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL de l'image</FormLabel>
                          <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                          <FormDescription>Format recommandé : 600×300px</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="link_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL de destination</FormLabel>
                          <FormControl><Input placeholder="https://votre-site.com" {...field} /></FormControl>
                          <FormDescription>Page vers laquelle rediriger les clics</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="placement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Format souhaité *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(placementLabels).map(([k, v]) => (
                                <SelectItem key={k} value={k}>
                                  <div>
                                    <span className="font-medium">{v.label}</span>
                                    <span className="text-muted-foreground ml-1 text-xs">— {v.desc}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budget_cents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget (en centimes €) *</FormLabel>
                          <FormControl>
                            <Input type="number" min={500} step={100} {...field} />
                          </FormControl>
                          <FormDescription>
                            {field.value ? `${(Number(field.value) / 100).toFixed(2)} €` : '—'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={loading} className="w-full sm:w-auto gap-2">
                      <Send className="w-4 h-4" />
                      {loading ? 'Envoi en cours...' : 'Soumettre ma demande'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Pricing info — only show when not in dashboard mode */}
          {!activeEmail && (
          <Card className="border-border/50 bg-muted/30">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-bold text-foreground text-sm">💰 Tarification</h3>
              <div className="grid sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">CPC (Coût par clic)</p>
                  <p>À partir de 0,02 € par clic. Vous ne payez que lorsqu'un utilisateur clique.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">CPM (Coût pour 1000 impressions)</p>
                  <p>À partir de 0,10 € pour 1000 affichages de votre annonce.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Budget flexible</p>
                  <p>Définissez votre budget maximal. La diffusion s'arrête automatiquement une fois atteint.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </div>

      {/* Top-up dialog */}
      <Dialog open={showTopup} onOpenChange={setShowTopup}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Recharger mon portefeuille
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 20, 50, 100, 200].map(v => (
                <Button
                  key={v}
                  variant={topupAmount === v ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTopupAmount(v)}
                  className="text-xs"
                >
                  {v} €
                </Button>
              ))}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ou montant personnalisé :</label>
              <Input type="number" min={5} value={topupAmount} onChange={e => setTopupAmount(Number(e.target.value))} className="mt-1" />
            </div>
            <p className="text-xs text-muted-foreground">Le paiement sera effectué via PayPal. Montant minimum : 5€.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTopup(false)}>Annuler</Button>
            <Button onClick={handleTopup} disabled={topupLoading || topupAmount < 5} className="gap-2">
              {topupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Payer {topupAmount}€ via PayPal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit ad dialog */}
      {editingAd && (
        <EditAdDialog ad={editingAd} onClose={() => setEditingAd(null)} onSave={handleUpdateAd} />
      )}
    </>
  );
};

// ─── Advertiser Dashboard Component ───
interface DashboardProps {
  email: string;
  wallet: any;
  campaigns: any[];
  deposits: any[];
  onTopup: () => void;
  onEditAd: (ad: any) => void;
  onUpdateAd: (id: string, updates: any) => void;
  onLogout: () => void;
}

const AdvertiserDashboard = ({ email, wallet, campaigns, deposits, onTopup, onEditAd, onUpdateAd, onLogout }: DashboardProps) => {
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions_count || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks_count || 0), 0);
  const totalSpent = campaigns.reduce((s, c) => s + (c.spent_cents || 0), 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    approved: { label: 'Active', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    rejected: { label: 'Refusée', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    paused: { label: 'En pause', color: 'bg-muted text-muted-foreground border-border' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Mon espace annonceur</h2>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-xs">Déconnexion</Button>
      </div>

      {/* Wallet + Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-primary/20">
          <CardContent className="p-4 text-center space-y-1">
            <Wallet className="w-5 h-5 text-primary mx-auto" />
            <p className="text-xl font-bold text-foreground">{((wallet?.balance_cents || 0) / 100).toFixed(2)}€</p>
            <p className="text-[10px] text-muted-foreground">Solde disponible</p>
            <Button size="sm" className="w-full mt-2 text-xs gap-1" onClick={onTopup}>
              <CreditCard className="w-3 h-3" /> Recharger
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center space-y-1">
            <Eye className="w-5 h-5 text-muted-foreground mx-auto" />
            <p className="text-xl font-bold text-foreground">{totalImpressions.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Impressions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center space-y-1">
            <MousePointerClick className="w-5 h-5 text-muted-foreground mx-auto" />
            <p className="text-xl font-bold text-foreground">{totalClicks.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Clics</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center space-y-1">
            <BarChart3 className="w-5 h-5 text-muted-foreground mx-auto" />
            <p className="text-xl font-bold text-foreground">{ctr}%</p>
            <p className="text-[10px] text-muted-foreground">Taux de clic (CTR)</p>
          </CardContent>
        </Card>
      </div>

      {/* Low balance warning */}
      {wallet && wallet.balance_cents < 500 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <Wallet className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-600">Solde bas — vos annonces risquent d'être suspendues</p>
              <p className="text-[10px] text-muted-foreground">Rechargez votre portefeuille pour continuer la diffusion.</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 text-xs border-amber-500/30" onClick={onTopup}>Recharger</Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="campaigns" className="text-xs">Campagnes ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Paiements</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-3 mt-4">
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune campagne. Soumettez votre première annonce ci-dessous.</p>
          ) : (
            campaigns.map(campaign => {
              const budgetPct = campaign.budget_cents > 0 ? Math.min(100, ((campaign.spent_cents || 0) / campaign.budget_cents) * 100) : 0;
              const sc = statusConfig[campaign.status] || statusConfig.pending;
              return (
                <Card key={campaign.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground truncate">{campaign.title}</p>
                        {campaign.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{campaign.description}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                        {campaign.status !== 'rejected' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditAd(campaign)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {campaign.rejection_reason && (
                      <p className="text-xs text-red-500 bg-red-500/5 rounded-lg p-2">Motif : {campaign.rejection_reason}</p>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-xs font-bold">{(campaign.impressions_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Impressions</p></div>
                      <div><p className="text-xs font-bold">{(campaign.clicks_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Clics</p></div>
                      <div><p className="text-xs font-bold">{((campaign.spent_cents || 0) / 100).toFixed(2)}€</p><p className="text-[10px] text-muted-foreground">Dépensé</p></div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Budget consommé</span>
                        <span>{budgetPct.toFixed(0)}% ({((campaign.spent_cents || 0) / 100).toFixed(2)}€ / {((campaign.budget_cents || 0) / 100).toFixed(2)}€)</span>
                      </div>
                      <Progress value={budgetPct} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Historique des paiements</p>
            <Button size="sm" onClick={onTopup} className="text-xs gap-1"><CreditCard className="w-3 h-3" /> Recharger</Button>
          </div>
          {(!deposits || deposits.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun paiement.</p>
          ) : (
            deposits.map((d: any) => (
              <Card key={d.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">{(d.amount_cents / 100).toFixed(2)}€</p>
                    <p className="text-[10px] text-muted-foreground">{d.payment_method} — {format(new Date(d.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</p>
                  </div>
                  <Badge variant="outline" className={d.status === 'completed' ? 'bg-green-500/10 text-green-600 border-green-500/20 text-[10px]' : 'text-[10px]'}>
                    {d.status === 'completed' ? 'Payé' : d.status === 'pending' ? 'En cours' : 'Échoué'}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h4 className="font-bold text-sm">Résumé global</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground text-xs">Total impressions</p><p className="font-bold">{totalImpressions.toLocaleString()}</p></div>
                <div><p className="text-muted-foreground text-xs">Total clics</p><p className="font-bold">{totalClicks.toLocaleString()}</p></div>
                <div><p className="text-muted-foreground text-xs">CTR moyen</p><p className="font-bold">{ctr}%</p></div>
                <div><p className="text-muted-foreground text-xs">Total dépensé</p><p className="font-bold">{(totalSpent / 100).toFixed(2)}€</p></div>
                <div><p className="text-muted-foreground text-xs">Campagnes actives</p><p className="font-bold">{campaigns.filter(c => c.status === 'approved' && c.is_active).length}</p></div>
                <div><p className="text-muted-foreground text-xs">Solde restant</p><p className="font-bold">{((wallet?.balance_cents || 0) / 100).toFixed(2)}€</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Edit Ad Dialog ───
const EditAdDialog = ({ ad, onClose, onSave }: { ad: any; onClose: () => void; onSave: (id: string, u: any) => void }) => {
  const [title, setTitle] = useState(ad.title);
  const [description, setDescription] = useState(ad.description || '');
  const [imageUrl, setImageUrl] = useState(ad.image_url || '');
  const [linkUrl, setLinkUrl] = useState(ad.link_url || '');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Modifier l'annonce</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-xs font-medium">Titre</label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><label className="text-xs font-medium">Description</label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
          <div><label className="text-xs font-medium">URL image</label><Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} /></div>
          <div><label className="text-xs font-medium">URL destination</label><Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave(ad.id, { title, description: description || null, image_url: imageUrl || null, link_url: linkUrl || null })}>
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Advertise;
