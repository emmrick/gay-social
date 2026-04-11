import { Sparkles, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { FadeInWhenVisible } from './animations';

interface LandingFooterProps {
  onGetStarted: () => void;
}

const LandingFooter = ({ onGetStarted }: LandingFooterProps) => (
  <>
    {/* Final CTA */}
    <div className="relative z-10 py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06),transparent_70%)]" />
      <FadeInWhenVisible className="container mx-auto px-4 max-w-3xl text-center relative z-10">
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-5">
          Prêt à rejoindre la
          <span className="rainbow-text block mt-1">communauté ?</span>
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
          Inscription gratuite, profils vérifiés, zéro pub. Qu'est-ce que tu attends ?
        </p>
        <Button variant="hero" size="xl" onClick={onGetStarted} className="group rounded-full">
          <Sparkles className="w-5 h-5" />
          C'est parti !
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </FadeInWhenVisible>
    </div>

    {/* Footer */}
    <footer className="relative z-20 py-10 border-t border-border/30 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8 max-w-4xl mx-auto text-sm">
          <div>
            <h4 className="font-semibold text-foreground mb-3">Découvrir</h4>
            <div className="space-y-2 text-muted-foreground">
              <Link to="/comment-ca-marche" className="block hover:text-primary transition-colors">Comment ça marche</Link>
              <Link to="/securite" className="block hover:text-primary transition-colors">Sécurité</Link>
              <Link to="/communaute" className="block hover:text-primary transition-colors">Communauté</Link>
              <Link to="/regions" className="block hover:text-primary transition-colors">Toutes les régions</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3">Informations</h4>
            <div className="space-y-2 text-muted-foreground">
              <Link to="/about" className="block hover:text-primary transition-colors">À propos</Link>
              <Link to="/aide" className="block hover:text-primary transition-colors">Centre d'aide</Link>
              <Link to="/regles" className="block hover:text-primary transition-colors">Règles du site</Link>
              <Link to="/guide" className="block hover:text-primary transition-colors">Guide d'utilisation</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3">Légal</h4>
            <div className="space-y-2 text-muted-foreground">
              <Link to="/legal" className="block hover:text-primary transition-colors">Mentions légales</Link>
              <Link to="/legal" className="block hover:text-primary transition-colors">CGU</Link>
              <Link to="/legal" className="block hover:text-primary transition-colors">Confidentialité</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3">Villes populaires</h4>
            <div className="space-y-2 text-muted-foreground">
              <Link to="/region/75-paris" className="block hover:text-primary transition-colors">Gay Paris</Link>
              <Link to="/region/69-rhone" className="block hover:text-primary transition-colors">Gay Lyon</Link>
              <Link to="/region/13-bouches-du-rhone" className="block hover:text-primary transition-colors">Gay Marseille</Link>
              <Link to="/region/31-haute-garonne" className="block hover:text-primary transition-colors">Gay Toulouse</Link>
              <Link to="/region/33-gironde" className="block hover:text-primary transition-colors">Gay Bordeaux</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-border/30 pt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-muted-foreground">
          <span>© 2025 Gay Social</span>
          <span className="hidden sm:inline">•</span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Réservé aux +18 ans
          </span>
        </div>

        {/* SEO city links */}
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground/50">
          {[
            { to: '/region/44-loire-atlantique', label: 'Gay Nantes' },
            { to: '/region/59-nord', label: 'Gay Lille' },
            { to: '/region/67-bas-rhin', label: 'Gay Strasbourg' },
            { to: '/region/34-herault', label: 'Gay Montpellier' },
            { to: '/region/06-alpes-maritimes', label: 'Gay Nice' },
            { to: '/region/35-ille-et-vilaine', label: 'Gay Rennes' },
            { to: '/region/76-seine-maritime', label: 'Gay Rouen' },
            { to: '/region/38-isere', label: 'Gay Grenoble' },
          ].map(link => (
            <Link key={link.to} to={link.to} className="hover:text-primary transition-colors">{link.label}</Link>
          ))}
        </div>
      </div>
    </footer>
  </>
);

export default LandingFooter;
