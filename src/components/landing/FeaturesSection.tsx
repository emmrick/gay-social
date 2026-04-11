import { MapPin, Camera, Shield, Lock, Heart, Users, Sparkles } from 'lucide-react';
import { FadeInWhenVisible, StaggerContainer, StaggerItem } from './animations';

const features = [
  {
    icon: <MapPin className="w-7 h-7" />,
    title: '101 départements',
    description: 'Des salons de discussion dédiés pour chaque département français. Trouve des mecs près de chez toi.',
    iconBg: 'bg-primary/10 text-primary',
  },
  {
    icon: <Camera className="w-7 h-7" />,
    title: 'Médias éphémères',
    description: 'Envoie des photos et vidéos qui disparaissent après consultation. Avec protection anti-screenshot.',
    iconBg: 'bg-accent/10 text-accent',
  },
  {
    icon: <Shield className="w-7 h-7" />,
    title: 'Profils vérifiés',
    description: 'Vérification d\'identité obligatoire. Fini les faux profils. Communauté 100% authentique.',
    iconBg: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  {
    icon: <Lock className="w-7 h-7" />,
    title: 'Anti-screenshot',
    description: 'Technologie exclusive de détection de captures d\'écran. Tes photos privées restent privées.',
    iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  {
    icon: <Heart className="w-7 h-7" />,
    title: 'Swipe & Match',
    description: 'Fais défiler les profils et matche avec ceux qui te plaisent. Système de compatibilité intelligent.',
    iconBg: 'bg-accent/10 text-accent',
  },
  {
    icon: <Users className="w-7 h-7" />,
    title: 'Groupes privés',
    description: 'Crée ou rejoins des groupes thématiques. Discussions entre bears, twinks, sportifs, gamers…',
    iconBg: 'bg-primary/10 text-primary',
  },
];

const FeaturesSection = () => (
  <div className="landing-section bg-secondary/20">
    <div className="container mx-auto px-4 max-w-6xl">
      <FadeInWhenVisible className="text-center mb-14">
        <span className="section-badge">
          <Sparkles className="w-4 h-4" />
          Fonctionnalités
        </span>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
          Tout ce qu'il te faut
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Des outils conçus pour la communauté, par la communauté. Sécurité, discrétion et plaisir.
        </p>
      </FadeInWhenVisible>

      <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((feature, i) => (
          <StaggerItem key={i}>
            <div className="feature-card group">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${feature.iconBg} mb-4 transition-transform duration-300 group-hover:scale-110`}>
                {feature.icon}
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  </div>
);

export default FeaturesSection;
