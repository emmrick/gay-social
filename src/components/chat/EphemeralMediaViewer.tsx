import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Eye, EyeOff, AlertTriangle, Shield, Play, Download, Infinity as InfinityIcon, Check, Send, RotateCcw } from 'lucide-react';
import GayConnectWatermark from '@/components/security/GayConnectWatermark';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EphemeralMediaViewerProps {
  isOpen: boolean;
  type: 'image' | 'video';
  src: string;
  senderName: string;
  duration?: number; // 0 = unlimited
  mediaId?: string;
  autoStart?: boolean; // Skip pre-view screen and start immediately
  totalItems?: number; // Total media items in sequence
  currentItemIndex?: number; // Current item index in sequence
  onClose: () => void;
  onViewed: () => void;
  onSaveToConversation?: () => Promise<void>;
  canReplay?: boolean;
  onReplay?: () => void;
  onSwipeReply?: () => void;
  onScreenshotDetected?: () => void;
}

// Circular timer component (Snapchat style)
const CircularTimer = ({ timeLeft, duration }: { timeLeft: number; duration: number }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / duration) * circumference;

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
        <circle
          cx="28" cy="28" r={radius}
          fill="none"
          stroke="url(#timerGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-linear"
        />
        <defs>
          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-white font-bold text-lg z-10">{timeLeft}</span>
    </div>
  );
};

