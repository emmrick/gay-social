import { memo } from 'react';

/**
 * Discrete rainbow watermark "Gay Social" overlay for images
 * Renders a semi-transparent diagonal text across the image
 */
const GaySocialWatermark = memo(({ className = '' }: { className?: string }) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
      aria-hidden="true"
      style={{ zIndex: 2 }}
    >
      {/* Diagonal watermark pattern */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: 'rotate(-30deg) scale(1.5)',
        }}
      >
        <div className="flex flex-col gap-16 items-center w-full">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex gap-12 items-center whitespace-nowrap">
              {[0, 1, 2].map((col) => (
                <span
                  key={col}
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{
                    background: 'linear-gradient(90deg, #FF0018, #FFA52C, #FFFF41, #008018, #0000F9, #86007D)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    opacity: 0.15,
                    textShadow: 'none',
                    userSelect: 'none',
                  }}
                >
                  Gay Social
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

GaySocialWatermark.displayName = 'GaySocialWatermark';

export default GaySocialWatermark;
