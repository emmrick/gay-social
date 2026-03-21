import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Megaphone, Send, CheckCircle2, BarChart3, Users, Shield, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SEOHead from '@/components/seo/SEOHead';

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
        <SEOHead
          title="Demande envoyée — GayConnect Publicité"
          description="Votre demande de publicité a été soumise avec succès."
        />
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Demande reçue !</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Notre équipe examinera votre annonce sous 24 à 48 heures.
                Vous recevrez une confirmation par email à l'adresse indiquée.
              </p>
              <div className="flex gap-2 justify-center pt-2">
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Soumettre une autre
                </Button>
                <Button onClick={() => navigate('/')}>
                  Retour à l'accueil
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
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
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

          {/* Pricing info */}
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
        </div>
      </div>
    </>
  );
};

export default Advertise;
