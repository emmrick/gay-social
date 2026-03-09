import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { User, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GayConnectWatermark from '@/components/security/GayConnectWatermark';

interface ProfilePhotoCarouselProps {
  photos: string[];
  username: string;
  className?: string;
}

const ProfilePhotoCarousel = ({ photos, username, className }: ProfilePhotoCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    dragFree: false,
    containScroll: 'trimSnaps',
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const openFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setFullscreenOpen(true);
  };

  const closeFullscreen = () => setFullscreenOpen(false);

  const goFullscreenPrev = () => {
    setFullscreenIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const goFullscreenNext = () => {
    setFullscreenIndex((prev) => (prev + 1) % photos.length);
  };

  // Keyboard navigation for fullscreen
  useEffect(() => {
    if (!fullscreenOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFullscreen();
      if (e.key === 'ArrowLeft') goFullscreenPrev();
      if (e.key === 'ArrowRight') goFullscreenNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullscreenOpen, photos.length]);

  // Swipe gesture for fullscreen viewer
  useEffect(() => {
    if (!fullscreenOpen || photos.length <= 1) return;

    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      endX = startX;
      endY = startY;
    };
    const onTouchMove = (e: TouchEvent) => {
      endX = e.touches[0].clientX;
      endY = e.touches[0].clientY;
    };
    const onTouchEnd = () => {
      const dx = endX - startX;
      const dy = Math.abs(endY - startY);
      if (Math.abs(dx) > 50 && dy < 120) {
        if (dx < 0) goFullscreenNext();
        else goFullscreenPrev();
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [fullscreenOpen, photos.length]);

  // Lock body scroll when fullscreen is open
  useEffect(() => {
    if (fullscreenOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [fullscreenOpen]);

  if (photos.length === 0) {
    return (
      <div className={cn("relative w-full aspect-square bg-gradient-to-br from-primary to-accent flex items-center justify-center", className)}>
        <User className="w-20 h-20 text-white/80" />
      </div>
    );
  }

  return (
    <>
      <div className={cn("relative w-full", className)}>
        {/* Carousel */}
        <div 
          ref={emblaRef} 
          className="overflow-hidden rounded-lg"
        >
          <div className="flex">
            {photos.map((photo, index) => (
              <div
                key={index}
                className="flex-[0_0_100%] min-w-0"
              >
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
                  <GayConnectWatermark />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination dots */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  selectedIndex === index
                    ? "bg-white w-4"
                    : "bg-white/50 hover:bg-white/70"
                )}
                aria-label={`Aller à la photo ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Photo counter */}
        {photos.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {selectedIndex + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Fullscreen viewer */}
      <AnimatePresence>
        {fullscreenOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={closeFullscreen}
          >
            {/* Close button */}
            <button
              onClick={closeFullscreen}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors safe-area-top"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Counter */}
            {photos.length > 1 && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium safe-area-top">
                {fullscreenIndex + 1} / {photos.length}
              </div>
            )}

            {/* Image */}
            <motion.div
              key={fullscreenIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={photos[fullscreenIndex]}
                alt={`${username} photo ${fullscreenIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg select-none"
                draggable={false}
                onClick={closeFullscreen}
              />
              <GayConnectWatermark />
            </motion.div>

            {/* Navigation arrows */}
            {photos.length > 1 && (
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

            {/* Bottom dots */}
            {photos.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 safe-area-bottom">
                {photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); setFullscreenIndex(index); }}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-200",
                      fullscreenIndex === index
                        ? "bg-white w-5"
                        : "bg-white/40 hover:bg-white/60"
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
