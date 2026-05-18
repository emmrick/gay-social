import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, X, Shuffle, Star } from 'lucide-react';

interface AdImagesUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  max?: number;
}

const AdImagesUpload = ({
  value,
  onChange,
  label = "Images de l'annonce",
  max = 5,
}: AdImagesUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const images = value || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = max - images.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${max} images`);
      return;
    }
    const toUpload = files.slice(0, remaining);

    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) {
          toast.error(`"${file.name}" ignoré (pas une image)`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`"${file.name}" ignoré (> 5 Mo)`);
          continue;
        }
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('ad-images')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) {
          toast.error('Erreur upload : ' + uploadError.message);
          continue;
        }
        const { data: urlData } = supabase.storage.from('ad-images').getPublicUrl(path);
        uploaded.push(urlData.publicUrl);
      }
      if (uploaded.length) {
        onChange([...images, ...uploaded]);
        toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} ajoutée${uploaded.length > 1 ? 's' : ''}`);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const handleMakePrimary = (idx: number) => {
    if (idx === 0) return;
    const next = [...images];
    const [item] = next.splice(idx, 1);
    next.unshift(item);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {images.length > 1 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
            <Shuffle className="w-3 h-3" />
            Rotation aléatoire à chaque affichage
          </span>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, idx) => (
            <div
              key={url + idx}
              className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/30 group"
            >
              <img src={url} alt={`Visuel ${idx + 1}`} className="w-full h-full object-cover" />
              {idx === 0 && (
                <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 text-[9px] font-bold text-white bg-primary/90 backdrop-blur px-1.5 py-0.5 rounded-full">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  Principale
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {idx !== 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7"
                    onClick={() => handleMakePrimary(idx)}
                    title="Définir comme principale"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7"
                  onClick={() => handleRemove(idx)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {images.length < max && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <Plus className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-[10px] text-muted-foreground font-medium">Ajouter</span>
            </button>
          )}
        </div>
      )}

      {images.length === 0 && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <Plus className="w-6 h-6 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {uploading ? 'Téléchargement...' : `Ajouter jusqu'à ${max} images`}
          </span>
          <span className="text-[10px] text-muted-foreground">
            JPG, PNG, WebP — Max 5 Mo / image — diffusion aléatoire
          </span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
};

export default AdImagesUpload;
