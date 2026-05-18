import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, BarChart3, Loader2, LogIn, Mail, Megaphone, Shield, Sparkles, Users } from 'lucide-react';
import AdSubmitForm, { AdvertiseForm } from './AdSubmitForm';

const benefits = [
  { icon: Users, title: 'Audience ciblée', desc: 'Touchez une communauté LGBTQ+ active et engagée.' },
  { icon: Shield, title: 'Modération stricte', desc: 'Chaque annonce est vérifiée manuellement par notre équipe.' },
  { icon: BarChart3, title: 'Stats en temps réel', desc: 'Suivez impressions, clics et CTR de vos campagnes.' },
  { icon: Sparkles, title: 'Non intrusif', desc: 'Formats respectueux intégrés à l\'expérience utilisateur.' },
];

interface AdvertiseLandingProps {
  onBack: () => void;
  dashboardEmail: string;
  setDashboardEmail: (v: string) => void;
  magicLoading: boolean;
  onDashboardAccess: () => void;
  loading: boolean;
  adImageUrls: string[];
  setAdImageUrls: (urls: string[]) => void;
  onSubmit: (values: AdvertiseForm) => Promise<void> | void;
}

const AdvertiseLanding = ({
  onBack,
  dashboardEmail,
  setDashboardEmail,
  magicLoading,
  onDashboardAccess,
  loading,
  adImageUrls,
  setAdImageUrls,
  onSubmit,
}: AdvertiseLandingProps) => (
  <div className="min-h-screen bg-background pb-20">
    <div className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-5xl mx-auto flex items-center gap-3 px-4 h-14">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm">Espace Annonceurs</span>
        </div>
      </div>
    </div>

    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Magic-link access */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 space-y-1">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <LogIn className="w-4 h-4 text-primary" />
                Accéder à mon espace annonceur
              </h3>
              <p className="text-xs text-muted-foreground">
                Recevez un lien de connexion sécurisé par email (valable 15 min).
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                type="email"
                placeholder="votre@email.com"
                value={dashboardEmail}
                onChange={(e) => setDashboardEmail(e.target.value)}
                className="text-sm"
                onKeyDown={(e) => e.key === 'Enter' && !magicLoading && onDashboardAccess()}
                disabled={magicLoading}
              />
              <Button size="sm" onClick={onDashboardAccess} disabled={magicLoading} className="shrink-0 gap-1">
                {magicLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                {magicLoading ? 'Envoi…' : 'Recevoir le lien'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Pricing */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-6 space-y-3">
          <h3 className="font-bold text-foreground text-sm">💰 Tarification</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">CPC (Coût par clic)</p>
              <p>0,01 € par clic. Vous ne payez que lorsqu'un utilisateur clique.</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">CPM (Coût pour 100 impressions)</p>
              <p>0,01 € pour 100 affichages de votre annonce.</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Budget minimum</p>
              <p>5€ minimum pour démarrer votre campagne. Rechargez votre portefeuille pour continuer.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit form */}
      <AdSubmitForm
        loading={loading}
        adImageUrls={adImageUrls}
        setAdImageUrls={setAdImageUrls}
        onSubmit={onSubmit}
      />
    </div>
  </div>
);

export default AdvertiseLanding;
