import { X, Send, Loader2, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RegularMediaPreviewProps {
  previewUrl: string;
  mediaType: 'image' | 'video';
  isUploading: boolean;
  progress: number;
  onSend: () => void;
  onCancel: () => void;
}

const RegularMediaPreview = ({
  previewUrl,
  mediaType,
  isUploading,
  progress,
  onSend,
  onCancel,
}: RegularMediaPreviewProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onCancel} disabled={isUploading}>
          <X className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold">
            Envoyer {mediaType === 'image' ? 'une photo' : 'une vidéo'}
          </span>
          <Badge variant="outline" className="text-amber-500 border-amber-500/50">
            <ShieldOff className="w-3 h-3 mr-1" />
            Non protégé
          </Badge>
        </div>
        <div className="w-10" />
      </div>

      {/* Preview */}
      <div className="flex-1 flex items-center justify-center p-4">
        {mediaType === 'image' ? (
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-[60vh] object-contain rounded-2xl"
          />
        ) : (
          <video
            src={previewUrl}
            className="max-w-full max-h-[60vh] object-contain rounded-2xl"
            controls
          />
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
            ⚠️ Ce média sera visible indéfiniment et téléchargeable par le destinataire
          </p>
        </div>

        {/* Progress bar */}
        {isUploading && (
          <div className="mb-4">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Envoi en cours... {progress}%
            </p>
          </div>
        )}

        <Button
          variant="default"
          size="lg"
          className="w-full bg-amber-500 hover:bg-amber-600"
          onClick={onSend}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Envoi...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Envoyer
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default RegularMediaPreview;
