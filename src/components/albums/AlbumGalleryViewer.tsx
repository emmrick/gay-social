import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Play, Pause, Trash2 } from 'lucide-react';
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
  });
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [videoPlaying, setVideoPlaying] = useState<string | null>(null);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const newIndex = emblaApi.selectedScrollSnap();
    setSelectedIndex(newIndex);
    // Pause any playing video when swiping
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
    }
  }, [isOpen, initialIndex, emblaApi]);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') scrollPrev();
      if (e.key === 'ArrowRight') scrollNext();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, scrollPrev, scrollNext, onClose]);

  const toggleVideoPlay = (mediaId: string) => {
    setVideoPlaying(prev => prev === mediaId ? null : mediaId);
  };

  const currentMedia = media[selectedIndex];

  if (!isOpen || media.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm"
      >
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
          
          <div className="text-white text-sm font-medium">
            {selectedIndex + 1} / {media.length}
          </div>

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

        {/* Carousel */}
        <div className="h-full flex items-center justify-center">
          <div 
            ref={emblaRef} 
            className="overflow-hidden w-full h-full"
            style={{ touchAction: 'pan-y pinch-zoom' }}
          >
            <div className="flex h-full touch-pan-x" style={{ touchAction: 'pan-x' }}>
              {media.map((item, index) => (
                <div
                  key={item.id}
                  className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center p-4"
                >
                  {item.media_type === 'image' ? (
                    <motion.img
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      src={item.media_url}
                      alt=""
                      className="max-w-full max-h-full object-contain rounded-lg select-none"
                      draggable={false}
                    />
                  ) : (
                    <div className="relative max-w-full max-h-full flex items-center justify-center">
                      <motion.video
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        src={item.media_url}
                        className="max-w-full max-h-full object-contain rounded-lg"
                        controls={videoPlaying === item.id}
                        autoPlay={videoPlaying === item.id && index === selectedIndex}
                        playsInline
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVideoPlay(item.id);
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

        {/* Navigation arrows - Desktop only */}
        {media.length > 1 && (
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

        {/* Thumbnails - Bottom navigation */}
        {media.length > 1 && (
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
