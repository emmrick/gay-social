import { Eye } from 'lucide-react';
import { FadeInWhenVisible } from './animations';
import { ProfileGridPreview, SwipeCardPreview, ChatPreview } from './AppPreviews';

const ShowcaseSection = () => (
  <div className="landing-section bg-gradient-to-b from-background to-secondary/30 overflow-hidden">
    <div className="container mx-auto px-4 max-w-6xl">
      <FadeInWhenVisible className="text-center mb-14">
        <span className="section-badge">
          <Eye className="w-4 h-4" />
          Aperçu
        </span>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
          Découvre l'expérience
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Un aperçu de ce qui t'attend sur Gay Social. Des profils réels, des conversations authentiques.
        </p>
      </FadeInWhenVisible>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        <FadeInWhenVisible delay={0}>
          <div className="relative group">
            <div className="absolute -inset-3 bg-gradient-to-br from-primary/15 to-accent/15 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative">
              <ProfileGridPreview />
              <div className="p-4 text-center">
                <h3 className="font-display font-bold text-foreground mb-1">Explore les profils</h3>
                <p className="text-xs text-muted-foreground">Des milliers de membres vérifiés t'attendent dans ton département.</p>
              </div>
            </div>
          </div>
        </FadeInWhenVisible>

        <FadeInWhenVisible delay={0.15}>
          <div className="relative group md:-mt-6">
            <div className="absolute -inset-3 bg-gradient-to-br from-accent/15 to-primary/15 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative">
              <SwipeCardPreview />
              <div className="p-4 text-center">
                <h3 className="font-display font-bold text-foreground mb-1">Swipe & Match</h3>
                <p className="text-xs text-muted-foreground">Fais défiler les profils et connecte-toi avec ceux qui te plaisent.</p>
              </div>
            </div>
          </div>
        </FadeInWhenVisible>

        <FadeInWhenVisible delay={0.3}>
          <div className="relative group">
            <div className="absolute -inset-3 bg-gradient-to-br from-primary/15 to-accent/15 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative">
              <ChatPreview />
              <div className="p-4 text-center">
                <h3 className="font-display font-bold text-foreground mb-1">Chats privés</h3>
                <p className="text-xs text-muted-foreground">Messages, photos éphémères et médias en toute discrétion.</p>
              </div>
            </div>
          </div>
        </FadeInWhenVisible>
      </div>
    </div>
  </div>
);

export default ShowcaseSection;
