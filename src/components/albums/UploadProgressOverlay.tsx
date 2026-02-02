import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, ImagePlus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
}

interface UploadProgressOverlayProps {
  isVisible: boolean;
  uploads: UploadProgress[];
  totalFiles: number;
  completedFiles: number;
}

const UploadProgressOverlay = ({ 
  isVisible, 
  uploads, 
  totalFiles, 
  completedFiles 
}: UploadProgressOverlayProps) => {
  const overallProgress = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 z-50 bg-background/95 backdrop-blur-lg border border-border rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-border bg-secondary/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <ImagePlus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Upload en cours</p>
                  <p className="text-xs text-muted-foreground">
                    {completedFiles} / {totalFiles} fichier(s)
                  </p>
                </div>
              </div>
              <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
            </div>
            
            {/* Overall progress bar */}
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Individual file progress */}
          <div className="max-h-40 overflow-y-auto p-3 space-y-2">
            {uploads.map((upload, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30"
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {upload.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  )}
                  {upload.status === 'complete' && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                  {upload.status === 'pending' && (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                  )}
                  {upload.status === 'error' && (
                    <div className="w-4 h-4 rounded-full bg-destructive" />
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{upload.fileName}</p>
                  {upload.status === 'uploading' && (
                    <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${upload.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>

                {/* Progress percentage */}
                {upload.status === 'uploading' && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {upload.progress}%
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UploadProgressOverlay;
