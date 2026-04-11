import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingNavBarProps {
  onGetStarted: () => void;
}

const LandingNavBar = ({ onGetStarted }: LandingNavBarProps) => (
  <>
    {/* Navigation */}
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-background/80 backdrop-blur-xl border-b border-border/40 py-3 px-5 sticky top-0 z-50"
    >
      <div className="container mx-auto flex items-center justify-between max-w-6xl">
        <h1 className="font-display text-2xl font-extrabold rainbow-text leading-tight">
          Gay Social
        </h1>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/comment-ca-marche" className="hover:text-foreground transition-colors">Comment ça marche</Link>
          <Link to="/securite" className="hover:text-foreground transition-colors">Sécurité</Link>
          <Link to="/communaute" className="hover:text-foreground transition-colors">Communauté</Link>
          <Link to="/regions" className="hover:text-foreground transition-colors">Régions</Link>
          <Button size="sm" onClick={onGetStarted} className="rounded-full px-5">
            S'inscrire
          </Button>
        </nav>
        <div className="sm:hidden">
          <Button size="sm" onClick={onGetStarted} className="rounded-full px-5">
            S'inscrire
          </Button>
        </div>
      </div>
    </motion.div>

    {/* 18+ Warning */}
    <div className="bg-destructive/90 text-destructive-foreground py-2 px-4 text-center">
      <div className="container mx-auto flex items-center justify-center gap-2 flex-wrap">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="font-semibold text-xs">
          Site réservé aux adultes (+18 ans) • Hommes uniquement
        </span>
        <Link to="/legal" className="underline hover:no-underline text-xs ml-1">
          Mentions légales
        </Link>
      </div>
    </div>
  </>
);

export default LandingNavBar;
