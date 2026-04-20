import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertTriangle, X, Image as ImageIcon, Video } from 'lucide-react';
import { useTweenUploads } from '@/contexts/TweenUploadContext';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const TweenUploadIndicator = () => {
  const { uploads, dismiss } = useTweenUploads();

  return (
    <div className="fixed bottom-20 right-4 z-[60] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm pointer-events-none">
      <AnimatePresence>
        {uploads.map((u) => (
          <motion.div
            key={u.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className={cn(
              'pointer-events-auto rounded-2xl border bg-card/95 backdrop-blur-xl shadow-2xl p-3 flex items-center gap-3',
              u.status === 'error' ? 'border-destructive/40' : 'border-border/40'
            )}
          >
            {/* Thumbnail / icon */}
            <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
              {u.preview ? (
                u.mediaType === 'video' ? (
                  <video src={u.preview} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={u.preview} alt="" className="w-full h-full object-cover" />
                )
              ) : u.mediaType === 'video' ? (
                <Video className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              )}
              {u.status !== 'done' && u.status !== 'error' && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
              )}
              {u.status === 'done' && (
                <div className="absolute inset-0 bg-primary/80 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              {u.status === 'error' && (
                <div className="absolute inset-0 bg-destructive/80 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive-foreground" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {u.status === 'done'
                  ? 'Tween publié !'
                  : u.status === 'error'
                  ? 'Échec de la publication'
                  : u.stage}
              </p>
              {u.status === 'error' ? (
                <p className="text-[11px] text-destructive truncate">{u.error}</p>
              ) : u.contentSnippet ? (
                <p className="text-[11px] text-muted-foreground truncate">{u.contentSnippet}</p>
              ) : null}
              {u.status !== 'done' && u.status !== 'error' && (
                <Progress value={u.progress} className="h-1 mt-1.5 bg-primary/10" />
              )}
            </div>

            <button
              onClick={() => dismiss(u.id)}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default TweenUploadIndicator;