const EphemeralMediaViewer = ({ 
  isOpen,
  type, 
  src, 
  senderName, 
  duration = 10,
  mediaId,
  autoStart = false,
  onClose, 
  onViewed,
  onSaveToConversation,
  canReplay = false,
  onReplay,
  onSwipeReply,
  onScreenshotDetected,
  totalItems,
  currentItemIndex,
}: EphemeralMediaViewerProps) => {
  const isUnlimited = duration === 0;
  const [isViewing, setIsViewing] = useState(autoStart);
  const [timeLeft, setTimeLeft] = useState(isUnlimited ? -1 : duration);
  const [hasEnded, setHasEnded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [showReplyHint, setShowReplyHint] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCalledOnViewed = useRef(false);
  const hasNotifiedScreenshot = useRef(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Wrap violation handler to also notify sender
  const handleViolation = useCallback(() => {
    if (onScreenshotDetected && !hasNotifiedScreenshot.current) {
      hasNotifiedScreenshot.current = true;
      onScreenshotDetected();
    }
  }, [onScreenshotDetected]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setIsViewing(autoStart);
      setTimeLeft(isUnlimited ? -1 : duration);
      setHasEnded(false);
      setIsClosing(false);
      setIsPaused(false);
      setIsSaving(false);
      setHasSaved(false);
      setShowReplyHint(false);
      setProgressFraction(0);
      pausedAtRef.current = 0;
      hasCalledOnViewed.current = false;
      hasNotifiedScreenshot.current = false;
      if (autoStart && type === 'video' && videoRef.current) {
        videoRef.current.play();
      }
    }
  }, [isOpen, duration, isUnlimited, autoStart, type]);

  // Continuous progress tracking for smooth bar animation
  const [progressFraction, setProgressFraction] = useState(0);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Timer countdown using requestAnimationFrame for smooth progress
  useEffect(() => {
    if (isUnlimited || !isViewing || hasEnded) return;

    if (isPaused) {
      // Store how much time has elapsed when pausing
      pausedAtRef.current = progressFraction * duration;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    // Start/resume timing
    startTimeRef.current = performance.now() - (pausedAtRef.current * 1000);

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const fraction = Math.min(elapsed / duration, 1);
      setProgressFraction(fraction);
      setTimeLeft(Math.max(0, Math.ceil(duration - elapsed)));

      if (fraction >= 1) {
        setHasEnded(true);
        if (!hasCalledOnViewed.current) {
          hasCalledOnViewed.current = true;
          onViewed();
        }
        setIsClosing(true);
        setTimeout(() => onClose(), 400);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isViewing, hasEnded, isUnlimited, isPaused, duration, onClose, onViewed]);

  // Hold to pause (long press) / Tap to advance
  const wasLongPress = useRef(false);

  const handlePointerDown = useCallback(() => {
    wasLongPress.current = false;
    holdTimerRef.current = setTimeout(() => {
      wasLongPress.current = true;
      setIsPaused(true);
      if (type === 'video' && videoRef.current) {
        videoRef.current.pause();
      }
    }, 200);
  }, [type]);

  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isPaused) {
      setIsPaused(false);
      if (type === 'video' && videoRef.current) {
        videoRef.current.play();
      }
    } else if (!wasLongPress.current) {
      // Tap detected → advance to next media
      if (!hasCalledOnViewed.current) {
        hasCalledOnViewed.current = true;
        onViewed();
      }
      setIsClosing(true);
      setTimeout(() => onClose(), 200);
    }
  }, [isPaused, type, onViewed, onClose]);

  // Swipe up to reply
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y < -100 && onSwipeReply) {
      onSwipeReply();
      handleCloseClick();
    }
  }, [onSwipeReply]);

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    setShowReplyHint(info.offset.y < -40);
  }, []);

  const handleSaveToConversation = useCallback(async () => {
    if (!onSaveToConversation || isSaving || hasSaved) return;
    setIsSaving(true);
    try {
      await onSaveToConversation();
      setHasSaved(true);
      toast.success('Média enregistré dans la conversation !');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  }, [onSaveToConversation, isSaving, hasSaved]);

  // DevTools detection
  useEffect(() => {
    if (!isViewing || !isOpen) return;
    const detectDevTools = () => {
      const threshold = 160;
      if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
        handleViolation();
      }
    };
    const interval = setInterval(detectDevTools, 1000);
    return () => clearInterval(interval);
  }, [isViewing, handleViolation, isOpen]);

  // Prevent copy operations
  useEffect(() => {
    if (!isViewing || !isOpen) return;
    const preventCopy = (e: ClipboardEvent) => { e.preventDefault(); handleViolation(); };
    const preventKeyShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 's', 'p', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault(); handleViolation();
      }
      if (e.key === 'PrintScreen') { e.preventDefault(); handleViolation(); }
    };
    document.addEventListener('copy', preventCopy);
    document.addEventListener('keydown', preventKeyShortcuts);
    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('keydown', preventKeyShortcuts);
    };
  }, [isViewing, handleViolation, isOpen]);

  // Visibility change
  useEffect(() => {
    if (!isViewing || !isOpen) return;
    const handleVisibilityChange = () => { if (document.hidden) handleViolation(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isViewing, handleViolation, isOpen]);

  const handleStartViewing = useCallback(() => {
    setIsViewing(true);
    if (type === 'video' && videoRef.current) videoRef.current.play();
  }, [type]);

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
        {/* Pre-viewing state */}
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
              <button 
                onClick={handleCloseClick}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-muted/50 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="bg-card/80 backdrop-blur-xl rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-border/50"
              >
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

                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-foreground font-bold text-lg">
                    {senderName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-foreground">{senderName}</span>
                </div>

                <h3 className="font-display text-xl font-semibold mb-2 text-foreground">
                  {type === 'image' ? 'Photo' : 'Vidéo'} {isUnlimited ? 'partagée' : 'éphémère'}
                </h3>
                <p className="text-sm text-muted-foreground mb-8">
                  {isUnlimited ? (
                    <span className="flex items-center justify-center gap-1">
                      <InfinityIcon className="w-4 h-4" />
                      Visible en illimité • <span className="text-green-500 font-medium">Enregistrable</span>
                    </span>
                  ) : (
                    <>Disparaît après <span className="font-semibold text-foreground">{duration}s</span> • Maintenez pour pause</>
                  )}
                </p>

                <div className="space-y-3">
                  <Button 
                    variant="default" 
                    size="lg" 
                    className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                    onClick={handleStartViewing}
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    {canReplay ? 'Revoir (1 replay)' : 'Voir maintenant'}
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

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className={`mt-6 py-3 px-4 rounded-xl ${
                    isUnlimited 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-destructive/10 border border-destructive/20'
                  }`}
                >
                  <p className={`text-xs font-medium flex items-center justify-center gap-2 ${
                    isUnlimited ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                  }`}>
                    {isUnlimited ? (
                      <><Download className="w-4 h-4" />Tu pourras enregistrer ce média</>
                    ) : (
                      <><Shield className="w-4 h-4" />Capture d'écran = Suspension</>
                    )}
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Full-screen immersive viewing */}
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
              
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ 
                userSelect: 'none', 
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
              }}
            >
              {/* Story-style segmented progress bar - smooth continuous */}
              {!isUnlimited && (
                <div className="absolute top-2 left-3 right-3 z-20 flex gap-1">
                  {totalItems && totalItems > 1 ? (
                    Array.from({ length: totalItems }, (_, i) => (
                      <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/20">
                        <div 
                          className="h-full bg-white rounded-full"
                          style={{ 
                            width: i < (currentItemIndex ?? 0) ? '100%' 
                              : i === (currentItemIndex ?? 0) ? `${progressFraction * 100}%` 
                              : '0%',
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/20">
                      <div 
                        className="h-full bg-white rounded-full"
                        style={{ width: `${progressFraction * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* Header */}
              <div className="absolute top-4 left-0 right-0 pt-4 pb-4 px-4 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-lg">
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-white text-sm block">{senderName}</span>
                      <span className="text-white/50 text-xs">
                        {isPaused ? '⏸ En pause' : isUnlimited ? 'Média partagé' : 'Éphémère'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Infinity badge for unlimited */}
                    {isUnlimited && (
                      <div className="bg-green-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-green-500/30">
                        <span className="text-green-400 font-medium text-xs flex items-center gap-1">
                          <InfinityIcon className="w-3.5 h-3.5" />
                          Illimité
                        </span>
                      </div>
                    )}
                    <button 
                      onClick={handleCloseClick} 
                      className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Media content - swipeable for reply */}
              <motion.div 
                drag={onSwipeReply ? "y" : false}
                dragConstraints={{ top: -200, bottom: 0 }}
                dragElastic={0.3}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: isPaused ? 1.02 : 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex items-center justify-center pointer-events-auto"
                style={{}}
              >
                {type === 'image' ? (
                  <div className="relative w-full h-full">
                    <img 
                      src={src} 
                      alt="Ephemeral content" 
                      className="w-full h-full object-contain"
                      draggable={false}
                      style={{ pointerEvents: 'none' }}
                    />
                    <GayConnectWatermark />
                  </div>
                ) : (
                  <video 
                    ref={videoRef}
                    src={src} 
                    className="w-full h-full object-contain"
                    controls={false}
                    autoPlay
                    playsInline
                    muted={false}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
              </motion.div>

              {/* Pause indicator */}
              <AnimatePresence>
                {isPaused && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                  >
                    <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-8 bg-white rounded-sm" />
                        <div className="w-2.5 h-8 bg-white rounded-sm" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>


              {/* Swipe up reply hint */}
              <AnimatePresence>
                {showReplyHint && onSwipeReply && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-24 left-0 right-0 flex justify-center z-10 pointer-events-none"
                  >
                    <div className="bg-white/20 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2">
                      <Send className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">Relâcher pour répondre</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16 px-6 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                {isUnlimited && onSaveToConversation ? (
                  <div className="flex flex-col items-center gap-3">
                    <Button
                      onClick={handleSaveToConversation}
                      disabled={isSaving || hasSaved}
                      className={`${
                        hasSaved 
                          ? 'bg-green-500 hover:bg-green-500' 
                          : 'bg-white/20 hover:bg-white/30 backdrop-blur-md'
                      } text-white border border-white/20 rounded-full px-6`}
                    >
                      {hasSaved ? (
                        <><Check className="w-4 h-4 mr-2" />Enregistré</>
                      ) : isSaving ? (
                        <><Download className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</>
                      ) : (
                        <><Download className="w-4 h-4 mr-2" />Enregistrer dans la conversation</>
                      )}
                    </Button>
                  </div>
                ) : canReplay && onReplay ? (
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      onClick={onReplay}
                      variant="ghost"
                      className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Replay disponible (1x)
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    {onSwipeReply && (
                      <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="flex flex-col items-center text-white/40"
                      >
                        <Send className="w-5 h-5 rotate-[-90deg] mb-1" />
                        <span className="text-xs">Glisser pour répondre</span>
                      </motion.div>
                    )}
                    <p className="text-white/40 text-xs flex items-center justify-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5" />
                      Protection anti-capture
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default EphemeralMediaViewer;
