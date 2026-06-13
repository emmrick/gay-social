import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Beaker, Smartphone, HeartHandshake, Gift, Percent,
  CheckCircle2, AlertTriangle, Coins, ShieldCheck, Loader2, Mail,
  CalendarDays, Globe, MonitorSmartphone,
} from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import SEOHead from '@/components/seo/SEOHead';

const schema = z.object({
  email: z.string().trim().email({ message: 'Adresse e-mail invalide' }).max(255),
  amount: z.number().min(15, { message: 'Don minimum de 15 €' }).max(50, { message: 'Don maximum de 50 €' }),
});

const perks = [
  { icon: <Coins className="w-5 h-5" />, title: '1000 crédits offerts', desc: 'Au lancement officiel de la phase de test ouverte.' },
  { icon: <Percent className="w-5 h-5" />, title: '-50 % pendant 5 ans', desc: 'Sur tous vos achats de crédits, réservé aux soutiens des débuts.' },
];

const BetaProgram = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    const parsed = schema.safeParse({ email, amount });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Données invalides');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-beta-interest', {
        body: { email: parsed.data.email, donation_amount: parsed.data.amount, user_id: user?.id ?? null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDone(true);
      toast.success('Merci ! Votre intérêt a bien été transmis à notre équipe.');
    } catch (e) {
      console.error(e);
      toast.error("Une erreur s'est produite. Merci de réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Rejoindre la bêta fermée de Gay Social"
        description="Participez à la bêta fermée de Gay Social sur Android, soutenez le développement et débloquez 1000 crédits offerts et -50 % pendant 5 ans."
      />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold gradient-text">Programme bêta</h1>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-12">
        <div className="absolute top-0 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-[128px]" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center mb-5">
              <Beaker className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Invitation à rejoindre la bêta fermée de Gay Social
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Souhaitez-vous rejoindre la version bêta de Gay Social, notre application officielle
              actuellement disponible sur le Google Play Store&nbsp;?
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 pb-16 max-w-2xl space-y-6">
        {/* Important Android */}
        <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="font-bold text-yellow-700 dark:text-yellow-300">Important</span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">
            L'application est pour le moment disponible <strong>uniquement sur Android</strong> via le Play Store.
            Une version iOS n'est pas encore prévue actuellement, car notre développement se concentre
            principalement sur l'écosystème Google.
          </p>
        </div>

        {/* En quoi ça consiste */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">En quoi ça consiste&nbsp;?</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cette version est actuellement en phase de test fermée sur invitation. Votre participation
            nous aide à améliorer l'application, corriger les bugs et tester avec vous les futures
            fonctionnalités que nous souhaitons mettre en place.
          </p>
        </div>

        {/* Soutenir le projet + récompenses */}
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-amber-500/10 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">Soutenir le projet</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pour participer au programme de test, nous demandons un don compris entre
            <strong className="text-foreground"> 15 € et 50 €</strong> afin de soutenir le développement
            et l'évolution de Gay Social.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {perks.map((p) => (
              <div key={p.title} className="flex items-start gap-3 rounded-xl bg-background/60 border border-border/60 p-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
                  {p.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pourquoi des crédits */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">Pourquoi un système de crédits&nbsp;?</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nous savons que certaines personnes hésitent à payer pour utiliser une application de rencontre.
            Cependant, proposer une application entièrement gratuite avec toutes les fonctionnalités premium
            devient aujourd'hui très difficile sans afficher énormément de publicités. Notre objectif est
            d'éviter une expérience envahissante&nbsp;:
          </p>
          <ul className="space-y-1.5">
            {[
              'Pas de pop-up agressifs',
              'Pas de vidéos publicitaires forcées',
              'Seulement quelques annonces discrètes si nécessaire',
              'Des publicités optionnelles permettant de gagner des crédits',
            ].map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-foreground/80">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                {t}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Le développement et l'hébergement d'une application représentent un coût important&nbsp;: stockage
            des photos, vidéos, messages, serveurs, sécurité, maintenance et nouvelles fonctionnalités. À cela
            s'ajoutent également les différentes commissions appliquées par certaines plateformes et services
            de paiement. Chaque soutien contribue directement à faire évoluer Gay Social dans de meilleures
            conditions pour toute la communauté.
          </p>
          <p className="text-sm font-medium text-foreground">Merci à toutes les personnes qui soutiennent le projet ❤️</p>
        </div>

        {/* Formulaire de participation */}
        <div id="participer" className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">Comment participer&nbsp;?</h3>
          </div>

          {done ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <p className="font-semibold text-foreground">Demande envoyée&nbsp;!</p>
              <p className="text-sm text-muted-foreground">
                Notre équipe vous contactera par e-mail avec les instructions pour finaliser votre don
                et rejoindre la bêta. Merci pour votre soutien&nbsp;❤️
              </p>
              <Button variant="outline" onClick={() => navigate('/')}>Retour à l'accueil</Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Indiquez votre adresse e-mail et le montant du don que vous souhaitez effectuer. Notre équipe
                vous contactera ensuite avec les modalités pour finaliser votre participation.
              </p>

              <div className="space-y-2">
                <Label htmlFor="beta-email">Votre adresse e-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="beta-email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Montant du don</Label>
                  <span className="text-lg font-bold text-primary">{amount} €</span>
                </div>
                <Slider
                  value={[amount]}
                  min={15}
                  max={50}
                  step={1}
                  onValueChange={(v) => setAmount(v[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>15 €</span>
                  <span>50 €</span>
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <HeartHandshake className="w-4 h-4" />}
                Je soutiens et je participe
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                En soumettant, vous acceptez d'être recontacté par e-mail au sujet du programme de test.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BetaProgram;
