import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Play, Trash2, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AlbumMedia {
  id: string;
  media_url: string;
  media_type: string;
}

interface AlbumGalleryViewerProps {
  media: AlbumMedia[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (mediaId: string) => void;
}

interface ZoomState {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

const AlbumGalleryViewer = ({ 
  media, 
  initialIndex = 0, 
  isOpen, 
  onClose,
  onDelete 
}: AlbumGalleryViewerProps) => {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [videoPlaying, setVideoPlaying] = useState<string | null>(null);
  const [zoomState, setZoomState] = useState<ZoomState>({ scale: 1, x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Touch refs
  const lastTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const lastPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isSwiping = useRef(false);

  // Deduplicate media by id
  const uniqueMedia = media.filter((item, index, self) => 
    index === self.findIndex(m => m.id === item.id)
  );

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      const safeIndex = Math.min(initialIndex, uniqueMedia.length - 1);
      setSelectedIndex(Math.max(0, safeIndex));
      setZoomState({ scale: 1, x: 0, y: 0 });
      setImageLoaded(false);
      setVideoPlaying(null);
    }
  }, [isOpen, initialIndex, uniqueMedia.length]);

  // Reset image loaded state when switching
  useEffect(() => {
    setImageLoaded(false);
  }, [selectedIndex]);

  const goTo = useCallback((index: number) => {
    if (zoomState.scale > 1) return;
    const len = uniqueMedia.length;
    const next = ((index % len) + len) % len;
    setSelectedIndex(next);
    setZoomState({ scale: 1, x: 0, y: 0 });
    setVideoPlaying(null);
  }, [uniqueMedia.length, zoomState.scale]);

  const scrollPrev = useCallback(() => goTo(selectedIndex - 1), [goTo, selectedIndex]);
  const scrollNext = useCallback(() => goTo(selectedIndex + 1), [goTo, selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') scrollPrev();
      if (e.key === 'ArrowRight') scrollNext();
      if (e.key === 'Escape') {
        if (zoomState.scale > 1) {
          setZoomState({ scale: 1, x: 0, y: 0 });
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, scrollPrev, scrollNext, onClose, zoomState.scale]);

  // Double tap zoom
  const handleDoubleTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const currentItem = uniqueMedia[selectedIndex];
    if (currentItem?.media_type !== 'image') return;

    if (zoomState.scale > 1) {
      setZoomState({ scale: 1, x: 0, y: 0 });
    } else {
      setZoomState({ scale: 2.5, x: 0, y: 0 });
    }
  }, [zoomState.scale, selectedIndex, uniqueMedia]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
      lastPanRef.current = { x: touch.clientX, y: touch.clientY };
      isSwiping.current = false;
    }
    if (e.touches.length === 2) {
      initialPinchDistanceRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentItem = uniqueMedia[selectedIndex];
    if (!currentItem) return;

    if (e.touches.length === 2 && currentItem.media_type === 'image') {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

      if (initialPinchDistanceRef.current === null) {
        initialPinchDistanceRef.current = distance;
        initialScaleRef.current = zoomState.scale;
      } else {
        const scaleDiff = distance / initialPinchDistanceRef.current;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialScaleRef.current * scaleDiff));
        if (newScale <= 1) {
          setZoomState({ scale: 1, x: 0, y: 0 });
        } else {
          setZoomState(prev => ({ ...prev, scale: newScale }));
        }
      }
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartXRef.current;
      const deltaY = touch.clientY - touchStartYRef.current;

