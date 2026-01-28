import { useState, useRef } from 'react';
import { Image, Video, Camera, X, Send, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEphemeralMediaUpload } from '@/hooks/useEphemeralMediaUpload';
import { toast } from 'sonner';

interface MediaUploadButtonProps {
  chatRoomId?: string;
  recipientId?: string;
  isPrivate: boolean;
}

const MediaUploadButton = ({ chatRoomId, recipientId, isPrivate }: MediaUploadButtonProps) => {
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [viewDuration, setViewDuration] = useState(10);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { uploadEphemeralMedia, isUploading, progress } = useEphemeralMediaUpload();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 50 Mo)');
        return;
      }
      setPreviewFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMediaType(type);
    }
    // Reset input
    e.target.value = '';
  };

  const handleSend = async () => {
    if (!previewFile) return;

    try {
      await uploadEphemeralMedia.mutateAsync({
        file: previewFile,
        messageType: mediaType,
        viewDuration,
        chatRoomId,
        recipientId,
        isPrivate,
      });
      toast.success('Média envoyé !');
      handleCancel();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'envoi du média");
    }
  };

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const durations = [5, 10, 15, 30];

  if (previewUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isUploading}>
            <X className="w-6 h-6" />
          </Button>
          <span className="font-display font-semibold">
            Envoyer {mediaType === 'image' ? 'une photo' : 'une vidéo'}
          </span>
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
        
        {/* Duration selector */}
        <div className="p-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Durée d'affichage
          </p>
          <div className="flex gap-2 mb-4">
            {durations.map((d) => (
              <button
                key={d}
                onClick={() => setViewDuration(d)}
                disabled={isUploading}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  viewDuration === d 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                } disabled:opacity-50`}
              >
                {d}s
              </button>
            ))}
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="mb-4">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Envoi en cours... {progress}%
              </p>
            </div>
          )}
          
          <Button 
            variant="hero" 
            size="lg" 
            className="w-full" 
            onClick={handleSend}
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
  }

  return (
    <>
      <input 
        type="file" 
        ref={imageInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <input 
        type="file" 
        ref={videoInputRef} 
        accept="video/*" 
        className="hidden" 
        onChange={(e) => handleFileSelect(e, 'video')}
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-primary"
          >
            <Camera className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
            <Image className="w-4 h-4 mr-2" />
            Envoyer une photo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
            <Video className="w-4 h-4 mr-2" />
            Envoyer une vidéo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default MediaUploadButton;
