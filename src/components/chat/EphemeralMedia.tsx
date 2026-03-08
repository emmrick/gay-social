import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Eye, EyeOff, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface EphemeralMediaProps {
  type: 'image' | 'video';
  src: string;
  senderName: string;
  duration?: number;
  mediaId?: string;
  onClose: () => void;
  onViewed: () => void;
}

const EphemeralMedia = ({ 
  type, 
  src, 
  senderName, 
  duration = 10,
  mediaId,
  onClose, 
  onViewed 
}: EphemeralMediaProps) => {
  const [isViewing, setIsViewing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Timer countdown
  useEffect(() => {
    if (isViewing && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isViewing && timeLeft === 0) {
      onViewed();
      onClose();
    }
  }, [isViewing, timeLeft, onClose, onViewed]);

  // Disable DevTools detection
  useEffect(() => {
    if (!isViewing) return;

    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        handleViolation();
      }
    };

    // Check periodically while viewing
    const interval = setInterval(detectDevTools, 1000);
    
    return () => clearInterval(interval);
  }, [isViewing, handleViolation]);

  // Prevent copy operations
  useEffect(() => {
    if (!isViewing) return;

    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      handleViolation();
    };

    const preventKeyShortcuts = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+S, Ctrl+P, etc.
      if (e.ctrlKey || e.metaKey) {
        if (['c', 's', 'p', 'a'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          handleViolation();
        }
      }
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('keydown', preventKeyShortcuts);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('keydown', preventKeyShortcuts);
    };
  }, [isViewing, handleViolation]);

  const handleStartViewing = () => {
    setIsViewing(true);
    if (type === 'video' && videoRef.current) {
      videoRef.current.play();
    }
  };

  // Pre-viewing state (tap to view)
  if (!isViewing) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-sm text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6">
            {type === 'image' ? (
              <Eye className="w-10 h-10 text-white" />
            ) : (
              <Play className="w-10 h-10 text-white" />
            )}
          </div>
          <h3 className="font-display text-lg font-semibold mb-2">
            {senderName} vous a envoyé {type === 'image' ? 'une photo' : 'une vidéo'}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Contenu éphémère • Disparaît après {duration}s
          </p>
          <div className="space-y-3">
            <Button variant="hero" size="lg" className="w-full" onClick={handleStartViewing}>
              <Eye className="w-5 h-5" />
              Voir maintenant
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onClose}>
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
      </div>
    );
  }

  // Viewing state with protection
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none"
      onContextMenu={preventContextMenu}
      onDragStart={preventDrag}
      style={{ 
        userSelect: 'none', 
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {/* Timer bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
        <div 
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / duration) * 100}%` }}
        />
      </div>
      
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
            {senderName.charAt(0)}
          </div>
          <span className="font-medium text-white">{senderName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white font-mono text-lg">{timeLeft}s</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              onViewed();
              onClose();
            }} 
            className="text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>
      
      {/* Media content - protected */}
      <div 
        className="max-w-full max-h-full p-16 pointer-events-none relative"
        style={{ 
          // Content goes BLACK immediately on screenshot attempt
          filter: isBlocked ? 'brightness(0)' : 'none',
          transition: 'filter 0.1s ease',
        }}
      >
        {/* Invisible watermark overlay for tracking */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-0"
          style={{
            background: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(255,255,255,0.01) 10px,
              rgba(255,255,255,0.01) 20px
            )`,
          }}
        />
        
        {type === 'image' ? (
          <img 
            src={src} 
            alt="Ephemeral content" 
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
            draggable={false}
            onError={(e) => {
              console.error('Error loading image');
            }}
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
      {isBlocked && (
        <div className="absolute inset-0 bg-black z-20 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <p className="text-white text-xl font-bold">Contenu protégé</p>
          </div>
        </div>
      )}
      
      {/* Warning overlay */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white/60 text-sm flex items-center justify-center gap-2">
          <EyeOff className="w-4 h-4" />
          Capture d'écran = Suspension immédiate
        </p>
      </div>
    </div>
  );
};

export default EphemeralMedia;
