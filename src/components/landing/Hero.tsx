import { Button } from '@/components/ui/button';
import { MessageCircle, Users, Shield, MapPin } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
}

const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/30 rounded-full blur-[128px] animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/30 rounded-full blur-[128px] animate-float" style={{ animationDelay: '-3s' }} />
      
      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border mb-8 animate-slide-up">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">+5000 membres actifs</span>
          </div>
          
          {/* Heading */}
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Connecte-toi avec ta
            <span className="gradient-text block mt-2">communauté</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Échanges de photos, discussions de groupe par région, rencontres... 
            Le tout dans un espace <span className="text-foreground font-medium">safe et bienveillant</span>.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Button variant="hero" size="xl" onClick={onGetStarted}>
              <MessageCircle className="w-5 h-5" />
              Rejoindre maintenant
            </Button>
            <Button variant="outline" size="xl">
              En savoir plus
            </Button>
          </div>
          
          {/* Features grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <FeatureCard 
              icon={<MapPin className="w-6 h-6" />}
              title="Par région"
              description="Groupes par code postal"
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6" />}
              title="Communauté"
              description="Membres vérifiés"
            />
            <FeatureCard 
              icon={<MessageCircle className="w-6 h-6" />}
              title="Chat privé"
              description="Messages directs"
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6" />}
              title="Sécurisé"
              description="Données protégées"
            />
          </div>
        </div>
      </div>
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
