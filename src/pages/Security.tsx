import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Shield, Lock, Eye, Camera, UserCheck, AlertTriangle, CheckCircle2, Fingerprint, ShieldCheck, Server, Ban, Sparkles } from 'lucide-react';
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

const Security = () => {
  const navigate = useNavigate();

  const securityFeatures = [
    {
      icon: <Fingerprint className="w-8 h-8" />,
      title: 'Vérification d\'identité',
      description: 'Chaque membre doit vérifier son identité avec un selfie et une pièce d\'identité. Les documents sont automatiquement supprimés après validation. Fini les faux profils et les catfish.',
      badge: 'Obligatoire',
      color: 'bg-green-500/10 text-green-500',
    },
    {
      icon: <Camera className="w-8 h-8" />,
      title: 'Médias éphémères',
      description: 'Les photos et vidéos éphémères disparaissent définitivement après consultation. Elles ne sont stockées que le temps nécessaire et sont réellement supprimées de nos serveurs.',
      badge: 'Auto-destructible',
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: 'Détection anti-screenshot',
      description: 'Notre technologie détecte les captures d\'écran en temps réel. L\'expéditeur est immédiatement notifié et le compte fautif peut être suspendu automatiquement.',
      badge: 'Technologie exclusive',
      color: 'bg-orange-500/10 text-orange-500',
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: 'Verrouillage par PIN',
      description: 'Protège l\'accès à l\'application avec un code PIN personnel. Même si quelqu\'un a accès à ton téléphone, ton compte Gay Social reste privé.',
      badge: 'Optionnel',
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      icon: <Ban className="w-8 h-8" />,
      title: 'Modération IA + humaine',
      description: 'Notre intelligence artificielle analyse les contenus en temps réel, assistée par une équipe de modérateurs humains qui interviennent 24h/24 pour maintenir un espace safe.',
      badge: '24h/24',
      color: 'bg-red-500/10 text-red-500',
    },
    {
      icon: <Server className="w-8 h-8" />,
      title: 'Données chiffrées',
      description: 'Toutes les communications sont chiffrées. Tes données personnelles ne sont jamais vendues à des tiers. Conformité RGPD garantie.',
      badge: 'RGPD',
      color: 'bg-cyan-500/10 text-cyan-500',
    },
  ];

  const commitments = [
    'Aucune vente de données personnelles',
    'Suppression réelle des médias éphémères',
    'Documents d\'identité détruits après vérification',
    'Signalement et blocage en 1 clic',
    'Équipe de modération active 24h/24',
    'Conformité totale au RGPD',
    'Droit à l\'oubli : suppression complète du compte',
    'Notifications en cas de détection de capture d\'écran',
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Sécurité & Confidentialité - Gay Social | Protection Vie Privée"
        description="Découvrez comment Gay Social protège votre vie privée : vérification d'identité, médias éphémères, anti-screenshot, modération IA, données chiffrées. Le site gay le plus sécurisé de France."
        canonical="https://gay-connect.fr/securite"
        keywords="sécurité gay social, vie privée gay, anti screenshot gay, vérification identité gay, site gay sécurisé, protection données gay, RGPD gay, médias éphémères gay"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Sécurité & Confidentialité - Gay Social',
          description: 'Comment Gay Social protège la vie privée et la sécurité de ses membres.',
          url: 'https://gay-connect.fr/securite',
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-lg font-bold">Sécurité & Confidentialité</h1>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_70%)]" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          <FadeIn>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-bold mb-5 leading-tight">
              Ta sécurité est notre
              <span className="rainbow-text block">priorité absolue</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Gay Social intègre les technologies de protection les plus avancées pour que tu puisses échanger en toute confiance et discrétion.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Security features */}
      <section className="py-10 sm:py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid sm:grid-cols-2 gap-5">
            {securityFeatures.map((feature, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="bg-card border border-border/50 rounded-2xl p-6 hover:border-primary/20 transition-colors group h-full">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center flex-shrink-0`}>
                      {feature.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
                          {feature.title}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                          {feature.badge}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Commitments */}
      <section className="py-16 bg-secondary/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <FadeIn className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">Nos engagements</h2>
            <p className="text-muted-foreground mt-2">Ce que nous garantissons à chaque membre.</p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 gap-3">
            {commitments.map((c, i) => (
              <FadeIn key={i} delay={i * 0.04}>
                <div className="flex items-center gap-3 p-4 bg-card border border-border/50 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-foreground">{c}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How to report */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <FadeIn>
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-8 h-8 text-destructive flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">
                    Signaler un comportement abusif
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Tu peux signaler n'importe quel profil ou message en 1 clic directement depuis l'application. 
                    Notre équipe de modération traite chaque signalement sous 24h maximum. En cas d'urgence, 
                    les comptes dangereux sont suspendus immédiatement par notre IA.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tu peux aussi nous contacter via le <Link to="/aide/chat" className="text-primary font-semibold hover:underline">support en ligne</Link>.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <FadeIn>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
              Échange en toute confiance
            </h2>
            <p className="text-muted-foreground mb-8">
              Rejoins la communauté gay la plus sécurisée de France.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="xl" onClick={() => navigate('/auth')} className="group">
                <Sparkles className="w-5 h-5" />
                Rejoindre Gay Social
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="outline" size="xl" onClick={() => navigate('/comment-ca-marche')}>
                Comment ça marche
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
            <Link to="/comment-ca-marche" className="hover:text-primary transition-colors">Comment ça marche</Link>
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

export default Security;
