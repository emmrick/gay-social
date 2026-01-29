import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, AlertTriangle, Shield, Play } from 'lucide-react';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface EphemeralMediaViewerProps {
  isOpen: boolean;
  type: 'image' | 'video';
  src: string;
  senderName: string;
  duration?: number;
  mediaId?: string;
  onClose: () => void;
  onViewed: () => void;
}

const EphemeralMediaViewer = ({ 
  isOpen,
  type, 
  src, 
  senderName, 
  duration = 10,
  mediaId,
  onClose, 
  onViewed 
}: EphemeralMediaViewerProps) => {
  const [isViewing, setIsViewing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [hasEnded, setHasEnded] = useState(false);
  const { 
    isSuspended, 
    isBlocked, 
    preventContextMenu, 
    preventDrag, 
    getSuspensionTimeLeft,
    handleViolation 
  } = useScreenshotProtection();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setIsViewing(false);
      setTimeLeft(duration);
      setHasEnded(false);
    }
  }, [isOpen, duration]);

  // Timer countdown
  useEffect(() => {
    if (isViewing && timeLeft > 0 && !isSuspended && !hasEnded) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isViewing && timeLeft === 0 && !hasEnded) {
      setHasEnded(true);
      onViewed();
      // Small delay before closing for smoother UX
      setTimeout(() => {
        onClose();
      }, 300);
    }
  }, [isViewing, timeLeft, onClose, onViewed, isSuspended, hasEnded]);

  // Disable DevTools detection
  useEffect(() => {
    if (!isViewing || !isOpen) return;

    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        handleViolation(mediaId);
      }
    };

    const interval = setInterval(detectDevTools, 1000);
    return () => clearInterval(interval);
  }, [isViewing, handleViolation, mediaId, isOpen]);

  // Prevent copy operations
  useEffect(() => {
    if (!isViewing || !isOpen) return;

    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      handleViolation(mediaId);
    };

    const preventKeyShortcuts = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (['c', 's', 'p', 'a'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          handleViolation(mediaId);
        }
      }
      // Also prevent PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        handleViolation(mediaId);
      }
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('keydown', preventKeyShortcuts);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('keydown', preventKeyShortcuts);
    };
  }, [isViewing, handleViolation, mediaId, isOpen]);

  // Visibility change detection (switching apps on mobile)
  useEffect(() => {
    if (!isViewing || !isOpen) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched to another app - potential screenshot
        handleViolation(mediaId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isViewing, handleViolation, mediaId, isOpen]);

  const handleStartViewing = () => {
    if (isSuspended) return;
    setIsViewing(true);
    if (type === 'video' && videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleCloseClick = useCallback(() => {
    if (isViewing && !hasEnded) {
      onViewed();
    }
    setIsViewing(false);
    setHasEnded(false);
    onClose();
  }, [isViewing, hasEnded, onViewed, onClose]);

  if (!isOpen) return null;

  // Suspended state
  if (isSuspended) {
    return (
      <Dialog open={isOpen} onOpenChange={handleCloseClick}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogTitle className="sr-only">Compte suspendu</DialogTitle>
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Compte suspendu</h2>
            <p className="text-muted-foreground mb-4">
              Vous avez été suspendu pour violation des règles (capture d'écran).
            </p>
            <p className="text-lg font-semibold text-foreground mb-6">
              Temps restant : {getSuspensionTimeLeft()}
            </p>
            <Button variant="outline" onClick={handleCloseClick}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black"
      >
        {/* Pre-viewing state (tap to view) */}
        {!isViewing && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-background/95 backdrop-blur-lg flex items-center justify-center p-4"
          >
            <div className="glass-card rounded-2xl p-8 max-w-sm text-center w-full">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6">
                {type === 'image' ? (
                  <Eye className="w-10 h-10 text-white" />
                ) : (
                  <Play className="w-10 h-10 text-white" />
                )}
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">
                {senderName} t'a envoyé {type === 'image' ? 'une photo' : 'une vidéo'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Contenu éphémère • Disparaît après {duration}s
              </p>
              <div className="space-y-3">
                <Button variant="hero" size="lg" className="w-full" onClick={handleStartViewing}>
                  <Eye className="w-5 h-5" />
                  Voir maintenant
                </Button>
                <Button variant="outline" size="lg" className="w-full" onClick={handleCloseClick}>
                  Plus tard
                </Button>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive font-medium flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" />
                  Capture d'écran = Suspension immédiate
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Viewing state with protection */}
        {isViewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            ref={containerRef}
            className="absolute inset-0 bg-black flex items-center justify-center select-none"
            onContextMenu={preventContextMenu}
            style={{ 
              userSelect: 'none', 
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
            }}
          >
            {/* Timer bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-muted z-10">
              <motion.div 
                className="h-full bg-gradient-to-r from-primary to-accent"
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / duration) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
            
            {/* Header */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                  {senderName.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-white">{senderName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-mono text-lg bg-black/30 px-3 py-1 rounded-full">{timeLeft}s</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleCloseClick} 
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </div>
            
            {/* Media content - protected */}
            <div 
              className="max-w-full max-h-full p-16 pointer-events-none relative"
              style={{ 
                filter: isBlocked ? 'brightness(0)' : 'none',
                transition: 'filter 0.1s ease',
              }}
            >
              {type === 'image' ? (
                <img 
                  src={src} 
                  alt="Ephemeral content" 
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  draggable={false}
                />
              ) : (
                <video 
                  ref={videoRef}
                  src={src} 
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  controls={false}
                  autoPlay
                  playsInline
                  muted={false}
                />
              )}
            </div>

            {/* Black overlay when screenshot detected */}
            <AnimatePresence>
              {isBlocked && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black z-20 flex items-center justify-center"
                >
                  <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
                    <p className="text-destructive text-xl font-bold">
                      Capture détectée !
                    </p>
                    <p className="text-destructive/80 text-sm mt-2">
                      Votre compte a été suspendu
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Warning overlay */}
            <div className="absolute bottom-8 left-0 right-0 text-center z-10">
              <p className="text-white/60 text-sm flex items-center justify-center gap-2">
                <EyeOff className="w-4 h-4" />
                Capture d'écran = Suspension immédiate
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default EphemeralMediaViewer;
