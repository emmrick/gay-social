import { UserCheck, Globe, Send, Heart, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FadeInWhenVisible, StaggerContainer, StaggerItem } from './animations';

interface HowItWorksSectionProps {
  onGetStarted: () => void;
}

const steps = [
  { step: '01', title: 'Crée ton profil', description: 'Inscription gratuite en 30 secondes. Ajoute tes photos et préférences.', icon: <UserCheck className="w-6 h-6" /> },
  { step: '02', title: 'Explore ta région', description: 'Rejoins le chat de ton département et découvre les membres près de chez toi.', icon: <Globe className="w-6 h-6" /> },
  { step: '03', title: 'Échange en privé', description: 'Envoie des messages, photos et vidéos éphémères en toute discrétion.', icon: <Send className="w-6 h-6" /> },
  { step: '04', title: 'Rencontre IRL', description: 'Passe du virtuel au réel. Rendez-vous dans ta ville avec des mecs vérifiés.', icon: <Heart className="w-6 h-6" /> },
];

const HowItWorksSection = ({ onGetStarted }: HowItWorksSectionProps) => (
  <div className="landing-section">
    <div className="container mx-auto px-4 max-w-5xl">
      <FadeInWhenVisible className="text-center mb-14">
        <span className="section-badge">
          <Zap className="w-4 h-4" />
          Comment ça marche
        </span>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
          En 4 étapes simples
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          De l'inscription à la rencontre, tout est fluide.
        </p>
      </FadeInWhenVisible>

      <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((item, i) => (
          <StaggerItem key={i}>
            <div className="relative text-center group">
              {i < 3 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-border to-transparent" />
              )}
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/50 mb-5 group-hover:border-primary/30 transition-colors">
                <span className="text-primary">{item.icon}</span>
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg">
                  {item.step}
                </span>
              </div>
              <h3 className="font-display font-bold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <FadeInWhenVisible delay={0.3} className="text-center mt-14">
        <Button variant="hero" size="xl" onClick={onGetStarted} className="group rounded-full">
          Commencer gratuitement
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </FadeInWhenVisible>
    </div>
  </div>
);

export default HowItWorksSection;
