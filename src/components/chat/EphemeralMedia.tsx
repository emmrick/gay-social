import { useState, useEffect, useRef } from 'react';
import { X, Play, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { Button } from '@/components/ui/button';

interface EphemeralMediaProps {
  type: 'image' | 'video';
  src: string;
  senderName: string;
  duration?: number; // View duration in seconds
  onClose: () => void;
  onViewed: () => void;
}

const EphemeralMedia = ({ 
  type, 
  src, 
  senderName, 
  duration = 10,
  onClose, 
  onViewed 
}: EphemeralMediaProps) => {
  const [isViewing, setIsViewing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isBlocked, setIsBlocked] = useState(false);
  const { isSuspended, preventContextMenu, getSuspensionTimeLeft } = useScreenshotProtection();
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const handleStartViewing = () => {
    if (isSuspended) return;
    setIsViewing(true);
    if (type === 'video' && videoRef.current) {
      videoRef.current.play();
    }
  };

  if (isSuspended) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center">
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
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    );
  }

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
          <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
            <EyeOff className="w-3 h-3" />
            Captures d'écran interdites
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none"
      onContextMenu={preventContextMenu}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Timer bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
        <div 
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / duration) * 100}%` }}
        />
      </div>
      
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
            {senderName.charAt(0)}
          </div>
          <span className="font-medium text-white">{senderName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white font-mono text-lg">{timeLeft}s</span>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>
      
      {/* Media content - protected */}
      <div 
        className="max-w-full max-h-full p-16 pointer-events-none"
        style={{ 
          filter: isBlocked ? 'blur(50px) brightness(0)' : 'none',
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
          />
        )}
      </div>
      
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
