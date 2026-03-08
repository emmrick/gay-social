import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Gift, Megaphone, Sparkles, X, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap: Record<string, React.ElementType> = {
  gift: Gift,
  megaphone: Megaphone,
  sparkles: Sparkles,
};

interface AdminPopup {
  id: string;
  title: string;
  message: string;
  popup_type: string;
  icon: string;
  button_text: string;
  button_action: string | null;
  is_active: boolean;
}

const PromoPopup = () => {
  const { user } = useAuth();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Load session-dismissed popups from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('dismissed_popups');
    if (stored) {
      try {
        setDismissedIds(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const { data: popups } = useQuery({
    queryKey: ['active-popups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_popups')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AdminPopup[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const visiblePopups = popups?.filter(p => !dismissedIds.includes(p.id)) || [];
  const currentPopup = visiblePopups[currentIndex];

  const dismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    sessionStorage.setItem('dismissed_popups', JSON.stringify(updated));
    setCurrentIndex(0);
  };

  if (!currentPopup) return null;

  const Icon = iconMap[currentPopup.icon] || Gift;

  const handleAction = () => {
    if (currentPopup.button_action) {
      window.open(currentPopup.button_action, '_blank');
    }
    dismiss(currentPopup.id);
  };

  return (
    <Dialog open={!!currentPopup} onOpenChange={(open) => { if (!open) dismiss(currentPopup.id); }}>
      <DialogContent className="sm:max-w-sm w-[calc(100%-2.5rem)] mx-auto p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden rounded-3xl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative rounded-3xl border border-border bg-card overflow-hidden shadow-2xl"
        >
          {/* Decorative gradient header */}
          <div className="relative h-32 bg-gradient-to-br from-primary via-primary/80 to-accent overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center">
                <Icon className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            {/* Close button */}
            <button
              onClick={() => dismiss(currentPopup.id)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-background/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Counter */}
            {visiblePopups.length > 1 && (
              <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-background/20 backdrop-blur-sm text-xs text-primary-foreground">
                {currentIndex + 1}/{visiblePopups.length}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-foreground">{currentPopup.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {currentPopup.message}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleAction} className="w-full gap-2">
                {currentPopup.button_action && <ExternalLink className="w-4 h-4" />}
                {currentPopup.button_text || 'OK'}
              </Button>
              {visiblePopups.length > 1 && currentIndex < visiblePopups.length - 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { dismiss(currentPopup.id); setCurrentIndex(0); }}
                  className="text-xs text-muted-foreground"
                >
                  Suivant
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default PromoPopup;
