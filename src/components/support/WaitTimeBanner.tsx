import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Loader2, AlertTriangle, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface WaitTimeBannerProps {
  estimatedMinutes: number | null;
  position: number;
  onlineModerators: number;
  found: boolean;
  isLoading: boolean;
  waitStartTime: number | null;
}

const WaitTimeBanner = ({
  estimatedMinutes,
  position,
  onlineModerators,
  found,
  isLoading,
  waitStartTime,
}: WaitTimeBannerProps) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live elapsed time counter
  useEffect(() => {
    if (!waitStartTime) return;
    const update = () => setElapsedSeconds(Math.floor((Date.now() - waitStartTime) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [waitStartTime]);

  const elapsedMin = Math.floor(elapsedSeconds / 60);
  const elapsedSec = elapsedSeconds % 60;
  const elapsedLabel = elapsedMin > 0
    ? `${elapsedMin}min ${elapsedSec.toString().padStart(2, '0')}s`
    : `${elapsedSec}s`;

  // Progress bar: estimated total in seconds vs elapsed
  const estimatedTotalSec = estimatedMinutes ? estimatedMinutes * 60 : null;
  const progressPercent = estimatedTotalSec
    ? Math.min((elapsedSeconds / estimatedTotalSec) * 100, 95)
    : null;

  const isNoAgent = onlineModerators === 0 && found;
  const isHighWait = estimatedMinutes !== null && estimatedMinutes > 10;

  if (isLoading && !found) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs mb-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Connexion à la file d'attente...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 space-y-2"
    >
      {/* Main wait card */}
      <div className={cn(
        "rounded-xl border p-3 space-y-2.5",
        isNoAgent
          ? "bg-destructive/5 border-destructive/20"
          : isHighWait
          ? "bg-amber-500/5 border-amber-500/20"
          : "bg-primary/5 border-primary/20"
      )}>
        {/* Status line */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className={cn(
              "w-3.5 h-3.5 animate-spin",
              isNoAgent ? "text-destructive" : "text-primary"
            )} />
            <span className="text-xs font-medium text-foreground">
              {isNoAgent
                ? "Aucun conseiller disponible"
                : `Position dans la file : n°${position}`
              }
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{onlineModerators} en ligne</span>
          </div>
        </div>

        {/* Wait time display */}
        {isNoAgent ? (
          <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-destructive/10 text-destructive">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Aucun conseiller disponible pour le moment. Votre demande reste en file d'attente.</span>
          </div>
        ) : (
          <>
            <div className={cn(
              "flex items-center justify-between gap-2 text-xs rounded-lg px-3 py-2",
              isHighWait ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-primary/10 text-primary"
            )}>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  Temps d'attente estimé : <strong>~{estimatedMinutes} min</strong>
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{elapsedLabel}</span>
            </div>

            {isHighWait && (
              <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>Temps d'attente plus long que prévu, merci de votre patience</span>
              </div>
            )}

            {/* Progress bar */}
            {progressPercent !== null && (
              <Progress value={progressPercent} className="h-1.5" />
            )}
          </>
        )}

        {/* Persistence notice */}
        <p className="text-[10px] text-muted-foreground text-center leading-tight">
          Votre place est conservée même si vous quittez cette page.
        </p>
      </div>
    </motion.div>
  );
};

export default WaitTimeBanner;