      if (zoomState.scale > 1) {
        // Pan when zoomed
        const panDeltaX = touch.clientX - lastPanRef.current.x;
        const panDeltaY = touch.clientY - lastPanRef.current.y;
        setZoomState(prev => ({ ...prev, x: prev.x + panDeltaX, y: prev.y + panDeltaY }));
        lastPanRef.current = { x: touch.clientX, y: touch.clientY };
      } else {
        // Track if horizontal swipe
        if (Math.abs(deltaX) > 15 && Math.abs(deltaX) > Math.abs(deltaY)) {
          isSwiping.current = true;
        }
      }
    }
  }, [zoomState, selectedIndex, uniqueMedia]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    const touch = e.changedTouches[0];

    // Double tap detection
    if (lastTouchRef.current) {
      const timeDiff = now - lastTouchRef.current.time;
      const distX = Math.abs(touch.clientX - lastTouchRef.current.x);
      const distY = Math.abs(touch.clientY - lastTouchRef.current.y);
      if (timeDiff < 300 && distX < 30 && distY < 30) {
        handleDoubleTap(e);
        lastTouchRef.current = null;
        initialPinchDistanceRef.current = null;
        return;
      }
    }
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY, time: now };

    // Swipe navigation
    if (isSwiping.current && zoomState.scale <= 1) {
      const deltaX = touch.clientX - touchStartXRef.current;
      if (Math.abs(deltaX) > 60) {
        if (deltaX > 0) scrollPrev();
        else scrollNext();
      }
    }

    initialPinchDistanceRef.current = null;
    lastPanRef.current = { x: 0, y: 0 };
    isSwiping.current = false;
  }, [handleDoubleTap, zoomState.scale, scrollPrev, scrollNext]);

  const zoomIn = useCallback(() => {
    setZoomState(prev => ({ ...prev, scale: Math.min(MAX_SCALE, prev.scale + 0.5) }));
  }, []);

  const zoomOut = useCallback(() => {
    const newScale = Math.max(MIN_SCALE, zoomState.scale - 0.5);
    if (newScale <= 1) setZoomState({ scale: 1, x: 0, y: 0 });
    else setZoomState(prev => ({ ...prev, scale: newScale }));
  }, [zoomState.scale]);

  const isZoomed = zoomState.scale > 1;
  const currentMedia = uniqueMedia[selectedIndex];

  if (!isOpen || uniqueMedia.length === 0 || !currentMedia) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black flex flex-col"
        data-protected="true"
      >
        {/* Header */}
        <div className="relative z-20 flex items-center justify-between px-3 py-3 bg-black/80">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full h-10 w-10"
          >
            <X className="w-6 h-6" />
          </Button>

          <span className="text-white text-sm font-medium">
            {selectedIndex + 1} / {uniqueMedia.length}
          </span>

          <div className="flex items-center gap-1">
            {currentMedia.media_type === 'image' && (
              <>
                <Button variant="ghost" size="icon" onClick={zoomOut} disabled={zoomState.scale <= MIN_SCALE}
                  className="text-white hover:bg-white/20 rounded-full h-9 w-9 disabled:opacity-30">
                  <ZoomOut className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={zoomIn} disabled={zoomState.scale >= MAX_SCALE}
                  className="text-white hover:bg-white/20 rounded-full h-9 w-9 disabled:opacity-30">
                  <ZoomIn className="w-5 h-5" />
                </Button>
              </>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={() => onDelete(currentMedia.id)}
                className="text-white hover:bg-destructive/80 rounded-full h-9 w-9">
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Main content area */}
        <div
          className="flex-1 relative flex items-center justify-center overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleTap}
          style={{ touchAction: isZoomed ? 'none' : 'pan-y' }}
        >
          {currentMedia.media_type === 'image' ? (
            <div className="w-full h-full flex items-center justify-center p-2">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                </div>
              )}
              <motion.img
                key={currentMedia.id}
                animate={{
                  scale: zoomState.scale,
                  x: zoomState.x,
                  y: zoomState.y,
                }}
                transition={{
                  scale: { type: 'spring', stiffness: 300, damping: 30 },
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  y: { type: 'spring', stiffness: 300, damping: 30 },
                }}
                src={currentMedia.media_url}
                alt=""
                onLoad={() => setImageLoaded(true)}
                className={cn(
                  "max-w-full max-h-full object-contain select-none",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                draggable={false}
                style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2">
              <video
                key={currentMedia.id}
                src={currentMedia.media_url}
                className="max-w-full max-h-full object-contain rounded-lg select-none"
                controls={videoPlaying === currentMedia.id}
                autoPlay={videoPlaying === currentMedia.id}
                playsInline
                onClick={(e) => { e.stopPropagation(); setVideoPlaying(prev => prev === currentMedia.id ? null : currentMedia.id); }}
                style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
              />
              {videoPlaying !== currentMedia.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); setVideoPlaying(currentMedia.id); }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center">
                    <Play className="w-8 h-8 text-white ml-1" fill="white" />
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Nav arrows (desktop) */}
          {uniqueMedia.length > 1 && !isZoomed && (
            <>
              <button onClick={scrollPrev}
                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm items-center justify-center text-white hover:bg-white/20 transition-colors">
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button onClick={scrollNext}
                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm items-center justify-center text-white hover:bg-white/20 transition-colors">
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}

          {/* Reset zoom */}
          {isZoomed && (
            <button onClick={() => setZoomState({ scale: 1, x: 0, y: 0 })}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm hover:bg-white/30 transition-colors">
              Réinitialiser le zoom
            </button>
          )}
        </div>

        {/* Thumbnails */}
        {uniqueMedia.length > 1 && !isZoomed && (
          <div className="relative z-20 px-3 py-3 bg-black/80">
            <div className="flex gap-2 justify-center overflow-x-auto scrollbar-hide">
              {uniqueMedia.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => goTo(index)}
                  className={cn(
                    "flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all duration-200 border-2",
                    selectedIndex === index
                      ? "border-white scale-110 shadow-lg"
                      : "border-transparent opacity-50 hover:opacity-80"
                  )}
                >
                  {item.media_type === 'image' ? (
                    <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full relative bg-muted">
                      <video src={item.media_url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Play className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default AlbumGalleryViewer;
