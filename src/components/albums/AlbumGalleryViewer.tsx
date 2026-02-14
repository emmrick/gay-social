import { useState, useCallback, useEffect, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Play, Pause, Trash2, ZoomIn, ZoomOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import ScreenshotProtectionOverlay from '@/components/security/ScreenshotProtectionOverlay';

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
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    startIndex: initialIndex,
    dragFree: false,
    containScroll: 'trimSnaps',
    watchDrag: (_, event) => {
      // Disable carousel drag when zoomed
      return zoomState.scale <= 1;
    },
  });
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [videoPlaying, setVideoPlaying] = useState<string | null>(null);
  const [zoomState, setZoomState] = useState<ZoomState>({ scale: 1, x: 0, y: 0 });
  
  // Screenshot protection with mobile detection + preventive blur
  const {
    isBlocked,
    preventContextMenu,
    enableProtection,
    disableProtection,
  } = useScreenshotProtection(true); // Enable native blocking on Capacitor
  
  // Touch/gesture refs
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const lastPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Enable/disable protection based on viewer state
  useEffect(() => {
    if (isOpen) {
      enableProtection();
    } else {
      disableProtection();
    }
    
    return () => {
      disableProtection();
    };
  }, [isOpen, enableProtection, disableProtection]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const newIndex = emblaApi.selectedScrollSnap();
    setSelectedIndex(newIndex);
    // Reset zoom and pause video when swiping
    setZoomState({ scale: 1, x: 0, y: 0 });
    setVideoPlaying(null);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Reset to initial index when opening
  useEffect(() => {
    if (isOpen && emblaApi) {
      emblaApi.scrollTo(initialIndex, true);
      setZoomState({ scale: 1, x: 0, y: 0 });
    }
  }, [isOpen, initialIndex, emblaApi]);

  const scrollPrev = useCallback(() => {
    if (zoomState.scale > 1) return;
    emblaApi?.scrollPrev();
  }, [emblaApi, zoomState.scale]);

  const scrollNext = useCallback(() => {
    if (zoomState.scale > 1) return;
    emblaApi?.scrollNext();
  }, [emblaApi, zoomState.scale]);

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

  const toggleVideoPlay = (mediaId: string) => {
    setVideoPlaying(prev => prev === mediaId ? null : mediaId);
  };

  // Handle double tap to zoom
  const handleDoubleTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const currentItem = media[selectedIndex];
    if (currentItem.media_type !== 'image') return;

    if (zoomState.scale > 1) {
      setZoomState({ scale: 1, x: 0, y: 0 });
    } else {
      // Get tap position relative to image center
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]?.clientX || rect.left + rect.width / 2 : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY || rect.top + rect.height / 2 : e.clientY;
      
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Zoom towards tap position
      const newScale = 2.5;
      const x = (centerX - clientX) * (newScale - 1);
      const y = (centerY - clientY) * (newScale - 1);
      
      setZoomState({ scale: newScale, x, y });
    }
  }, [zoomState.scale, selectedIndex, media]);

  // Handle tap detection for double-tap
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    
    if (lastTouchRef.current) {
      const timeDiff = now - lastTouchRef.current.time;
      const distX = Math.abs(touch.clientX - lastTouchRef.current.x);
      const distY = Math.abs(touch.clientY - lastTouchRef.current.y);
      
      if (timeDiff < 300 && distX < 30 && distY < 30) {
        handleDoubleTap(e);
        lastTouchRef.current = null;
        return;
      }
    }
    
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY, time: now };
    initialPinchDistanceRef.current = null;
  }, [handleDoubleTap]);

  // Handle pinch zoom
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentItem = media[selectedIndex];
    if (currentItem.media_type !== 'image') return;

    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      if (initialPinchDistanceRef.current === null) {
        initialPinchDistanceRef.current = distance;
        initialScaleRef.current = zoomState.scale;
      } else {
        const scaleDiff = distance / initialPinchDistanceRef.current;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialScaleRef.current * scaleDiff));
        
        // Calculate pinch center
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const imageCenterX = rect.left + rect.width / 2;
        const imageCenterY = rect.top + rect.height / 2;
        
        // Adjust pan based on scale change
        if (newScale > 1) {
          const scaleRatio = newScale / zoomState.scale;
          const x = zoomState.x * scaleRatio + (imageCenterX - centerX) * (scaleRatio - 1);
          const y = zoomState.y * scaleRatio + (imageCenterY - centerY) * (scaleRatio - 1);
          setZoomState({ scale: newScale, x, y });
        } else {
          setZoomState({ scale: 1, x: 0, y: 0 });
        }
      }
    } else if (e.touches.length === 1 && zoomState.scale > 1) {
      // Pan when zoomed
      const touch = e.touches[0];
      
      if (lastPanRef.current.x !== 0 || lastPanRef.current.y !== 0) {
        const deltaX = touch.clientX - lastPanRef.current.x;
        const deltaY = touch.clientY - lastPanRef.current.y;
        
        setZoomState(prev => ({
          ...prev,
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));
      }
      
      lastPanRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, [zoomState, selectedIndex, media]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.touches.length === 2) {
      initialPinchDistanceRef.current = null;
    }
  }, []);

  // Reset pan reference on touch end
  const handleTouchEndReset = useCallback(() => {
    lastPanRef.current = { x: 0, y: 0 };
    initialPinchDistanceRef.current = null;
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoomState(prev => ({
      ...prev,
      scale: Math.min(MAX_SCALE, prev.scale + 0.5),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    const newScale = Math.max(MIN_SCALE, zoomState.scale - 0.5);
    if (newScale <= 1) {
      setZoomState({ scale: 1, x: 0, y: 0 });
    } else {
      setZoomState(prev => ({ ...prev, scale: newScale }));
    }
  }, [zoomState.scale]);

  const resetZoom = useCallback(() => {
    setZoomState({ scale: 1, x: 0, y: 0 });
  }, []);

  const currentMedia = media[selectedIndex];
  const isZoomed = zoomState.scale > 1;

  if (!isOpen || media.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm"
        data-protected="true"
        onContextMenu={preventContextMenu}
      >
        {/* Banking-style protection overlay */}
        <ScreenshotProtectionOverlay isActive={isBlocked} />
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium">
              {selectedIndex + 1} / {media.length}
            </span>
            {isZoomed && (
              <span className="text-white/70 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {Math.round(zoomState.scale * 100)}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {currentMedia.media_type === 'image' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={zoomOut}
                  disabled={zoomState.scale <= MIN_SCALE}
                  className="text-white hover:bg-white/20 rounded-full disabled:opacity-30"
                >
                  <ZoomOut className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={zoomIn}
                  disabled={zoomState.scale >= MAX_SCALE}
                  className="text-white hover:bg-white/20 rounded-full disabled:opacity-30"
                >
                  <ZoomIn className="w-5 h-5" />
                </Button>
              </>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(currentMedia.id)}
                className="text-white hover:bg-destructive/80 rounded-full"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Carousel */}
        <div className="h-full flex items-center justify-center">
          <div 
            ref={emblaRef} 
            className="overflow-hidden w-full h-full"
            style={{ touchAction: isZoomed ? 'none' : 'pan-y pinch-zoom' }}
          >
            <div className="flex h-full touch-pan-x" style={{ touchAction: isZoomed ? 'none' : 'pan-x' }}>
              {media.map((item, index) => (
                <div
                  key={item.id}
                  className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center p-4"
                >
                  {item.media_type === 'image' ? (
                    <div
                      ref={index === selectedIndex ? imageContainerRef : undefined}
                      className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden"
                      onTouchStart={index === selectedIndex ? handleTouchStart : undefined}
                      onTouchMove={index === selectedIndex ? handleTouchMove : undefined}
                      onTouchEnd={index === selectedIndex ? (e) => {
                        handleTouchEnd(e);
                        handleTouchEndReset();
                      } : undefined}
                      onDoubleClick={index === selectedIndex ? handleDoubleTap : undefined}
                    >
                      <motion.img
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ 
                          scale: index === selectedIndex ? zoomState.scale : 1, 
                          opacity: isBlocked ? 0 : 1,
                          x: index === selectedIndex ? zoomState.x : 0,
                          y: index === selectedIndex ? zoomState.y : 0,
                        }}
                        transition={{ 
                          scale: { type: 'spring', stiffness: 300, damping: 30 },
                          x: { type: 'spring', stiffness: 300, damping: 30 },
                          y: { type: 'spring', stiffness: 300, damping: 30 },
                          opacity: { duration: 0.1 }
                        }}
                        src={item.media_url}
                        alt=""
                        className={cn(
                          "max-w-full max-h-full object-contain rounded-lg select-none pointer-events-none",
                          isZoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
                        )}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        style={{
                          WebkitUserSelect: 'none',
                          WebkitTouchCallout: 'none',
                          filter: isBlocked ? 'brightness(0)' : 'none',
                        }}
                      />
                      {!isZoomed && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full pointer-events-none">
                          Double-tap ou pincez pour zoomer
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative max-w-full max-h-full flex items-center justify-center">
                      <motion.video
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: isBlocked ? 0 : 1 }}
                        transition={{ duration: 0.1 }}
                        src={item.media_url}
                        className="max-w-full max-h-full object-contain rounded-lg select-none"
                        controls={videoPlaying === item.id}
                        autoPlay={videoPlaying === item.id && index === selectedIndex}
                        playsInline
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVideoPlay(item.id);
                        }}
                        onContextMenu={preventContextMenu}
                        style={{
                          WebkitUserSelect: 'none',
                          WebkitTouchCallout: 'none',
                          filter: isBlocked ? 'brightness(0)' : 'none',
                        }}
                      />
                      {videoPlaying !== item.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVideoPlay(item.id);
                          }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center">
                            <Play className="w-10 h-10 text-white ml-1" fill="white" />
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation arrows - Desktop only (hidden when zoomed) */}
        {media.length > 1 && !isZoomed && (
          <>
            <button
              onClick={scrollPrev}
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={scrollNext}
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        {/* Reset zoom button - shown when zoomed */}
        {isZoomed && (
          <button
            onClick={resetZoom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm hover:bg-white/30 transition-colors"
          >
            Réinitialiser le zoom
          </button>
        )}

        {/* Screenshot blocked overlay */}
        <AnimatePresence>
          {isBlocked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-center"
              >
                <div className="w-24 h-24 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-6">
                  <Shield className="w-12 h-12 text-white/70" />
                </div>
                <p className="text-white text-2xl font-bold mb-2">Contenu protégé</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thumbnails - Bottom navigation (hidden when zoomed) */}
        {media.length > 1 && !isZoomed && (
          <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex gap-2 justify-center overflow-x-auto pb-2 scrollbar-hide">
              {media.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => emblaApi?.scrollTo(index)}
                  className={cn(
                    "flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all duration-200 border-2",
                    selectedIndex === index 
                      ? "border-white scale-110 shadow-lg shadow-white/20" 
                      : "border-transparent opacity-50 hover:opacity-80"
                  )}
                >
                  {item.media_type === 'image' ? (
                    <img 
                      src={item.media_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full relative">
                      <video src={item.media_url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-4 h-4 text-white" />
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
