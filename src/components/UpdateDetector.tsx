import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles, AlertTriangle, Rocket } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

const CHECK_INTERVAL = 30_000; // 30s
const VERSION_URL = '/version.json';
const STORAGE_KEY = 'gc_app_version';

// Version injectée au build par le plugin Vite (vite.config.ts)
const BUILD_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

interface VersionPayload {
  version: string;
  builtAt?: string;
}

const fetchRemoteVersion = async (): Promise<string | null> => {
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data: VersionPayload = await res.json();
    return data?.version ?? null;
  } catch {
    return null;
  }
};

// Vide tous les caches (Cache API + Service Worker) avant le hard reload.
// onProgress reçoit une valeur 0..1 représentant l'avancement réel des suppressions.
const clearAllCaches = async (onProgress?: (ratio: number) => void) => {
  // 1) Cache API
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      const total = keys.length || 1;
      let done = 0;
      await Promise.all(
        keys.map(async (k) => {
          await caches.delete(k);
          done += 1;
          onProgress?.(Math.min(0.7, (done / total) * 0.7));
        }),
      );
    } else {
      onProgress?.(0.7);
    }
  } catch {
    onProgress?.(0.7);
  }

  // 2) Service workers
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      const total = regs.length || 1;
      let done = 0;
      await Promise.all(
        regs.map(async (r) => {
          await r.unregister();
          done += 1;
          onProgress?.(0.7 + Math.min(0.25, (done / total) * 0.25));
        }),
      );
    } else {
      onProgress?.(0.95);
    }
  } catch {
    onProgress?.(0.95);
  }
};

const UpdateDetector = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const localVersionRef = useRef<string>(BUILD_VERSION);

  // Initialise la version locale (priorité au localStorage si présent)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, BUILD_VERSION);
      localVersionRef.current = BUILD_VERSION;
    } else {
      localVersionRef.current = stored;
    }
  }, []);

  // Polling de la version distante
  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const remote = await fetchRemoteVersion();
      if (!mounted || !remote) return;
      // Ignore les comparaisons triviales (initial vs dev)
      if (remote === 'initial' || localVersionRef.current === 'dev') return;
      if (remote !== localVersionRef.current) {
        setUpdateAvailable(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    // Premier check après 5s pour laisser l'app se charger
    const initialTimeout = setTimeout(check, 5000);
    intervalRef.current = setInterval(check, CHECK_INTERVAL);

    return () => {
      mounted = false;
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Lock body scroll + bloque la touche Escape quand le modal est ouvert
  useEffect(() => {
    if (!updateAvailable) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const blockEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    document.addEventListener('keydown', blockEsc, true);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener('keydown', blockEsc, true);
    };
  }, [updateAvailable]);

  const performUpdate = useCallback(async () => {
    setIsUpdating(true);
    setPhase('loading');
    setProgress(0);

    try {
      // ── Étape 1/3 : récupération de la nouvelle version (0 → 15%) ──
      setProgress(5);
      const remote = await fetchRemoteVersion();
      setProgress(15);

      // ── Étape 2/3 : nettoyage caches + service workers (15 → 90%) ──
      // La progression réelle vient de clearAllCaches via onProgress (0..1)
      await clearAllCaches((ratio) => {
        // Mappe 0..1 sur la plage 15 → 90
        const mapped = 15 + Math.round(ratio * 75);
        setProgress((prev) => (mapped > prev ? mapped : prev));
      });
      setProgress(90);

      // ── Étape 3/3 : persistance de la version (90 → 100%) ──
      if (remote && remote !== 'initial') {
        localStorage.setItem(STORAGE_KEY, remote);
      }
      setProgress(100);
      setPhase('ready');

      // Hard reload avec cache-busting
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('_v', Date.now().toString());
        window.location.replace(url.toString());
      }, 600);
    } catch {
      setPhase('error');
    }
  }, []);

  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
    setIsUpdating(false);
    setPhase('idle');
    setProgress(0);
    setTimeout(() => performUpdate(), 200);
  }, [performUpdate]);

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/85 backdrop-blur-md"
          onClick={(e) => {
            // Bloque toute fermeture par clic extérieur
            e.stopPropagation();
            e.preventDefault();
          }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="update-title"
          aria-describedby="update-desc"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="w-full max-w-sm bg-card border border-primary/20 rounded-3xl shadow-[0_20px_60px_hsl(var(--primary)/0.25)] overflow-hidden"
          >
            {!isUpdating ? (
              <div className="p-6">
                <div className="flex justify-center mb-4">
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30"
                  >
                    <Rocket className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                </div>

                <h2
                  id="update-title"
                  className="text-center text-lg font-display font-bold mb-2"
                >
                  Nouvelle version disponible
                </h2>
                <p
                  id="update-desc"
                  className="text-center text-sm text-muted-foreground mb-4 leading-relaxed"
                >
                  Une mise à jour du site est disponible. Pour continuer, veuillez
                  mettre à jour la page afin d'accéder à la dernière version.
                </p>

                <div className="flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-500 bg-amber-500/10 rounded-xl px-3 py-2.5 mb-4">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    Cette mise à jour est <strong>obligatoire</strong> pour éviter les
                    bugs liés au cache.
                  </span>
                </div>

                <Button
                  onClick={performUpdate}
                  size="lg"
                  className="w-full gap-2 h-12 text-base font-semibold shadow-lg shadow-primary/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  Mettre à jour
                </Button>

                <p className="text-center text-[10px] text-muted-foreground mt-3">
                  Merci pour ta compréhension 🙏
                </p>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex flex-col items-center gap-3 mb-5">
                  <motion.div
                    animate={{
                      rotate: phase === 'loading' ? 360 : 0,
                    }}
                    transition={{
                      repeat: phase === 'loading' ? Infinity : 0,
                      duration: 1,
                      ease: 'linear',
                    }}
                    className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"
                  >
                    {phase === 'ready' ? (
                      <Sparkles className="w-7 h-7 text-primary" />
                    ) : phase === 'error' ? (
                      <AlertTriangle className="w-7 h-7 text-destructive" />
                    ) : (
                      <RefreshCw className="w-7 h-7 text-primary" />
                    )}
                  </motion.div>
                  <div className="text-center">
                    <p className="text-base font-display font-bold">
                      {phase === 'ready'
                        ? 'Mise à jour terminée !'
                        : phase === 'error'
                        ? 'Échec de la mise à jour'
                        : 'Mise à jour en cours…'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {phase === 'ready'
                        ? 'Rechargement automatique du site'
                        : phase === 'error'
                        ? 'Une erreur est survenue. Réessayez.'
                        : 'Patiente quelques secondes, ne ferme pas la page'}
                    </p>
                  </div>
                </div>

                {phase !== 'error' && (
                  <>
                    <div className="relative mb-2">
                      <Progress value={progress} className="h-3 bg-secondary/50" />
                      {phase === 'loading' && progress < 100 && (
                        <motion.div
                          className="absolute top-0 left-0 h-full w-16 rounded-full bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent"
                          animate={{ x: ['-64px', '320px'] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        />
                      )}
                    </div>
                    <p className="text-right text-xs font-display font-bold text-primary tabular-nums">
                      {progress}%
                    </p>
                  </>
                )}

                {phase === 'error' && (
                  <Button
                    onClick={handleRetry}
                    size="lg"
                    variant="default"
                    className="w-full gap-2 h-12 text-base font-semibold mt-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer {retryCount > 0 && `(${retryCount})`}
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateDetector;
