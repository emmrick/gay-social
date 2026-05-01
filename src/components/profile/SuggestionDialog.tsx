import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Lightbulb,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Coins,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Users,
  PenLine,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import CommunitySuggestions from './CommunitySuggestions';

interface SuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AttachmentMeta {
  path: string;
  name: string;
  type: string;
  size: number;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: 'En attente', icon: Clock, className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20' },
  in_review: { label: 'En cours d\'examen', icon: Eye, className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
  approved: { label: 'Approuvée', icon: CheckCircle2, className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
  rejected: { label: 'Refusée', icon: XCircle, className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' },
};

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,image/gif,application/pdf';
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_FILES = 5;

type ViewMode = 'form' | 'community' | 'history';

const SuggestionDialog = ({ open, onOpenChange }: SuggestionDialogProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examples, setExamples] = useState('');
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<ViewMode>('form');

  // Reset scroll on view switch so the user always lands at the top
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [view]);

  const { data: suggestions } = useQuery({
    queryKey: ['user-suggestions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('user_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id && open,
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user?.id) return;
    if (attachments.length + files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} fichiers par proposition`);
      return;
    }
    setUploading(true);
    const uploaded: AttachmentMeta[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} dépasse 8 Mo`);
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from('suggestion-attachments')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          toast.error(`Erreur upload ${file.name}`);
          continue;
        }
        uploaded.push({ path, name: file.name, type: file.type, size: file.size });
      }
      if (uploaded.length) {
        setAttachments((prev) => [...prev, ...uploaded]);
        toast.success(`${uploaded.length} fichier(s) ajouté(s)`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = async (att: AttachmentMeta) => {
    await supabase.storage.from('suggestion-attachments').remove([att.path]);
    setAttachments((prev) => prev.filter((a) => a.path !== att.path));
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Non connecté');
      if (title.trim().length < 5) throw new Error('Le titre doit contenir au moins 5 caractères');
      if (description.trim().length < 30) throw new Error('La description doit être détaillée (min. 30 caractères)');

      const { error } = await supabase.from('user_suggestions').insert({
        user_id: user.id,
        title: title.trim().slice(0, 200),
        description: description.trim().slice(0, 5000),
        examples: examples.trim().slice(0, 2000) || null,
        attachments: attachments as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Proposition envoyée ! +30 crédits si approuvée 🎁');
      setTitle('');
      setDescription('');
      setExamples('');
      setAttachments([]);
      qc.invalidateQueries({ queryKey: ['user-suggestions', user?.id] });
      setView('history');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isFormValid = title.trim().length >= 5 && description.trim().length >= 30;

  const tabs: { key: ViewMode; label: string; icon: any; badge?: number }[] = [
    { key: 'form', label: 'Nouvelle', icon: PenLine },
    { key: 'community', label: 'Communauté', icon: Users },
    { key: 'history', label: 'Mes idées', icon: History, badge: suggestions?.length },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'p-0 border-0 bg-transparent shadow-none',
          // Bottom sheet: takes available visible viewport (dvh handles keyboard)
          'h-[92dvh] max-h-[92dvh] flex flex-col',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden rounded-t-3xl bg-card border-t border-x border-border/60 shadow-2xl">
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1.5 flex-shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/25" />
          </div>

          {/* Header */}
          <div className="px-5 pt-1 pb-3 flex-shrink-0 relative">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-400/20 via-primary/15 to-accent/20 flex items-center justify-center flex-shrink-0 ring-1 ring-primary/10">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold leading-tight">Proposer une amélioration</h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  Vos idées font évoluer Gay Social.{' '}
                  <span className="font-semibold text-primary">+30 crédits si approuvée</span>
                </p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center flex-shrink-0 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-3 pb-3 flex-shrink-0">
            <div className="grid grid-cols-3 gap-1 p-1 bg-muted/40 rounded-2xl">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = view === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setView(t.key)}
                    className={cn(
                      'relative flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl transition-all',
                      active
                        ? 'bg-card text-foreground shadow-sm ring-1 ring-border/50'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{t.label}</span>
                    {t.badge ? (
                      <span className="ml-0.5 min-w-[16px] h-4 px-1 text-[10px] leading-none flex items-center justify-center rounded-full bg-primary/15 text-primary font-bold">
                        {t.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scroll area — flex-1 + min-h-0 so the keyboard can shrink it without breaking */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {view === 'community' ? (
              <div className="pb-4">
                <CommunitySuggestions />
              </div>
            ) : view === 'form' ? (
              <div className="space-y-4 pb-6">
                <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-yellow-500/5 to-accent/8 border border-primary/15 p-3.5 text-xs space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Maximisez vos chances d'approbation
                  </p>
                  <ul className="text-muted-foreground space-y-0.5 ml-5 list-disc">
                    <li>Expliquez clairement votre idée</li>
                    <li>Donnez des exemples concrets</li>
                    <li>Joignez une capture d'écran si possible</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sugg-title" className="text-xs font-bold">
                      Titre <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {title.length}/200
                    </span>
                  </div>
                  <Input
                    id="sugg-title"
                    placeholder="Ex: Mode sombre amélioré"
                    maxLength={200}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11 rounded-xl"
                    onFocus={(e) => {
                      // Make sure the focused field stays visible above the keyboard
                      setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sugg-desc" className="text-xs font-bold">
                      Description <span className="text-destructive">*</span>
                    </Label>
                    <span className={cn(
                      'text-[10px] tabular-nums',
                      description.trim().length < 30 ? 'text-muted-foreground' : 'text-green-600 dark:text-green-400 font-semibold'
                    )}>
                      {description.length}/5000 {description.trim().length >= 30 && '✓'}
                    </span>
                  </div>
                  <Textarea
                    id="sugg-desc"
                    placeholder="Expliquez votre idée : à quoi sert-elle, quel problème résout-elle, comment fonctionnerait-elle ?"
                    maxLength={5000}
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl resize-none"
                    onFocus={(e) => {
                      setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sugg-examples" className="text-xs font-bold">
                      Exemples <span className="text-muted-foreground font-normal">(recommandé)</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {examples.length}/2000
                    </span>
                  </div>
                  <Textarea
                    id="sugg-examples"
                    placeholder="Donnez des cas d'usage, citez des apps qui le font..."
                    maxLength={2000}
                    rows={3}
                    value={examples}
                    onChange={(e) => setExamples(e.target.value)}
                    className="rounded-xl resize-none"
                    onFocus={(e) => {
                      setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Pièces jointes</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || attachments.length >= MAX_FILES}
                    className="w-full h-11 rounded-xl border-dashed"
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Upload en cours…</>
                    ) : (
                      <><Paperclip className="w-4 h-4 mr-2" /> Joindre un fichier ({attachments.length}/{MAX_FILES})</>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    PNG, JPG, WEBP, GIF ou PDF · max 8 Mo · 5 fichiers max
                  </p>

                  {attachments.length > 0 && (
                    <div className="space-y-1.5">
                      {attachments.map((att) => {
                        const isImage = att.type.startsWith('image/');
                        const Icon = isImage ? ImageIcon : FileText;
                        return (
                          <div key={att.path} className="flex items-center gap-2 bg-muted/50 rounded-xl p-2.5 text-xs">
                            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">{att.name}</p>
                              <p className="text-muted-foreground">{(att.size / 1024).toFixed(0)} Ko</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(att)}
                              className="w-7 h-7 rounded-full bg-background hover:bg-destructive/10 hover:text-destructive flex items-center justify-center flex-shrink-0 transition-colors"
                              aria-label="Supprimer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground italic leading-snug">
                  ⚠️ Les propositions sont vérifiées. Si elles répondent à un besoin elles sont approuvées, sinon elles peuvent rester en attente ou être refusées.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 pb-6">
                {!suggestions?.length ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                      <Lightbulb className="w-7 h-7 opacity-40" />
                    </div>
                    <p className="text-sm font-medium">Aucune proposition</p>
                    <p className="text-xs mt-1">Partagez votre première idée !</p>
                    <Button size="sm" variant="outline" className="mt-4 rounded-xl" onClick={() => setView('form')}>
                      <PenLine className="w-3.5 h-3.5 mr-1.5" />
                      Nouvelle proposition
                    </Button>
                  </div>
                ) : (
                  suggestions.map((s) => {
                    const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending;
                    const Icon = cfg.icon;
                    const atts = (s.attachments as any as AttachmentMeta[]) ?? [];
                    return (
                      <div key={s.id} className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm flex-1 leading-snug">{s.title}</h4>
                          <Badge variant="outline" className={cn(cfg.className, 'flex-shrink-0 text-[10px] rounded-full')}>
                            <Icon className="w-2.5 h-2.5 mr-1" />
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{s.description}</p>
                        {atts.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Paperclip className="w-3 h-3" />
                            {atts.length} pièce{atts.length > 1 ? 's' : ''} jointe{atts.length > 1 ? 's' : ''}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <span>{format(new Date(s.created_at), 'd MMM yyyy', { locale: fr })}</span>
                          {s.credits_awarded > 0 && (
                            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-bold">
                              <Coins className="w-3 h-3" /> +{s.credits_awarded} crédits
                            </span>
                          )}
                        </div>
                        {s.admin_notes && (
                          <div className="text-xs bg-muted/40 rounded-xl p-2.5 border border-border/40">
                            <span className="font-bold">Réponse de l'équipe : </span>
                            <span className="text-muted-foreground">{s.admin_notes}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Sticky submit footer (only on form view) */}
          {view === 'form' && (
            <div
              className="flex-shrink-0 px-5 pt-3 pb-4 border-t border-border/40 bg-card/95 backdrop-blur-xl"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <Button
                onClick={() => submit.mutate()}
                disabled={submit.isPending || uploading || !isFormValid}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary via-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20 font-bold"
                size="lg"
              >
                {submit.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Envoyer ma proposition</>
                )}
              </Button>
              {!isFormValid && (title.length > 0 || description.length > 0) && (
                <p className="text-[11px] text-center text-muted-foreground mt-2">
                  {title.trim().length < 5
                    ? `Titre : ${5 - title.trim().length} caractère(s) restant(s)`
                    : `Description : ${30 - description.trim().length} caractère(s) restant(s)`}
                </p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SuggestionDialog;
