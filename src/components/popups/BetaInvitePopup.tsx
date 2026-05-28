import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Beaker, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';

const SESSION_KEY = 'beta_invite_popup_seen';

const BetaInvitePopup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Ne pas afficher sur la page bêta elle-même ni dans l'admin
    if (location.pathname.startsWith('/beta') || location.pathname.startsWith('/admin')) return;
    let seen = false;
    try { seen = sessionStorage.getItem(SESSION_KEY) === 'true'; } catch { /* noop */ }
    if (seen) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch { /* noop */ }
    setOpen(false);
  };

  const handleInterested = () => {
    dismiss();
    navigate('/beta');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-sm w-[calc(100%-2.5rem)] mx-auto p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden rounded-3xl">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className="relative rounded-3xl border border-border bg-card overflow-hidden shadow-2xl"
        >
          <div className="relative h-28 bg-gradient-to-br from-primary via-fuchsia-500/80 to-amber-500/80 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.18),transparent_60%)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-background/20 backdrop-blur-sm flex items-center justify-center">
                <Beaker className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-background/30 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-3">
            <div className="flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">Bêta fermée</span>
            </div>
            <h3 className="text-lg font-bold text-foreground text-center leading-snug">
              Rejoignez la bêta de Gay Social 📱
            </h3>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Notre application officielle est en test fermé sur Android. Participez, soutenez le projet
              et débloquez <span className="font-semibold text-foreground">1000 crédits offerts</span> + <span className="font-semibold text-foreground">-50 % pendant 5 ans</span>.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <Button onClick={handleInterested} className="w-full gap-2">
                <Beaker className="w-4 h-4" />
                Je suis intéressé
              </Button>
              <Button variant="ghost" size="sm" onClick={dismiss} className="text-xs text-muted-foreground">
                Plus tard
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default BetaInvitePopup;
