import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateTween } from '@/hooks/useTweens';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image, Video, BarChart3, X, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TweenComposer = () => {
  const { user, profile } = useAuth();
  const createTween = useCreateTween();
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const charCount = content.length;
  const canPublish = content.trim().length > 0 && charCount <= 300 && !createTween.isPending && !uploading;

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'video' && file.size > 100 * 1024 * 1024) {
      toast.error('Vidéo trop volumineuse (max 100 Mo)');
      return;
    }

    setMediaFile(file);
    setMediaType(type);
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
  };

  const handlePublish = async () => {
    if (!canPublish) return;

    let mediaUrl: string | undefined;

    if (mediaFile && mediaType) {
      setUploading(true);
      const ext = mediaFile.name.split('.').pop();
      const path = `tweens/${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, mediaFile);

      if (uploadError) {
        toast.error("Erreur d'upload du média");
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
      mediaUrl = urlData.publicUrl;
      setUploading(false);
    }

    const validPollOptions = showPoll ? pollOptions.filter(o => o.trim()) : undefined;

    await createTween.mutateAsync({
      content: content.trim(),
      mediaUrl,
      mediaType: mediaType || undefined,
      pollOptions: validPollOptions?.length && validPollOptions.length >= 2 ? validPollOptions : undefined,
    });

    setContent('');
    removeMedia();
    setShowPoll(false);
    setPollOptions(['', '']);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage src={profile?.avatar_url || ''} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
            {profile?.username?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <Textarea
            placeholder="Quoi de neuf ?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="border-0 bg-transparent resize-none p-0 text-base min-h-[60px] focus-visible:ring-0 placeholder:text-muted-foreground/60"
            maxLength={300}
          />

          {/* Media preview */}
          {mediaPreview && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-border">
              {mediaType === 'image' ? (
                <img src={mediaPreview} alt="Aperçu" className="w-full max-h-64 object-cover" />
              ) : (
                <video src={mediaPreview} className="w-full max-h-64" controls />
              )}
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 rounded-full w-7 h-7"
                onClick={removeMedia}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Poll options */}
          {showPoll && (
            <div className="mt-3 space-y-2 p-3 rounded-xl border border-border bg-muted/30">
              {pollOptions.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[i] = e.target.value;
                    setPollOptions(newOpts);
                  }}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                />
              ))}
              {pollOptions.length < 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-xs"
                >
                  + Ajouter une option
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setShowPoll(false); setPollOptions(['', '']); }} className="text-xs text-destructive">
                Annuler le sondage
              </Button>
            </div>
          )}

          {/* Actions bar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1">
              <input
                type="file"
                accept="image/*"
                ref={fileRef}
                className="hidden"
                onChange={(e) => handleMediaSelect(e, 'image')}
              />
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-9 h-9 text-primary"
                onClick={() => fileRef.current?.click()}
                disabled={!!mediaFile}
              >
                <Image className="w-5 h-5" />
              </Button>

              <input
                type="file"
                accept="video/*"
                id="tween-video-input"
                className="hidden"
                onChange={(e) => handleMediaSelect(e, 'video')}
              />
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-9 h-9 text-primary"
                onClick={() => document.getElementById('tween-video-input')?.click()}
                disabled={!!mediaFile}
              >
                <Video className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-9 h-9 text-primary"
                onClick={() => setShowPoll(!showPoll)}
                disabled={!!mediaFile}
              >
                <BarChart3 className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className={cn(
                "text-xs font-medium",
                charCount > 280 ? "text-destructive" : charCount > 200 ? "text-amber-500" : "text-muted-foreground"
              )}>
                {charCount}/300
              </span>

              <Button
                size="sm"
                className="rounded-full px-5 font-semibold"
                onClick={handlePublish}
                disabled={!canPublish}
              >
                {(createTween.isPending || uploading) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    Publier
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TweenComposer;
