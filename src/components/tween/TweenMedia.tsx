import { memo, useState } from 'react';
import GaySocialWatermark from '@/components/security/GaySocialWatermark';
import { ShieldAlert, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface TweenMediaProps {
  url: string;
  type: 'image' | 'video';
}

/**
 * Affichage protégé d'un média Tween :
 *  - Filigrane "Gay Social" en surimpression
 *  - Désactivation du clic droit / drag / sélection
 *  - Pour les vidéos : pas de bouton de téléchargement (controlsList=nodownload)
 *  - Bandeau légal indiquant l'interdiction de téléchargement
 *  - Clic sur le média : ouverture en plein écran (Dialog)
 */
const TweenMedia = memo(({ url, type }: TweenMediaProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const blockContextMenu = (e: React.MouseEvent | React.SyntheticEvent) => {
    e.preventDefault();
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
  };

  return (
    <>
      <div
        className="relative w-full mt-3 rounded-xl overflow-hidden border border-border/20 select-none cursor-zoom-in group"
        onContextMenu={blockContextMenu}
        onDragStart={blockContextMenu as any}
        onClick={handleOpen}
        style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
      >
        {type === 'image' ? (
          <img
            src={url}
            alt=""
            className="w-full max-h-80 object-cover pointer-events-none transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            draggable={false}
            onContextMenu={blockContextMenu}
            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
          />
        ) : (
          <video
            src={url}
            controls
            controlsList="nodownload noremoteplayback noplaybackrate"
            disablePictureInPicture
            disableRemotePlayback
            playsInline
            className="w-full max-h-80 object-cover bg-black"
            onContextMenu={blockContextMenu}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Filigrane visible */}
        <GaySocialWatermark />

        {/* Bandeau légal — discret en bas */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 pointer-events-none">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/90 leading-tight">
            <ShieldAlert className="w-3 h-3 flex-shrink-0" />
            <span>Téléchargement et redistribution interdits — Contenu protégé Gay Social</span>
          </div>
        </div>
      </div>

      {/* Dialog plein écran */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden">
          <div
            className="relative w-full h-full flex items-center justify-center min-h-[60vh] select-none"
            onContextMenu={blockContextMenu}
            style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 z-50 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            {type === 'image' ? (
              <div className="relative inline-block">
                <img
                  src={url}
                  alt=""
                  className="max-w-[95vw] max-h-[90vh] object-contain pointer-events-none"
                  draggable={false}
                  onContextMenu={blockContextMenu}
                  style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                />
                <GaySocialWatermark />
              </div>
            ) : (
              <div className="relative inline-block w-full">
                <video
                  src={url}
                  controls
                  autoPlay
                  controlsList="nodownload noremoteplayback noplaybackrate"
                  disablePictureInPicture
                  disableRemotePlayback
                  playsInline
                  className="max-w-[95vw] max-h-[90vh] object-contain bg-black mx-auto"
                  onContextMenu={blockContextMenu}
                />
                <GaySocialWatermark />
              </div>
            )}

            {/* Bandeau légal */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pointer-events-none">
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-white/90">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Téléchargement et redistribution interdits — Contenu protégé Gay Social</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

TweenMedia.displayName = 'TweenMedia';

export default TweenMedia;
