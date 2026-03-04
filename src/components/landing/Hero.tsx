import { Button } from '@/components/ui/button';
import { MessageCircle, Users, Shield, MapPin, AlertTriangle, Star, Zap, Eye, Heart, Camera, Lock } from 'lucide-react';
import { useTotalMemberCount, useOnlineMemberCount } from '@/hooks/useTotalMemberCount';
import { useNavigate, Link } from 'react-router-dom';
import SEOHead, { websiteJsonLd, organizationJsonLd, faqPageJsonLd } from '@/components/seo/SEOHead';
import React, { useEffect, useState } from 'react';

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

  const seoFaqs = [
    { question: 'Comment fonctionne Gay Connect ?', answer: 'Gay Connect est un site de rencontre gay gratuit qui permet aux hommes de se rencontrer par département. Créez votre profil, rejoignez le chat de votre région et échangez avec des hommes près de chez vous.' },
    { question: 'Gay Connect est-il gratuit ?', answer: 'Oui, l\'inscription et l\'accès au chat de groupe sont gratuits. Des fonctionnalités premium comme le boost de profil sont disponibles avec des crédits.' },
    { question: 'Le site est-il sécurisé ?', answer: 'Oui, nous vérifions l\'identité des membres, détectons les captures d\'écran et modérons activement la plateforme. Vos données restent confidentielles.' },
    { question: 'Comment trouver un plan cul gay près de chez moi ?', answer: 'Rejoignez le chat de votre département pour rencontrer des hommes gay de votre région. Utilisez la fonction de proximité pour voir les membres les plus proches.' },
    { question: 'Peut-on envoyer des photos et vidéos ?', answer: 'Oui, Gay Connect permet l\'envoi de photos et vidéos éphémères qui disparaissent après consultation, ainsi que des médias classiques dans les conversations privées.' },
    { question: 'Quelle est la différence avec Grindr ?', answer: 'Gay Connect est un site français centré sur la communauté locale par département, avec des chats de groupe, la vérification d\'identité, et une protection anti-capture d\'écran unique.' },
  ];

  const combinedJsonLd = { ...websiteJsonLd, ...organizationJsonLd };

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      <SEOHead
        title="Gay Connect - Site de Rencontre Gay, Sexe Gay & Tchat Gay France"
        description="Gay Connect : le site gay n°1 pour les rencontres et le sexe entre hommes en France. Tchat gay gratuit, plan cul gay par département, échanges de photos et vidéos. Communauté vérifiée. +18 ans."
        canonical="https://gay-connect.lovable.app/"
        keywords="site gay, rencontre gay, sexe gay, plan cul gay, tchat gay, chat gay, plan gay, drague gay, annonce gay, homme cherche homme, hookup gay, sexfriend gay, gay paris, gay lyon, gay marseille, gay toulouse, gay bordeaux, gay nantes, gay lille, rencontre sexe gay, plan cul homme, site plan cul gay, appli gay, application rencontre gay, mec gay, gay actif, gay passif, gay versatile, bear gay, twink, daddy gay, ours gay"
        jsonLd={combinedJsonLd}
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

      {/* SEO Rich Content Section */}
      <div className="relative z-20 bg-secondary/30 border-t border-border/50">
        <div className="container mx-auto px-4 py-16 max-w-5xl">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            Le meilleur site de rencontre gay en France
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-sm text-muted-foreground leading-relaxed">
            <div className="space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">Rencontres gay & sexe gay par département</h3>
              <p>
                Gay Connect est le <strong>site de rencontre gay</strong> et de <strong>sexe entre hommes</strong> n°1 en France. 
                Que tu cherches un <strong>plan cul gay</strong>, une <strong>rencontre gay sérieuse</strong> ou simplement 
                un <strong>tchat gay gratuit</strong>, notre plateforme te connecte avec des milliers d'hommes dans les 
                <strong> 101 départements français</strong>.
              </p>
              <p>
                Contrairement aux autres sites comme Grindr ou Scruff, Gay Connect est 100% français et organisé 
                par région. Trouve des <strong>mecs gay près de chez toi</strong> : <strong>gay Paris</strong>, <strong>gay Lyon</strong>, 
                <strong> gay Marseille</strong>, <strong>gay Toulouse</strong>, <strong>gay Bordeaux</strong>, <strong>gay Nantes</strong>, 
                <strong> gay Lille</strong>, <strong>gay Strasbourg</strong>, <strong>gay Montpellier</strong>… et partout en France !
              </p>
              <p>
                Notre <strong>chat gay</strong> de groupe par département te permet de rencontrer des <strong>hommes gay</strong> de ta 
                région en temps réel. Envoie des messages, partage des photos et des vidéos éphémères, et passe 
                aux <strong>conversations privées</strong> quand le feeling est là.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">Plan cul gay sécurisé & discret</h3>
              <p>
                Sur Gay Connect, ta <strong>vie privée</strong> est notre priorité. Tous les profils sont 
                <strong> vérifiés par pièce d'identité</strong>, les <strong>médias éphémères</strong> disparaissent après 
                consultation, et notre technologie <strong>anti-capture d'écran</strong> protège tes photos et vidéos.
              </p>
              <p>
                Que tu sois <strong>gay actif</strong>, <strong>gay passif</strong> ou <strong>versatile</strong>, 
                <strong> bear</strong>, <strong>twink</strong>, <strong>daddy</strong>, <strong>ours</strong> ou <strong>muscle</strong>, 
                tu trouveras des profils qui correspondent à tes envies. Indique tes préférences et ce que tu 
                <strong> recherches</strong> pour des matchs plus pertinents.
              </p>
              <p>
                <strong>Inscription gratuite</strong> et immédiate. Crée ton profil, ajoute tes photos, et commence 
                à échanger avec des <strong>hommes gay</strong> de ta ville dès maintenant. Rejoins la plus grande 
                <strong> communauté gay française</strong> en ligne !
              </p>
            </div>
          </div>

          {/* SEO Features List */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center space-y-2 p-4">
              <Heart className="w-6 h-6 text-primary mx-auto" />
              <h4 className="font-semibold text-foreground text-sm">Plan cul gay</h4>
              <p className="text-xs text-muted-foreground">Rencontres rapides près de chez toi</p>
            </div>
            <div className="text-center space-y-2 p-4">
              <Camera className="w-6 h-6 text-primary mx-auto" />
              <h4 className="font-semibold text-foreground text-sm">Photos & vidéos</h4>
              <p className="text-xs text-muted-foreground">Échanges de médias éphémères</p>
            </div>
            <div className="text-center space-y-2 p-4">
              <Lock className="w-6 h-6 text-primary mx-auto" />
              <h4 className="font-semibold text-foreground text-sm">100% discret</h4>
              <p className="text-xs text-muted-foreground">Anti-screenshot & profils vérifiés</p>
            </div>
            <div className="text-center space-y-2 p-4">
              <MapPin className="w-6 h-6 text-primary mx-auto" />
              <h4 className="font-semibold text-foreground text-sm">Gay par ville</h4>
              <p className="text-xs text-muted-foreground">101 départements couverts</p>
            </div>
          </div>
        </div>
      </div>

      {/* SEO FAQ Section with structured data */}
      <div className="relative z-20 bg-background border-t border-border/50">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <h2 className="font-display text-2xl font-bold text-foreground mb-8 text-center">
            Questions fréquentes sur Gay Connect
          </h2>
          <div className="space-y-4">
            {seoFaqs.map((faq, i) => (
              <details key={i} className="group bg-secondary/30 rounded-xl border border-border/50 overflow-hidden">
                <summary className="px-6 py-4 cursor-pointer font-medium text-foreground hover:text-primary transition-colors list-none flex items-center justify-between">
                  <span>{faq.question}</span>
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
          {/* Inject FAQ JSON-LD */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(seoFaqs)) }}
          />
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
          {/* SEO internal links */}
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground/60">
            <Link to="/region/75-paris" className="hover:text-primary transition-colors">Gay Paris</Link>
            <Link to="/region/69-rhone" className="hover:text-primary transition-colors">Gay Lyon</Link>
            <Link to="/region/13-bouches-du-rhone" className="hover:text-primary transition-colors">Gay Marseille</Link>
            <Link to="/region/31-haute-garonne" className="hover:text-primary transition-colors">Gay Toulouse</Link>
            <Link to="/region/33-gironde" className="hover:text-primary transition-colors">Gay Bordeaux</Link>
            <Link to="/region/44-loire-atlantique" className="hover:text-primary transition-colors">Gay Nantes</Link>
            <Link to="/region/59-nord" className="hover:text-primary transition-colors">Gay Lille</Link>
            <Link to="/region/67-bas-rhin" className="hover:text-primary transition-colors">Gay Strasbourg</Link>
            <Link to="/region/34-herault" className="hover:text-primary transition-colors">Gay Montpellier</Link>
            <Link to="/region/06-alpes-maritimes" className="hover:text-primary transition-colors">Gay Nice</Link>
          </div>
        </div>
      </footer>
    </section>
  );
};

const FeatureCard = React.forwardRef<HTMLDivElement, { icon: React.ReactNode; title: string; description: string }>(
  ({ icon, title, description }, ref) => (
    <div ref={ref} className="glass-card rounded-xl p-4 md:p-6 text-center hover:border-primary/50 transition-colors duration-300">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20 text-primary mb-3">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
);
FeatureCard.displayName = 'FeatureCard';

export default Hero;
