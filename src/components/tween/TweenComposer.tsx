import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateTween } from '@/hooks/useTweens';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Image, Video, BarChart3, X, Loader2, Send, Bold, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TweenComposer = () => {
  const { user, profile } = useAuth();
  const createTween = useCreateTween();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!user) return null;

  const charCount = content.length;
  const canPublish = content.trim().length > 0 && charCount <= 300 && !createTween.isPending && !uploading;

  const handleBold = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) {
      // No selection — insert markers
      const before = content.slice(0, start);
      const after = content.slice(end);
      const newContent = `${before}****${after}`;
      setContent(newContent);
      setTimeout(() => { el.focus(); el.setSelectionRange(start + 2, start + 2); }, 0);
    } else {
      // Wrap selection
      const before = content.slice(0, start);
      const selected = content.slice(start, end);
      const after = content.slice(end);
      const newContent = `${before}**${selected}**${after}`;
      setContent(newContent);
      setTimeout(() => { el.focus(); el.setSelectionRange(start + 2, end + 2); }, 0);
    }
  };

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

  const resetForm = () => {
    setContent('');
    removeMedia();
    setShowPoll(false);
    setPollOptions(['', '']);
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

    resetForm();
    setOpen(false);
  };

  // Render preview of content with bold markers
  const renderPreview = (text: string) => {
    if (!text.includes('**')) return <span>{text}</span>;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger bar */}
      <DialogTrigger asChild>
        <button className="w-full bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                {profile?.username?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground text-sm flex-1 text-left">Quoi de neuf ?</span>
            <PenLine className="w-5 h-5 text-primary" />
          </div>
        </button>
      </DialogTrigger>

      {/* Composer dialog */}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Créer un Tween</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Author line */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                {profile?.username?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm">{profile?.username || 'Anonyme'}</span>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              placeholder="Exprimez-vous…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={300}
              className="w-full min-h-[120px] bg-muted/30 border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
            />
            <div className="flex items-center justify-between px-1 mt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full h-8 px-3 text-xs gap-1.5"
                onClick={handleBold}
              >
                <Bold className="w-4 h-4" />
                Gras
              </Button>
              <span className={cn(
                "text-xs font-medium",
                charCount > 280 ? "text-destructive" : charCount > 200 ? "text-amber-500" : "text-muted-foreground"
              )}>
                {charCount}/300
              </span>
            </div>
          </div>

          {/* Live preview */}
          {content.includes('**') && (
            <div className="bg-muted/20 border border-border/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Aperçu :</p>
              <p className="text-sm whitespace-pre-wrap break-words">{renderPreview(content)}</p>
            </div>
          )}

          {/* Media preview */}
          {mediaPreview && (
            <div className="relative rounded-xl overflow-hidden border border-border">
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
            <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/30">
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
                <Button variant="ghost" size="sm" onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs">
                  + Ajouter une option
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setShowPoll(false); setPollOptions(['', '']); }} className="text-xs text-destructive">
                Annuler le sondage
              </Button>
            </div>
          )}

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={(e) => handleMediaSelect(e, 'image')} />
              <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 text-primary" onClick={() => fileRef.current?.click()} disabled={!!mediaFile}>
                <Image className="w-5 h-5" />
              </Button>

              <input type="file" accept="video/*" id="tween-video-dialog" className="hidden" onChange={(e) => handleMediaSelect(e, 'video')} />
              <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 text-primary" onClick={() => document.getElementById('tween-video-dialog')?.click()} disabled={!!mediaFile}>
                <Video className="w-5 h-5" />
              </Button>

              <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 text-primary" onClick={() => setShowPoll(!showPoll)} disabled={!!mediaFile}>
                <BarChart3 className="w-5 h-5" />
              </Button>
            </div>

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
      </DialogContent>
    </Dialog>
  );
};

export default TweenComposer;
