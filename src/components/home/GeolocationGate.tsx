import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Loader2, ShieldCheck, AlertTriangle, RefreshCw, Satellite } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface GeolocationGateProps {
  /** État de la permission navigateur ('granted' | 'prompt' | 'denied' | null) */
  permissionState: PermissionState | null;
  /** Indique si une demande est en cours */
  loading: boolean;
  /** Message d'erreur éventuel */
  error: string | null;
  /** Déclenche la demande de localisation */
  onRequest: () => void;
}

/**
 * Écran bloquant affiché tant que l'utilisateur n'a pas activé sa géolocalisation.
 * Couvre les cas : prompt initial, refus, échec, navigateur non supporté.
 */
const GeolocationGate = ({ permissionState, loading, error, onRequest }: GeolocationGateProps) => {
  const isDenied = permissionState === 'denied';
  const hasError = !!error && !loading;

  // Barre de progression réaliste basée sur le temps écoulé / timeout (12 s).
  // Approche asymptotique vers 95 % puis saut à 100 % à la résolution.
  const TIMEOUT_MS = 12_000;
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>('Initialisation…');
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading) {
      // Si on était en cours et que c'est terminé sans erreur, on finit à 100 %
      if (startRef.current !== null && !error) {
        setProgress(100);
        setStage('Position obtenue ✓');
        const t = setTimeout(() => {
          setProgress(0);
          setStage('Initialisation…');
          startRef.current = null;
        }, 600);
        return () => clearTimeout(t);
      }
      startRef.current = null;
      setProgress(0);
      setStage('Initialisation…');
      return;
    }

    startRef.current = performance.now();
    setProgress(2);
    setStage('Connexion au GPS…');

    const interval = setInterval(() => {
      const elapsed = performance.now() - (startRef.current ?? performance.now());
      const ratio = Math.min(elapsed / TIMEOUT_MS, 1);
      // Courbe ease-out : monte vite au début, ralentit à l'approche de 95 %
      const eased = 1 - Math.pow(1 - ratio, 2);
      const value = Math.min(95, eased * 95);
      setProgress(value);

      if (value < 25) setStage('Connexion au GPS…');
      else if (value < 55) setStage('Recherche des satellites…');
      else if (value < 80) setStage('Calcul de la position…');
      else setStage('Affinage du signal…');
    }, 120);

    return () => clearInterval(interval);
  }, [loading, error]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-lg"
      role="region"
      aria-label="Activation de la géolocalisation requise"
    >
      {/* Halo décoratif */}
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center text-center">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 mb-4"
        >
          <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
        </motion.div>

        <h2
          className="text-lg sm:text-xl font-bold text-foreground mb-2"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          {isDenied ? 'Localisation bloquée' : 'Active ta localisation'}
        </h2>

        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-5">
          {isDenied
            ? 'Tu as refusé l\'accès à ta position. Pour voir les profils autour de toi, autorise la localisation dans les paramètres de ton navigateur, puis réessaie.'
            : 'Pour découvrir les membres proches de chez toi et afficher la distance réelle, nous avons besoin d\'accéder à ta position GPS.'}
        </p>

        {/* Avantages */}
        {!isDenied && (
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-md mb-5 text-xs">
            <li className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
              <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-foreground/80 text-left">Distance exacte</span>
            </li>
            <li className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
              <ShieldCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-foreground/80 text-left">Position privée</span>
            </li>
            <li className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
              <RefreshCw className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-foreground/80 text-left">Temps réel</span>
            </li>
          </ul>
        )}

        {/* Erreur */}
        {hasError && (
          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-500/10 rounded-xl px-3 py-2.5 mb-4 max-w-md w-full">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed text-left">{error}</span>
          </div>
        )}
        {/* Barre de progression du chargement GPS */}
        <AnimatePresence>
          {(loading || progress >= 100) && !hasError && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between mb-1.5 text-[11px]">
                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <Satellite className="w-3 h-3 text-primary animate-pulse" />
                  {stage}
                </span>
                <span className="font-mono tabular-nums text-primary font-semibold">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress
                value={progress}
                className="h-1.5 bg-primary/10"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <Button
          onClick={onRequest}
          size="lg"
          disabled={loading}
          className="w-full max-w-xs h-12 gap-2 text-base font-semibold shadow-lg shadow-primary/20"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Localisation en cours…
            </>
          ) : isDenied ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              Activer ma localisation
            </>
          )}
        </Button>

        {isDenied && (
          <p className="text-[11px] text-muted-foreground mt-3 max-w-xs leading-relaxed">
            Sur mobile : Réglages → Confidentialité → Localisation → Autoriser pour ce site.
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default GeolocationGate;
