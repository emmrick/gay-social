import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Users, MapPin, Heart, MessageCircle, Camera, Shield, Star, Sparkles, TrendingUp, Globe } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEOHead from '@/components/seo/SEOHead';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

interface CommunityStats {
  total_members: number;
  online_members: number;
  verified_members: number;
  total_rooms: number;
}

const Community = () => {
  const navigate = useNavigate();

  // Public RPC — works for visitors AND authenticated users
  const { data: communityStats } = useQuery({
    queryKey: ['community-public-stats'],
    queryFn: async (): Promise<CommunityStats> => {
      const { data, error } = await supabase.rpc('get_community_public_stats');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        total_members: Number(row?.total_members ?? 0),
        online_members: Number(row?.online_members ?? 0),
        verified_members: Number(row?.verified_members ?? 0),
        total_rooms: Number(row?.total_rooms ?? 0),
      };
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const fmt = (n?: number) => (n != null ? n.toLocaleString('fr-FR') : '…');

  const stats = [
    { value: fmt(communityStats?.total_members), label: 'Membres inscrits', icon: <Users className="w-5 h-5" /> },
    { value: fmt(communityStats?.online_members), label: 'En ligne maintenant', icon: <TrendingUp className="w-5 h-5" /> },
    { value: fmt(communityStats?.verified_members), label: 'Profils vérifiés', icon: <Shield className="w-5 h-5" /> },
    { value: fmt(communityStats?.total_rooms), label: 'Salons de discussion', icon: <MessageCircle className="w-5 h-5" /> },
  ];

  const testimonials = [
    {
      name: 'Lucas',
      age: 25,
      city: 'Paris',
      text: 'J\'ai trouvé une vraie communauté ici. Le chat par département, c\'est génial pour rencontrer des mecs du quartier. Et les médias éphémères, ça rassure.',
      rating: 5,
    },
    {
      name: 'Karim',
      age: 30,
      city: 'Lyon',
      text: 'Beaucoup mieux que Grindr pour les rencontres. Les profils sont vérifiés, on sait à qui on parle. Et l\'anti-screenshot, c\'est le top pour la discrétion.',
      rating: 5,
    },
    {
      name: 'Antoine',
      age: 28,
      city: 'Bordeaux',
      text: 'Le swipe est fun et l\'app est super bien faite. Le chat de groupe par département permet de se faire des potes, pas juste des plans. J\'adore le concept.',
      rating: 5,
    },
    {
      name: 'Marc',
      age: 35,
      city: 'Marseille',
      text: 'Enfin un site gay français qui pense à la sécurité. La vérification d\'identité filtre les faux profils. On se sent en confiance pour échanger.',
      rating: 4,
    },
    {
      name: 'Enzo',
      age: 22,
      city: 'Nantes',
      text: 'L\'inscription est rapide et gratuite. Les groupes thématiques permettent de trouver des mecs avec les mêmes centres d\'intérêt. Top !',
      rating: 5,
    },
    {
      name: 'Bastien',
      age: 33,
      city: 'Toulouse',
      text: 'Je cherchais un site discret et bien modéré. Gay Social coche toutes les cases. La communauté est respectueuse et les fonctionnalités sont complètes.',
      rating: 5,
    },
  ];

  const communityFeatures = [
    {
      icon: <MapPin className="w-7 h-7" />,
      title: 'Organisé par département',
      description: 'Chaque département français a son propre salon de discussion. Rencontre des mecs de ta ville, de ton quartier.',
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: 'Groupes thématiques',
      description: 'Rejoins des groupes par centres d\'intérêt : bears, twinks, sportifs, gamers, couples, soirées… Il y en a pour tous les goûts.',
    },
    {
      icon: <Heart className="w-7 h-7" />,
      title: 'Plus que des plans',
      description: 'Gay Social n\'est pas qu\'un site de plans. C\'est un lieu pour créer des liens, se faire des amis, trouver sa tribu.',
    },
    {
      icon: <Globe className="w-7 h-7" />,
      title: 'France entière + DOM-TOM',
      description: 'De la métropole aux DOM-TOM, Gay Social couvre l\'ensemble du territoire français. Guadeloupe, Martinique, Réunion… Tous représentés.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Communauté Gay Social - Témoignages & Avis | Rencontre Gay France"
        description="Découvrez la communauté Gay Social : témoignages de membres, statistiques en temps réel, fonctionnalités communautaires. Rejoignez des milliers d'hommes vérifiés partout en France."
        canonical="https://gaysocial.fr/communaute"
        keywords="communauté gay france, témoignages gay social, avis gay social, gay social avis, site gay fiable, gay social membres, rencontre gay avis, communauté homosexuelle france"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Communauté Gay Social - Témoignages & Avis',
          description: 'Témoignages de membres et statistiques de la communauté Gay Social.',
          url: 'https://gaysocial.fr/communaute',
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-lg font-bold">Notre communauté</h1>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_70%)]" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          <FadeIn>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <Users className="w-4 h-4" />
              Communauté active
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold mb-5 leading-tight">
              Des milliers d'hommes
              <span className="rainbow-text block">partout en France</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Gay Social, c'est plus qu'un site de rencontre. C'est une communauté vivante, bienveillante et sécurisée.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Live stats */}
      <section className="py-10">
        <div className="container mx-auto px-4 max-w-4xl">
          <FadeIn>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-xl p-5 text-center">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                    {stat.icon}
                  </div>
                  <p className="font-display text-2xl sm:text-3xl font-bold text-primary">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Community features */}
      <section className="py-16 bg-secondary/20">
        <div className="container mx-auto px-4 max-w-5xl">
          <FadeIn className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">Une communauté pas comme les autres</h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 gap-5">
            {communityFeatures.map((f, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="bg-card border border-border/50 rounded-2xl p-6 hover:border-primary/20 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-display font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <FadeIn className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">Ce que disent nos membres</h2>
            <p className="text-muted-foreground mt-2">Des avis authentiques de vrais utilisateurs.</p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 0.06}>
                <div className="bg-card border border-border/50 rounded-2xl p-5 h-full flex flex-col">
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    ))}
                    {Array.from({ length: 5 - t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-muted-foreground/30" />
                    ))}
                  </div>
                  {/* Text */}
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 italic">
                    "{t.text}"
                  </p>
                  {/* Author */}
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}, {t.age} ans</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {t.city}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <FadeIn>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
              Fais partie de l'aventure
            </h2>
            <p className="text-muted-foreground mb-8">
              Rejoins la communauté gay la plus active de France. Inscription gratuite.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="xl" onClick={() => navigate('/auth')} className="group">
                <Sparkles className="w-5 h-5" />
                Rejoindre maintenant
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="outline" size="xl" onClick={() => navigate('/regions')}>
                <MapPin className="w-5 h-5" />
                Explorer les régions
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
            <Link to="/securite" className="hover:text-primary transition-colors">Sécurité</Link>
            <Link to="/about" className="hover:text-primary transition-colors">À propos</Link>
            <Link to="/legal" className="hover:text-primary transition-colors">Mentions légales</Link>
          </div>
          <p>© 2025 Gay Social. Réservé aux +18 ans.</p>
        </div>
      </footer>
    </div>
  );
};

export default Community;
