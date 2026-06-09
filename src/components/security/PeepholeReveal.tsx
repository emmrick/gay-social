import { memo, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand } from 'lucide-react';
import GaySocialWatermark from './GaySocialWatermark';

interface PeepholeRevealProps {
  /** URL of the image to protect */
  src: string;
  alt?: string;
  /** Radius of the reveal circle in px */
  revealRadius?: number;
  /** Notified when user starts/stops revealing (use to drive view timer) */
  onRevealChange?: (revealing: boolean) => void;
  /** Optional className for the outer container */
  className?: string;
  /** Hint shown when nothing is revealed */
  hintLabel?: string;
}

/**
 * Anti-screenshot reveal lens.
 * The media is permanently hidden behind a heavy blur + diagonal watermark.
 * User must press-and-hold then drag a finger across the surface; only the
 * area under the finger (a soft circular "peephole") shows the clear image.
 * Releasing the press hides everything again.
 *
 * Designed for ephemeral selfies and private album previews.
 */
const PeepholeReveal = memo(({
  src,
  alt = '',
  revealRadius = 95,
  onRevealChange,
  className = '',
  hintLabel = 'Maintenir et glisser pour révéler',
}: PeepholeRevealProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const updatePos = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, clientY - rect.top)),
    });
  }, []);

  const handleDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    updatePos(e.clientX, e.clientY);
    onRevealChange?.(true);
  }, [onRevealChange, updatePos]);

  const handleMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    if (!pos) return;
    updatePos(e.clientX, e.clientY);
  }, [pos, updatePos]);

  const handleEnd = useCallback(() => {
    if (!pos) return;
    setPos(null);
    onRevealChange?.(false);
  }, [pos, onRevealChange]);

  const mask = pos
    ? `radial-gradient(circle ${revealRadius}px at ${pos.x}px ${pos.y}px, #000 55%, rgba(0,0,0,0.55) 78%, transparent 100%)`
    : 'none';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none touch-none ${className}`}
      data-protected="true"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
      onPointerLeave={handleEnd}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        cursor: pos ? 'none' : 'grab',
      }}
    >
      {/* Heavily blurred decoy — always visible */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{
          filter: 'blur(38px) brightness(0.45) saturate(0.55)',
          transform: 'scale(1.15)', // hide blur edges
        }}
      />

      {/* Watermark grid on top of decoy */}
      <GaySocialWatermark />

      {/* Clear layer revealed only inside the lens */}
      <img
        src={src}
        alt=""
        draggable={false}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-150"
        style={{
          opacity: pos ? 1 : 0,
          WebkitMaskImage: mask,
          maskImage: mask,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        }}
      />

      {/* Lens ring indicator */}
      <AnimatePresence>
        {pos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.12 }}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: pos.x - revealRadius,
              top: pos.y - revealRadius,
              width: revealRadius * 2,
              height: revealRadius * 2,
              border: '2px solid rgba(255,255,255,0.85)',
              boxShadow:
                '0 0 0 1px rgba(0,0,0,0.4), 0 0 40px rgba(255,255,255,0.35), inset 0 0 30px rgba(255,255,255,0.15)',
              zIndex: 3,
            }}
          />
        )}
      </AnimatePresence>

      {/* Idle hint */}
      <AnimatePresence>
        {!pos && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 4 }}
          >
            <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15">
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [-6, 6, -6] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center"
              >
                <Hand className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-white text-sm font-medium tracking-wide">
                {hintLabel}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

PeepholeReveal.displayName = 'PeepholeReveal';

export default PeepholeReveal;
