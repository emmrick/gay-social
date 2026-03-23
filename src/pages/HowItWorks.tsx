import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, UserCheck, Globe, Send, Heart, Shield, Camera, Lock, MapPin, Users, Sparkles, MessageCircle, Eye, Zap } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEOHead from '@/components/seo/SEOHead';

const FadeIn = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

const HowItWorks = () => {
  const navigate = useNavigate();

  const steps = [
    {
      step: '01',
      icon: <UserCheck className="w-7 h-7" />,
      title: 'Crée ton profil gratuitement',
      description: 'Inscription en 30 secondes avec ton e-mail. Ajoute tes photos, ta description et tes préférences (position, tribu, ce que tu recherches).',
      details: ['Photos de profil & galerie privée', 'Préférences détaillées', 'Géolocalisation optionnelle'],
    },
    {
      step: '02',
      icon: <Shield className="w-7 h-7" />,
      title: 'Vérifie ton identité',
      description: 'Pour garantir une communauté 100% authentique, nous vérifions chaque membre par selfie + pièce d\'identité. Tes documents sont supprimés après validation.',
      details: ['Selfie de vérification', 'Document d\'identité', 'Suppression automatique des documents'],
    },
    {
      step: '03',
      icon: <Globe className="w-7 h-7" />,
      title: 'Rejoins ton département',
      description: 'Gay Social est organisé par département. Rejoins le chat de ta région pour découvrir les mecs autour de toi et participer aux discussions de groupe.',
      details: ['101 départements couverts', 'Chat de groupe par région', 'Membres à proximité'],
    },
    {
      step: '04',
      icon: <MessageCircle className="w-7 h-7" />,
      title: 'Échange en privé',
      description: 'Envoie des messages privés, des photos et vidéos éphémères qui disparaissent après visionnage. Protection anti-screenshot intégrée.',
      details: ['Messages texte illimités', 'Photos & vidéos éphémères', 'Protection anti-capture d\'écran'],
    },
    {
      step: '05',
      icon: <Heart className="w-7 h-7" />,
      title: 'Swipe & Match',
      description: 'Parcours les profils à la manière de Tinder. Like les mecs qui te plaisent, et si c\'est réciproque, c\'est un match ! La conversation peut commencer.',
      details: ['Swipe like / pass', 'Matching réciproque', 'Notification de match instantanée'],
    },
    {
      step: '06',
      icon: <Users className="w-7 h-7" />,
      title: 'Rencontre IRL',
      description: 'Passe du virtuel au réel. Organise tes rencontres avec des mecs vérifiés de ta ville. Groupes thématiques (bears, twinks, sportifs…) disponibles.',
      details: ['Membres vérifiés uniquement', 'Groupes par centres d\'intérêt', 'Événements communautaires'],
    },
  ];

  const features = [
    { icon: <Camera className="w-5 h-5" />, label: 'Médias éphémères', desc: 'Photos et vidéos auto-destructibles' },
    { icon: <Lock className="w-5 h-5" />, label: 'Anti-screenshot', desc: 'Détection des captures d\'écran' },
    { icon: <Eye className="w-5 h-5" />, label: 'Albums privés', desc: 'Galeries partagées sur invitation' },
    { icon: <MapPin className="w-5 h-5" />, label: 'Proximité', desc: 'Trouve des mecs près de chez toi' },
    { icon: <Zap className="w-5 h-5" />, label: 'Boost de profil', desc: 'Sois vu en priorité' },
    { icon: <Sparkles className="w-5 h-5" />, label: '100% gratuit', desc: 'Inscription et chat de base gratuits' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Comment ça marche - Gay Social | Rencontre Gay France"
        description="Découvrez comment fonctionne Gay Social étape par étape : inscription gratuite, vérification d'identité, chat par département, médias éphémères et rencontres sécurisées entre hommes."
        canonical="https://gay-connect.fr/comment-ca-marche"
        keywords="comment fonctionne gay social, inscription gay social, rencontre gay france, tchat gay gratuit, site gay comment ça marche, plan cul gay inscription"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'Comment utiliser Gay Social pour rencontrer des hommes',
          description: 'Guide étape par étape pour utiliser Gay Social, le site de rencontre gay n°1 en France.',
          step: steps.map((s, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            name: s.title,
            text: s.description,
          })),
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-lg font-bold">Comment ça marche</h1>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_70%)]" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          <FadeIn>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <Zap className="w-4 h-4" />
              Simple & rapide
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold mb-5 leading-tight">
              De l'inscription à la
              <span className="rainbow-text block">rencontre en 6 étapes</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Gay Social est conçu pour être simple, sécurisé et efficace. Voici comment ça fonctionne.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Steps */}
      <section className="py-10 sm:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-6">
            {steps.map((step, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="relative flex gap-5 p-5 sm:p-7 rounded-2xl bg-card border border-border/50 hover:border-primary/20 transition-colors group">
                  {/* Step number */}
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg">
                      {step.icon}
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-xs font-bold text-primary">{step.step}</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {step.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {step.details.map((detail, j) => (
                        <span key={j} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-secondary text-muted-foreground">
                          <span className="w-1 h-1 rounded-full bg-primary" />
                          {detail}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16 bg-secondary/20">
        <div className="container mx-auto px-4 max-w-5xl">
          <FadeIn className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              Fonctionnalités incluses
            </h2>
            <p className="text-muted-foreground mt-2">Tout ce dont tu as besoin, en un seul endroit.</p>
          </FadeIn>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <FadeIn key={i} delay={i * 0.06}>
                <div className="bg-card border border-border/50 rounded-xl p-4 text-center hover:border-primary/20 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                    {f.icon}
                  </div>
                  <h4 className="font-semibold text-sm text-foreground mb-1">{f.label}</h4>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <FadeIn>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
              Prêt à commencer ?
            </h2>
            <p className="text-muted-foreground mb-8">
              Rejoins des milliers d'hommes vérifiés sur Gay Social. Inscription gratuite en 30 secondes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="xl" onClick={() => navigate('/auth')} className="group">
                <Sparkles className="w-5 h-5" />
                S'inscrire gratuitement
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="outline" size="xl" onClick={() => navigate('/securite')}>
                <Shield className="w-5 h-5" />
                Notre sécurité
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/30 bg-card/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-4 mb-3">
            <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
            <Link to="/securite" className="hover:text-primary transition-colors">Sécurité</Link>
            <Link to="/communaute" className="hover:text-primary transition-colors">Communauté</Link>
            <Link to="/about" className="hover:text-primary transition-colors">À propos</Link>
            <Link to="/legal" className="hover:text-primary transition-colors">Mentions légales</Link>
          </div>
          <p>© 2025 Gay Social. Réservé aux +18 ans.</p>
        </div>
      </footer>
    </div>
  );
};

export default HowItWorks;
