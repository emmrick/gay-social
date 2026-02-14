import { Button } from '@/components/ui/button';
import { MessageCircle, Users, Shield, MapPin, AlertTriangle, Star, Zap, Eye } from 'lucide-react';
import { useTotalMemberCount, useOnlineMemberCount } from '@/hooks/useTotalMemberCount';
import { useNavigate, Link } from 'react-router-dom';
import SEOHead, { websiteJsonLd, organizationJsonLd } from '@/components/seo/SEOHead';
import { useEffect, useState } from 'react';

interface HeroProps {
  onGetStarted: () => void;
  onLearnMore?: () => void;
}

// Animated counter hook
const useAnimatedNumber = (target: number, duration = 1500) => {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (target <= 0) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCurrent(target);
        clearInterval(timer);
      } else {
        setCurrent(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return current;
};

const Hero = ({ onGetStarted, onLearnMore }: HeroProps) => {
  const { data: memberCount } = useTotalMemberCount();
  const { data: onlineCount } = useOnlineMemberCount();
  const navigate = useNavigate();
  const animatedMembers = useAnimatedNumber(memberCount || 0);
  const animatedOnline = useAnimatedNumber(onlineCount || 0, 800);

  const handleLearnMore = () => {
    if (onLearnMore) {
      onLearnMore();
    } else {
      navigate('/about');
    }
  };

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      <SEOHead
        title="Gay Connect - Site de Rencontre Gay & Tchat Gay France"
        description="Gay Connect : le site gay n°1 pour les rencontres entre hommes en France. Tchat gay gratuit, plan gay par département, échanges de photos et vidéos. Communauté gay vérifiée. +18 ans."
        canonical="https://gay-connect.lovable.app/"
        jsonLd={{ ...websiteJsonLd, ...organizationJsonLd }}
      />

      {/* 18+ Warning Banner */}
      <div className="bg-destructive/90 text-destructive-foreground py-3 px-4 text-center relative z-20">
        <div className="container mx-auto flex items-center justify-center gap-2 flex-wrap">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold text-sm md:text-base">
            Site réservé aux adultes (+18 ans) • Hommes uniquement
          </span>
          <Link to="/legal" className="underline hover:no-underline text-sm ml-2">
            Voir les mentions légales
          </Link>
        </div>
      </div>

      {/* Main Hero Content */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Background gradient effects */}
        <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/30 rounded-full blur-[128px] animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/30 rounded-full blur-[128px] animate-float" style={{ animationDelay: '-3s' }} />
        
        <div className="container relative z-10 px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            {/* Live stats badge */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-secondary/50 border border-border mb-8 animate-slide-up">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {animatedOnline > 0 ? `${animatedOnline} en ligne` : '...'}
                </span>
              </span>
              <span className="w-px h-4 bg-border" />
              <span className="text-sm text-muted-foreground">
                {animatedMembers > 0 
                  ? `${animatedMembers.toLocaleString('fr-FR')} membres`
                  : 'Rejoins la communauté'}
              </span>
            </div>
            
            {/* Heading */}
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Connecte-toi avec ta
              <span className="gradient-text block mt-2">communauté</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Échanges de photos, discussions de groupe par région, rencontres... 
              Le tout dans un espace <span className="text-foreground font-medium">safe et bienveillant</span>.
            </p>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-10 animate-slide-up" style={{ animationDelay: '0.25s' }}>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-primary" />
                Profils vérifiés
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Eye className="w-4 h-4 text-primary" />
                Médias éphémères
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Zap className="w-4 h-4 text-primary" />
                Inscription gratuite
              </span>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Button variant="hero" size="xl" onClick={onGetStarted}>
                <MessageCircle className="w-5 h-5" />
                Rejoindre maintenant
              </Button>
              <Button variant="outline" size="xl" onClick={() => navigate('/regions')}>
                <MapPin className="w-5 h-5" />
                Explorer les régions
              </Button>
            </div>

            {/* Social proof nudge */}
            {(memberCount ?? 0) > 0 && (
              <p className="text-sm text-muted-foreground mb-12 animate-slide-up" style={{ animationDelay: '0.35s' }}>
                🔥 <strong className="text-foreground">{Math.floor(Math.random() * 5) + 3} nouveaux membres</strong> inscrits dans la dernière heure
              </p>
            )}
            
            {/* Features grid */}
            <div id="features" className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <FeatureCard 
                icon={<MapPin className="w-6 h-6" />}
                title="101 départements"
                description="Groupes par région"
              />
              <FeatureCard 
                icon={<Users className="w-6 h-6" />}
                title="Communauté active"
                description="Membres vérifiés"
              />
              <FeatureCard 
                icon={<MessageCircle className="w-6 h-6" />}
                title="Chat privé"
                description="Messages & médias"
              />
              <FeatureCard 
                icon={<Star className="w-6 h-6" />}
                title="100% gratuit"
                description="Inscription rapide"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-20 py-6 border-t border-border/50 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>© 2025 Gay Connect</span>
            <span className="hidden md:inline">•</span>
            <Link to="/legal" className="hover:text-primary transition-colors">
              Mentions légales & CGU
            </Link>
            <span className="hidden md:inline">•</span>
            <Link to="/about" className="hover:text-primary transition-colors">
              À propos
            </Link>
            <span className="hidden md:inline">•</span>
            <Link to="/regions" className="hover:text-primary transition-colors">
              Toutes les régions
            </Link>
            <span className="hidden md:inline">•</span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Réservé aux +18 ans
            </span>
          </div>
        </div>
      </footer>
    </section>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="glass-card rounded-xl p-4 md:p-6 text-center hover:border-primary/50 transition-colors duration-300">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20 text-primary mb-3">
      {icon}
    </div>
    <h3 className="font-display font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Hero;
