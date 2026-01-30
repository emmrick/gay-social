import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

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

  // If no photos, show placeholder
  if (photos.length === 0) {
    return (
      <div className={cn("relative w-full aspect-square bg-gradient-to-br from-primary to-accent flex items-center justify-center", className)}>
        <User className="w-20 h-20 text-white/80" />
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)}>
      {/* Carousel */}
      <div 
        ref={emblaRef} 
        className="overflow-hidden rounded-lg touch-pan-y"
        style={{ touchAction: 'pan-y pinch-zoom' }}
      >
        <div className="flex touch-pan-x" style={{ touchAction: 'pan-x' }}>
          {photos.map((photo, index) => (
            <div
              key={index}
              className="flex-[0_0_100%] min-w-0"
            >
              <div className="aspect-square relative">
                <img
                  src={photo}
                  alt={`${username} photo ${index + 1}`}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  draggable={false}
                />
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
  );
};

export default ProfilePhotoCarousel;
