import { useState, useCallback, useEffect, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { User, X, ChevronLeft, ChevronRight, Lock, FolderLock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GaySocialWatermark from '@/components/security/GaySocialWatermark';
import { Badge } from '@/components/ui/badge';

export interface AlbumSlide {
  id: string;
  name: string;
  is_private: boolean;
  coverUrl?: string;
  mediaCount: number;
}

interface ProfilePhotoCarouselProps {
  photos: string[];
  username: string;
  className?: string;
  albumSlides?: AlbumSlide[];
  onAlbumClick?: (albumId: string) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

const ProfilePhotoCarousel = ({ photos, username, className, albumSlides = [], onAlbumClick }: ProfilePhotoCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    dragFree: false,
    containScroll: 'trimSnaps',
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  // Zoom state
  const [zoomState, setZoomState] = useState({ scale: 1, x: 0, y: 0 });
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isSwipingRef = useRef(false);
  const lastTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  const openFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setZoomState({ scale: 1, x: 0, y: 0 });
    setFullscreenOpen(true);
  };

  const closeFullscreen = () => {
    setZoomState({ scale: 1, x: 0, y: 0 });
    setFullscreenOpen(false);
  };

  const goFullscreenPrev = useCallback(() => {
    if (zoomState.scale > 1) return;
    setFullscreenIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setZoomState({ scale: 1, x: 0, y: 0 });
  }, [photos.length, zoomState.scale]);

  const goFullscreenNext = useCallback(() => {
    if (zoomState.scale > 1) return;
    setFullscreenIndex((prev) => (prev + 1) % photos.length);
    setZoomState({ scale: 1, x: 0, y: 0 });
  }, [photos.length, zoomState.scale]);

  // Keyboard navigation
  useEffect(() => {
    if (!fullscreenOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomState.scale > 1) {
          setZoomState({ scale: 1, x: 0, y: 0 });
        } else {
          closeFullscreen();
        }
      }
      if (e.key === 'ArrowLeft') goFullscreenPrev();
      if (e.key === 'ArrowRight') goFullscreenNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullscreenOpen, goFullscreenPrev, goFullscreenNext, zoomState.scale]);

  // Double tap zoom
  const handleDoubleTap = useCallback(() => {
    if (zoomState.scale > 1) {
      setZoomState({ scale: 1, x: 0, y: 0 });
    } else {
      setZoomState({ scale: 2.5, x: 0, y: 0 });
    }
  }, [zoomState.scale]);

  // Touch handlers for pinch-zoom + swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
      lastPanRef.current = { x: touch.clientX, y: touch.clientY };
      isSwipingRef.current = false;
    }
    if (e.touches.length === 2) {
      initialPinchDistanceRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
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
      if (zoomState.scale > 1) {
        const panDeltaX = touch.clientX - lastPanRef.current.x;
        const panDeltaY = touch.clientY - lastPanRef.current.y;
        setZoomState(prev => ({ ...prev, x: prev.x + panDeltaX, y: prev.y + panDeltaY }));
        lastPanRef.current = { x: touch.clientX, y: touch.clientY };
      } else {
        const deltaX = touch.clientX - touchStartXRef.current;
        const deltaY = touch.clientY - touchStartYRef.current;
        if (Math.abs(deltaX) > 15 && Math.abs(deltaX) > Math.abs(deltaY)) {
          isSwipingRef.current = true;
        }
      }
    }
  }, [zoomState.scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    const touch = e.changedTouches[0];

    // Double tap detection
    if (lastTouchRef.current) {
      const timeDiff = now - lastTouchRef.current.time;
      const distX = Math.abs(touch.clientX - lastTouchRef.current.x);
      const distY = Math.abs(touch.clientY - lastTouchRef.current.y);
      if (timeDiff < 300 && distX < 30 && distY < 30) {
        handleDoubleTap();
        lastTouchRef.current = null;
        initialPinchDistanceRef.current = null;
        return;
      }
    }
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY, time: now };

    // Swipe navigation
    if (isSwipingRef.current && zoomState.scale <= 1) {
      const deltaX = touch.clientX - touchStartXRef.current;
      if (Math.abs(deltaX) > 60) {
        if (deltaX > 0) goFullscreenPrev();
        else goFullscreenNext();
      }
    }

    initialPinchDistanceRef.current = null;
    lastPanRef.current = { x: 0, y: 0 };
  }, [zoomState.scale, handleDoubleTap, goFullscreenPrev, goFullscreenNext]);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (fullscreenOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [fullscreenOpen]);

  const totalSlides = photos.length + albumSlides.length;

  if (photos.length === 0 && albumSlides.length === 0) {
    return (
      <div className={cn("relative w-full aspect-square bg-gradient-to-br from-primary to-accent flex items-center justify-center", className)}>
        <User className="w-20 h-20 text-white/80" />
      </div>
    );
  }

  return (
    <>
      <div className={cn("relative w-full", className)}>
        <div ref={emblaRef} className="overflow-hidden rounded-lg">
          <div className="flex">
            {photos.map((photo, index) => (
              <div key={`photo-${index}`} className="flex-[0_0_100%] min-w-0">
                <div
                  className="aspect-square relative cursor-pointer"
                  onClick={() => openFullscreen(index)}
                >
                  <img
                    src={photo}
                    alt={`${username} photo ${index + 1}`}
                    className="w-full h-full object-cover select-none"
                    draggable={false}
                  />
                  <GaySocialWatermark />
                </div>
              </div>
            ))}
            {/* Album slides after photos */}
            {albumSlides.map((album) => (
              <div key={`album-${album.id}`} className="flex-[0_0_100%] min-w-0">
                <div
                  className="aspect-square relative cursor-pointer overflow-hidden"
                  onClick={() => onAlbumClick?.(album.id)}
                >
                  {/* Blurred cover or gradient placeholder */}
                  {album.coverUrl ? (
                    <img
                      src={album.coverUrl}
                      alt={album.name}
                      className="w-full h-full object-cover select-none blur-xl scale-110"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-500/30 to-purple-600/30" />
                  )}

                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <Lock className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-center px-6">
                      <p className="text-white font-semibold text-lg drop-shadow-lg">{album.name}</p>
                      <p className="text-white/70 text-sm mt-1">
                        {album.mediaCount} {album.mediaCount > 1 ? 'médias' : 'média'} • Album {album.is_private ? 'privé' : 'public'}
                      </p>
                    </div>
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm mt-1">
                      <Lock className="w-3 h-3 mr-1" />
                      Demander l'accès
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {totalSlides > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  selectedIndex === index ? "bg-white w-4" : "bg-white/50 hover:bg-white/70",
                  index >= photos.length && "bg-violet-400/50",
                  selectedIndex === index && index >= photos.length && "bg-violet-400 w-4"
                )}
                aria-label={index < photos.length ? `Photo ${index + 1}` : `Album`}
              />
            ))}
          </div>
        )}

        {totalSlides > 1 && (
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {selectedIndex + 1} / {totalSlides}
          </div>
        )}
      </div>

      {/* Fullscreen viewer with pinch-to-zoom */}
      <AnimatePresence>
        {fullscreenOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => { if (zoomState.scale <= 1) closeFullscreen(); }}
          >
            <button
              onClick={closeFullscreen}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors safe-area-top"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            {photos.length > 1 && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium safe-area-top">
                {fullscreenIndex + 1} / {photos.length}
              </div>
            )}

            <motion.div
              key={fullscreenIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex items-center justify-center p-4 allow-pinch-zoom"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={photos[fullscreenIndex]}
                alt={`${username} photo ${fullscreenIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg select-none transition-transform duration-100"
                draggable={false}
                style={{
                  transform: `scale(${zoomState.scale}) translate(${zoomState.x / zoomState.scale}px, ${zoomState.y / zoomState.scale}px)`,
                }}
                onDoubleClick={() => handleDoubleTap()}
              />
              <GaySocialWatermark />
            </motion.div>

            {photos.length > 1 && zoomState.scale <= 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goFullscreenPrev(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 transition-colors"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goFullscreenNext(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 transition-colors"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            {photos.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 safe-area-bottom">
                {photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); setFullscreenIndex(index); setZoomState({ scale: 1, x: 0, y: 0 }); }}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-200",
                      fullscreenIndex === index ? "bg-white w-5" : "bg-white/40 hover:bg-white/60"
                    )}
                    aria-label={`Photo ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProfilePhotoCarousel;
