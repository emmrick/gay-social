import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateTween } from '@/hooks/useTweens';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Image, Video, BarChart3, X, Loader2, Send, Bold, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';

const TweenComposer = () => {
  const { user, profile } = useAuth();
  const resolvedAvatar = useAvatarUrl(profile?.avatar_url);
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
  const videoRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!user) return null;

  const charCount = content.length;
  const charPercent = Math.min((charCount / 300) * 100, 100);
  const canPublish = content.trim().length > 0 && charCount <= 300 && !createTween.isPending && !uploading;

  const handleBold = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) {
      const newContent = `${content.slice(0, start)}****${content.slice(end)}`;
      setContent(newContent);
      setTimeout(() => { el.focus(); el.setSelectionRange(start + 2, start + 2); }, 0);
    } else {
      const newContent = `${content.slice(0, start)}**${content.slice(start, end)}**${content.slice(end)}`;
      setContent(newContent);
      setTimeout(() => { el.focus(); el.setSelectionRange(start + 2, end + 2); }, 0);
    }
  };

  const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1 Go
  const MAX_IMAGE_SIZE = 500 * 1024 * 1024; // 500 Mo

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === 'video' && file.size > MAX_VIDEO_SIZE) {
      toast.error('Vidéo trop volumineuse (max 1 Go)');
      e.target.value = '';
      return;
    }
    if (type === 'image' && file.size > MAX_IMAGE_SIZE) {
      toast.error('Photo trop volumineuse (max 500 Mo)');
      e.target.value = '';
      return;
    }
    setMediaFile(file);
    setMediaType(type);
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => { setMediaFile(null); setMediaPreview(null); setMediaType(null); };

  const resetForm = () => { setContent(''); removeMedia(); setShowPoll(false); setPollOptions(['', '']); };

  const handlePublish = async () => {
    if (!canPublish) return;
    let mediaUrl: string | undefined;

    if (mediaFile && mediaType) {
      setUploading(true);
      try {
        const ext = (mediaFile.name.split('.').pop() || 'bin').toLowerCase();
        const path = `tweens/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(path, mediaFile, {
            cacheControl: '31536000',
            contentType: mediaFile.type || undefined,
            upsert: false,
          });
        if (uploadError) {
          console.error('Tween upload error:', uploadError);
          toast.error(uploadError.message || "Erreur d'upload");
          setUploading(false);
          return;
        }
        // Bucket is private — generate a long-lived signed URL (1 year) for public feed display
        const { data: signed, error: signError } = await supabase.storage
          .from('media')
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signError || !signed?.signedUrl) {
          console.error('Tween sign error:', signError);
          toast.error('Erreur de génération du lien média');
          setUploading(false);
          return;
        }
        mediaUrl = signed.signedUrl;
      } finally {
        setUploading(false);
      }
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

  const renderPreview = (text: string) => {
    if (!text.includes('**')) return <span>{text}</span>;
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger */}
      <DialogTrigger asChild>
        <motion.button
          whileTap={{ scale: 0.98 }}
          className="w-full group relative overflow-hidden bg-card border border-border/40 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-11 h-11 ring-2 ring-primary/15">
                <AvatarImage src={resolvedAvatar || ''} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                  {profile?.username?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Quoi de neuf, <span className="font-semibold text-foreground">{profile?.username}</span> ?
              </p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground/30 group-hover:text-primary/50 transition-colors">
              <Image className="w-4 h-4" />
              <Video className="w-4 h-4" />
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
        </motion.button>
      </DialogTrigger>

      {/* Dialog */}
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-border/40 bg-card rounded-2xl">
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 border-b border-border/30">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="relative flex items-center gap-3">
            <Avatar className="w-12 h-12 ring-2 ring-primary/15">
              <AvatarImage src={resolvedAvatar || ''} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {profile?.username?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-sm text-foreground">{profile?.username || 'Anonyme'}</p>
              <p className="text-xs text-muted-foreground/60">Publication publique</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              placeholder="Partagez ce qui vous inspire…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={300}
              rows={4}
              className="w-full min-h-[100px] bg-transparent border-0 p-0 text-[15px] leading-relaxed resize-none focus:outline-none placeholder:text-muted-foreground/40"
              autoFocus
            />
          </div>

          {/* Live preview */}
          <AnimatePresence>
            {content.includes('**') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                  <p className="text-[10px] uppercase tracking-wider text-primary/50 font-bold mb-1.5">Aperçu</p>
                  <p className="text-sm whitespace-pre-wrap break-words text-foreground">{renderPreview(content)}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Media preview */}
          <AnimatePresence>
            {mediaPreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative rounded-2xl overflow-hidden border border-border/30 shadow-sm"
              >
                {mediaType === 'image' ? (
                  <img src={mediaPreview} alt="" className="w-full max-h-56 object-cover" />
                ) : (
                  <video src={mediaPreview} className="w-full max-h-56" controls />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2.5 right-2.5 rounded-full w-8 h-8 bg-background/80 backdrop-blur-sm hover:bg-background shadow-md"
                  onClick={removeMedia}
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Poll */}
          <AnimatePresence>
            {showPoll && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-2.5 p-4 rounded-2xl border border-primary/15 bg-primary/5"
              >
                <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Sondage
                </p>
                {pollOptions.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const n = [...pollOptions];
                      n[i] = e.target.value;
                      setPollOptions(n);
                    }}
                    className="w-full bg-background border border-border/40 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                  />
                ))}
                <div className="flex gap-2">
                  {pollOptions.length < 4 && (
                    <Button variant="outline" size="sm" onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs rounded-full border-primary/20 hover:bg-primary/5">
                      + Option
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => { setShowPoll(false); setPollOptions(['', '']); }} className="text-xs text-destructive rounded-full">
                    Annuler
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer toolbar */}
        <div className="px-5 py-3 border-t border-border/30 bg-muted/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={(e) => handleMediaSelect(e, 'image')} />
              <ToolbarButton icon={Image} label="Photo" onClick={() => fileRef.current?.click()} disabled={!!mediaFile} />

              <input type="file" accept="video/*" ref={videoRef} className="hidden" onChange={(e) => handleMediaSelect(e, 'video')} />
              <ToolbarButton icon={Video} label="Vidéo" onClick={() => videoRef.current?.click()} disabled={!!mediaFile} />

              <ToolbarButton icon={BarChart3} label="Sondage" onClick={() => setShowPoll(!showPoll)} disabled={!!mediaFile} active={showPoll} />

              <div className="w-px h-5 bg-border/40 mx-1" />

              <ToolbarButton icon={Bold} label="Gras" onClick={handleBold} />
            </div>

            <div className="flex items-center gap-3">
              {/* Circular progress */}
              <div className="relative w-7 h-7">
                <svg viewBox="0 0 28 28" className="w-7 h-7 -rotate-90">
                  <circle cx="14" cy="14" r="11" fill="none" strokeWidth="2.5" className="stroke-border/20" />
                  <circle
                    cx="14" cy="14" r="11" fill="none" strokeWidth="2.5"
                    strokeDasharray={`${charPercent * 0.691} 100`}
                    strokeLinecap="round"
                    className={cn(
                      "transition-all duration-300",
                      charCount > 280 ? "stroke-destructive" : charCount > 200 ? "stroke-accent" : "stroke-primary"
                    )}
                  />
                </svg>
                {charCount > 250 && (
                  <span className={cn(
                    "absolute inset-0 flex items-center justify-center text-[9px] font-bold",
                    charCount > 280 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {300 - charCount}
                  </span>
                )}
              </div>

              <Button
                onClick={handlePublish}
                disabled={!canPublish}
                className="rounded-full px-5 h-9 font-bold shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all bg-gradient-to-r from-primary to-accent hover:opacity-90"
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
      </DialogContent>
    </Dialog>
  );
};

const ToolbarButton = ({ icon: Icon, label, onClick, disabled, active }: {
  icon: any; label: string; onClick: () => void; disabled?: boolean; active?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    className={cn(
      "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/5",
      disabled && "opacity-30 pointer-events-none"
    )}
  >
    <Icon className="w-[18px] h-[18px]" />
  </button>
);

export default TweenComposer;
