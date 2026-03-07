import { useState, useRef } from 'react';
import { Camera, Image, X, Globe, MapPin, Lock, Loader2 } from 'lucide-react';
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

const CreateStoryDialog = ({ isOpen, onClose }: CreateStoryDialogProps) => {
  const { user } = useAuth();
  const { createStory } = useStories();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [showSnapCapture, setShowSnapCapture] = useState(false);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    const isVideo = selectedFile.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) return;
    setFile(selectedFile);
    setMediaType(isVideo ? 'video' : 'image');
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleSnapCapture = (segments: { file: File; type: 'image' | 'video' }[]) => {
    // Use the first segment for the story
    if (segments.length > 0) {
      const seg = segments[0];
      setFile(seg.file);
      setMediaType(seg.type);
      setPreview(URL.createObjectURL(seg.file));
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
    setFile(null);
    setPreview(null);
    setCaption('');
    setVisibility('public');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
                {/* Snap capture button */}
                <button
                  onClick={() => setShowSnapCapture(true)}
                  className="w-full aspect-[9/16] max-h-[40vh] rounded-2xl border-2 border-dashed border-primary/50 hover:border-primary bg-primary/5 flex flex-col items-center justify-center gap-3 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">📸 Capture Snap</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tap = Photo • Appui long = Vidéo
                    </p>
                  </div>
                </button>

                {/* Or select from gallery */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/30 bg-muted/30 flex items-center justify-center gap-3 transition-colors"
                >
                  <Image className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Choisir depuis la galerie</span>
                </button>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black">
                <button
                  onClick={handleReset}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
                {mediaType === 'image' ? (
                  <img src={preview} alt="Preview" className="w-full max-h-[50vh] object-contain" />
                ) : (
                  <video src={preview} controls className="w-full max-h-[50vh] object-contain" />
                )}
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
              disabled={!file || createStory.isPending}
              className="w-full h-12 rounded-xl font-semibold"
            >
              {createStory.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publication...</>
              ) : (
                'Publier la story'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Disparaît automatiquement après 24h
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Snap capture for stories */}
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
