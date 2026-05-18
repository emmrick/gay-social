import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarRange, Eye, MapPin, Send, Target } from 'lucide-react';
import AdImagesUpload from './AdImagesUpload';
import { AdPreviewGrid } from '@/components/ads/AdPreview';
import { placementLabels } from './constants';

export const advertiseSchema = z.object({
  advertiser_name: z.string().trim().min(2, 'Nom requis').max(100),
  advertiser_email: z.string().trim().email('Email invalide').max(255),
  title: z.string().trim().min(3, 'Titre requis (min. 3 caractères)').max(120),
  description: z.string().trim().max(500, 'Max 500 caractères').optional(),
  link_url: z.string().url('URL invalide').max(500).optional().or(z.literal('')),
  placements: z.array(z.enum(['compact', 'native', 'sponsored_card'])).min(1, 'Sélectionnez au moins un format'),
  budget_cents: z.coerce.number().min(500, 'Budget minimum : 5€').max(1000000),
  geo_targeting: z.enum(['local', 'regional', 'national']),
  geo_postal_codes: z.string().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  max_impressions: z.coerce.number().int().min(0).optional(),
  max_clicks: z.coerce.number().int().min(0).optional(),
});

export type AdvertiseForm = z.infer<typeof advertiseSchema>;

interface AdSubmitFormProps {
  loading: boolean;
  adImageUrls: string[];
  setAdImageUrls: (urls: string[]) => void;
  onSubmit: (values: AdvertiseForm) => Promise<void> | void;
}

const AdSubmitForm = ({ loading, adImageUrls, setAdImageUrls, onSubmit }: AdSubmitFormProps) => {
  const form = useForm<AdvertiseForm>({
    resolver: zodResolver(advertiseSchema),
    defaultValues: {
      advertiser_name: '',
      advertiser_email: '',
      title: '',
      description: '',
      link_url: '',
      placements: ['native'],
      budget_cents: 1000,
      geo_targeting: 'national',
      geo_postal_codes: '',
      starts_at: '',
      ends_at: '',
      max_impressions: 0,
      max_clicks: 0,
    },
  });

  return (
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
              <AdImagesUpload value={adImageUrls} onChange={setAdImageUrls} />
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

            <FormField
              control={form.control}
              name="placements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format(s) souhaité(s) *</FormLabel>
                  <FormDescription>Sélectionnez un ou plusieurs formats de diffusion</FormDescription>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {Object.entries(placementLabels).map(([k, v]) => {
                      const selected = field.value?.includes(k as any);
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            const current = field.value || [];
                            if (selected) {
                              field.onChange(current.filter((p: string) => p !== k));
                            } else {
                              field.onChange([...current, k]);
                            }
                          }}
                          className={`p-3 rounded-lg border text-left transition-colors ${selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                        >
                          <p className="text-xs font-semibold">{v.label}</p>
                          <p className="text-[10px] text-muted-foreground">{v.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="geo_targeting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Zone de diffusion *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="local">🏘️ Local (codes postaux)</SelectItem>
                        <SelectItem value="regional">🗺️ Régional</SelectItem>
                        <SelectItem value="national">🇫🇷 National (toute la France)</SelectItem>
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
                      {field.value ? `${(Number(field.value) / 100).toFixed(2)} € (min. 5€)` : '—'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch('geo_targeting') === 'local' && (
              <FormField
                control={form.control}
                name="geo_postal_codes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codes postaux autorisés</FormLabel>
                    <FormControl>
                      <Input placeholder="75001, 75002, 69001..." {...field} />
                    </FormControl>
                    <FormDescription>Séparez les codes postaux par des virgules</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Planification */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">Planification &amp; plafonds (optionnel)</h4>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Définissez une période de diffusion et/ou des plafonds pour stopper automatiquement la campagne.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="starts_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Date de début</FormLabel>
                      <FormControl><Input type="datetime-local" {...field} /></FormControl>
                      <FormDescription className="text-[10px]">Vide = dès l'approbation</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ends_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Date de fin</FormLabel>
                      <FormControl><Input type="datetime-local" {...field} /></FormControl>
                      <FormDescription className="text-[10px]">Vide = jusqu'à épuisement du budget</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_impressions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs flex items-center gap-1.5"><Eye className="w-3 h-3" /> Max impressions</FormLabel>
                      <FormControl><Input type="number" min={0} step={100} placeholder="0 = illimité" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max_clicks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs flex items-center gap-1.5"><Target className="w-3 h-3" /> Max clics</FormLabel>
                      <FormControl><Input type="number" min={0} step={10} placeholder="0 = illimité" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Aperçu live */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">Aperçu en direct</h4>
                <Badge variant="outline" className="text-[10px] ml-auto">Tel que les utilisateurs verront</Badge>
              </div>
              <AdPreviewGrid
                selectedPlacements={form.watch('placements') || []}
                title={form.watch('title')}
                description={form.watch('description')}
                imageUrl={adImageUrls[0] || ''}
                hasLink={!!form.watch('link_url')}
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
  );
};

export default AdSubmitForm;
