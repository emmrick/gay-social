import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, AlertTriangle, Shield, Play } from 'lucide-react';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { Button } from '@/components/ui/button';

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
  const [isClosing, setIsClosing] = useState(false);
  const { 
    isSuspended, 
    isBlocked, 
    preventContextMenu, 
    getSuspensionTimeLeft,
    handleViolation 
  } = useScreenshotProtection();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCalledOnViewed = useRef(false);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setIsViewing(false);
      setTimeLeft(duration);
      setHasEnded(false);
      setIsClosing(false);
      hasCalledOnViewed.current = false;
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
      if (!hasCalledOnViewed.current) {
        hasCalledOnViewed.current = true;
        onViewed();
      }
      // Smooth close animation
      setIsClosing(true);
      setTimeout(() => {
        onClose();
      }, 400);
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
        handleViolation(mediaId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isViewing, handleViolation, mediaId, isOpen]);

  const handleStartViewing = useCallback(() => {
    if (isSuspended) return;
    setIsViewing(true);
    if (type === 'video' && videoRef.current) {
      videoRef.current.play();
    }
  }, [isSuspended, type]);

  const handleCloseClick = useCallback(() => {
    if (isViewing && !hasEnded && !hasCalledOnViewed.current) {
      hasCalledOnViewed.current = true;
      onViewed();
    }
    setIsClosing(true);
    setTimeout(() => {
      setIsViewing(false);
      setHasEnded(false);
      setIsClosing(false);
      onClose();
    }, 300);
  }, [isViewing, hasEnded, onViewed, onClose]);

  // Suspended state
  if (isSuspended && isOpen) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-border"
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-3 text-foreground">Compte suspendu</h2>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                Vous avez été suspendu pour violation des règles (capture d'écran).
              </p>
              <div className="bg-destructive/10 rounded-2xl p-4 mb-6">
                <p className="text-lg font-bold text-foreground">
                  {getSuspensionTimeLeft()}
                </p>
                <p className="text-xs text-muted-foreground">Temps restant</p>
              </div>
              <Button variant="outline" onClick={handleCloseClick} className="w-full">
                Fermer
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="ephemeral-viewer"
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] bg-black"
      >
        {/* Pre-viewing state (tap to view) */}
        <AnimatePresence mode="wait">
          {!isViewing && (
            <motion.div 
              key="preview-prompt"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-6"
            >
              {/* Close button */}
              <button 
                onClick={handleCloseClick}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-muted/50 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="bg-card/80 backdrop-blur-xl rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-border/50"
              >
                {/* Icon */}
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center mb-6 shadow-lg shadow-primary/30"
                >
                  {type === 'image' ? (
                    <Eye className="w-12 h-12 text-primary-foreground" />
                  ) : (
                    <Play className="w-12 h-12 text-primary-foreground ml-1" />
                  )}
                </motion.div>

                {/* Sender avatar */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-foreground font-bold text-lg">
                    {senderName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-foreground">{senderName}</span>
                </div>

                <h3 className="font-display text-xl font-semibold mb-2 text-foreground">
                  {type === 'image' ? 'Photo éphémère' : 'Vidéo éphémère'}
                </h3>
                <p className="text-sm text-muted-foreground mb-8">
                  Disparaît après <span className="font-semibold text-foreground">{duration} secondes</span>
                </p>

                {/* Actions */}
                <div className="space-y-3">
                  <Button 
                    variant="default" 
                    size="lg" 
                    className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                    onClick={handleStartViewing}
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    Voir maintenant
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="lg" 
                    className="w-full h-12 text-muted-foreground hover:text-foreground rounded-2xl" 
                    onClick={handleCloseClick}
                  >
                    Plus tard
                  </Button>
                </div>

                {/* Security warning */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 py-3 px-4 rounded-xl bg-destructive/10 border border-destructive/20"
                >
                  <p className="text-xs text-destructive font-medium flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" />
                    Capture d'écran = Suspension
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viewing state with protection */}
        <AnimatePresence>
          {isViewing && (
            <motion.div
              key="viewing-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: isClosing ? 0 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              ref={containerRef}
              className="absolute inset-0 bg-black flex items-center justify-center select-none"
              onContextMenu={preventContextMenu}
              style={{ 
                userSelect: 'none', 
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
              }}
            >
              {/* Elegant timer bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/10 z-10">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary via-accent to-primary"
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / duration) * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </div>
              
              {/* Header with glassmorphism */}
              <div className="absolute top-0 left-0 right-0 pt-6 pb-4 px-6 z-10 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-white block">{senderName}</span>
                      <span className="text-white/60 text-xs">Contenu éphémère</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Timer display */}
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                      <span className="text-white font-mono text-lg font-bold">{timeLeft}s</span>
                    </div>
                    {/* Close button */}
                    <button 
                      onClick={handleCloseClick} 
                      className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Media content - protected */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="max-w-full max-h-full p-4 sm:p-8 pointer-events-none relative"
                style={{ 
                  filter: isBlocked ? 'brightness(0)' : 'none',
                  transition: 'filter 0.1s ease',
                }}
              >
                {type === 'image' ? (
                  <img 
                    src={src} 
                    alt="Ephemeral content" 
                    className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                    draggable={false}
                  />
                ) : (
                  <video 
                    ref={videoRef}
                    src={src} 
                    className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                    controls={false}
                    autoPlay
                    playsInline
                    muted={false}
                  />
                )}
              </motion.div>

              {/* Black overlay when screenshot detected */}
              <AnimatePresence>
                {isBlocked && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black z-20 flex items-center justify-center"
                  >
                    <motion.div 
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="text-center"
                    >
                      <div className="w-24 h-24 mx-auto rounded-full bg-destructive/30 flex items-center justify-center mb-6">
                        <AlertTriangle className="w-12 h-12 text-destructive" />
                      </div>
                      <p className="text-destructive text-2xl font-bold mb-2">
                        Capture détectée !
                      </p>
                      <p className="text-destructive/70 text-sm">
                        Votre compte a été suspendu
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Footer warning */}
              <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16 px-6 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <p className="text-white/50 text-sm flex items-center justify-center gap-2">
                  <EyeOff className="w-4 h-4" />
                  Protection anti-capture activée
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default EphemeralMediaViewer;
