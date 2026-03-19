import { useState, useRef, useCallback } from 'react';
import { Camera, Image, X, Globe, MapPin, Lock, Loader2, Crop, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useStories } from '@/hooks/useStories';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import SnapCaptureDialog from '@/components/chat/SnapCaptureDialog';

interface CreateStoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type Visibility = 'public' | 'regional' | 'private';

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: typeof Globe; description: string }[] = [
  { value: 'public', label: 'Public', icon: Globe, description: 'Visible par tous les membres' },
  { value: 'regional', label: 'Régional', icon: MapPin, description: 'Visible par ta région' },
  { value: 'private', label: 'Favoris', icon: Lock, description: 'Visible par tes favoris uniquement' },
];

const MAX_IMAGE_DIMENSION = 1920;
const QUALITY = 0.88;

/**
 * Compress/resize image on client before upload using canvas.
 * Preserves aspect ratio, outputs WebP if supported, else JPEG.
 */
async function compressImage(file: File): Promise<File> {
  if (file.type.startsWith('video/')) return file;

  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down if too large
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Try WebP first, fallback JPEG
      const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
      const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg';
      const ext = supportsWebP ? 'webp' : 'jpg';

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const name = `story-${Date.now()}.${ext}`;
            resolve(new File([blob], name, { type: mimeType }));
          } else {
            resolve(file);
          }
        },
        mimeType,
        QUALITY
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

const CreateStoryDialog = ({ isOpen, onClose }: CreateStoryDialogProps) => {
  const { user } = useAuth();
  const { createStory } = useStories();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [showSnapCapture, setShowSnapCapture] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ['my-profile-region', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('region')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const processFile = useCallback(async (selectedFile: File) => {
    const isVideo = selectedFile.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
    if (selectedFile.size > maxSize) return;

    setIsCompressing(true);
    try {
      const processed = isVideo ? selectedFile : await compressImage(selectedFile);
      setFile(processed);
      setMediaType(isVideo ? 'video' : 'image');
      setPreview(URL.createObjectURL(processed));
    } finally {
      setIsCompressing(false);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleSnapCapture = (segments: { file: File; type: 'image' | 'video' }[]) => {
    if (segments.length > 0) {
      const seg = segments[0];
      processFile(seg.file);
    }
  };

  const handlePublish = async () => {
    if (!file) return;
    await createStory.mutateAsync({
      file,
      mediaType,
      caption: caption.trim() || undefined,
      visibility,
      regionCode: visibility === 'regional' ? profile?.region : undefined,
    });
    handleReset();
    onClose();
  };

  const handleReset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setCaption('');
    setVisibility('public');
    setIsCompressing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileSizeKB = file ? Math.round(file.size / 1024) : 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { handleReset(); onClose(); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Nouvelle Story</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!preview ? (
              <div className="space-y-3">
                <button
                  onClick={() => setShowSnapCapture(true)}
                  disabled={isCompressing}
                  className="w-full aspect-[9/16] max-h-[40vh] rounded-2xl border-2 border-dashed border-primary/50 hover:border-primary bg-primary/5 flex flex-col items-center justify-center gap-3 transition-colors"
                >
                  {isCompressing ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Camera className="w-8 h-8 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-sm">📸 Capture Snap</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tap = Photo • Appui long = Vidéo
                        </p>
                      </div>
                    </>
                  )}
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/30 bg-muted/30 flex items-center justify-center gap-3 transition-colors"
                >
                  <Image className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Choisir depuis la galerie</span>
                </button>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[50vh]">
                <button
                  onClick={handleReset}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
                {mediaType === 'image' ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <video src={preview} controls className="w-full h-full object-cover" />
                )}
                {/* File size indicator */}
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                  <span className="text-[10px] text-white/70 font-medium">
                    {fileSizeKB > 1024 ? `${(fileSizeKB / 1024).toFixed(1)} MB` : `${fileSizeKB} KB`}
                  </span>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Textarea
              placeholder="Ajoute une légende..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              className="resize-none h-20"
            />

            <div className="space-y-2">
              <p className="text-sm font-medium">Qui peut voir cette story ?</p>
              <div className="grid grid-cols-3 gap-2">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = visibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setVisibility(opt.value)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className={`text-xs font-medium ${isSelected ? 'text-primary' : ''}`}>{opt.label}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {VISIBILITY_OPTIONS.find(o => o.value === visibility)?.description}
              </p>
            </div>

            <Button
              onClick={handlePublish}
              disabled={!file || createStory.isPending || isCompressing}
              className="w-full h-12 rounded-xl font-semibold"
            >
              {createStory.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publication...</>
              ) : (
                'Publier la story'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Disparaît automatiquement après 24h • Format 9:16 recommandé
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <SnapCaptureDialog
        isOpen={showSnapCapture}
        onClose={() => setShowSnapCapture(false)}
        isPrivate={false}
        onCaptureForStory={handleSnapCapture}
      />
    </>
  );
};

export default CreateStoryDialog;
