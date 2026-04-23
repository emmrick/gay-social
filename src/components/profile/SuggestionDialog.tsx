import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, Sparkles, Loader2, CheckCircle2, Clock, XCircle, Eye, Coins, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const MAX_FILES = 5;

const SuggestionDialog = ({ open, onOpenChange }: SuggestionDialogProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examples, setExamples] = useState('');
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<'form' | 'history'>('form');

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
      toast.success('Proposition envoyée ! Notre équipe va l\'examiner. 30 crédits si approuvée 🎁');
      setTitle('');
      setDescription('');
      setExamples('');
      setAttachments([]);
      qc.invalidateQueries({ queryKey: ['user-suggestions', user?.id] });
      setView('history');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Proposer une amélioration
          </DialogTitle>
          <DialogDescription>
            Vos idées font évoluer Gay Social. <span className="font-semibold text-primary">+30 crédits par proposition approuvée.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b">
          <button
            onClick={() => setView('form')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              view === 'form' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Nouvelle idée
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              view === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Mes propositions ({suggestions?.length ?? 0})
          </button>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {view === 'form' ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-gradient-to-br from-primary/5 to-yellow-500/5 border border-primary/10 p-3 text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Pour maximiser vos chances d'approbation :
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5 ml-1">
                  <li>Expliquez clairement votre idée</li>
                  <li>Donnez des exemples concrets d'utilisation</li>
                  <li>Joignez une capture d'écran ou un PDF si possible</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sugg-title">Titre de la proposition *</Label>
                <Input
                  id="sugg-title"
                  placeholder="Ex: Ajouter un mode sombre amélioré"
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <p className="text-xs text-muted-foreground text-right">{title.length}/200</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sugg-desc">Description détaillée *</Label>
                <Textarea
                  id="sugg-desc"
                  placeholder="Expliquez en détail votre idée : à quoi sert-elle, quel problème résout-elle, comment fonctionnerait-elle ?"
                  maxLength={5000}
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground text-right">{description.length}/5000</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sugg-examples">Exemples concrets (recommandé)</Label>
                <Textarea
                  id="sugg-examples"
                  placeholder="Donnez des exemples d'utilisation, mentionnez d'autres apps qui le font, ou décrivez un scénario."
                  maxLength={2000}
                  rows={4}
                  value={examples}
                  onChange={(e) => setExamples(e.target.value)}
                />
                <p className="text-xs text-muted-foreground text-right">{examples.length}/2000</p>
              </div>

              {/* Pièces jointes */}
              <div className="space-y-1.5">
                <Label>Pièces jointes (captures d'écran, PDF…)</Label>
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
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || attachments.length >= MAX_FILES}
                  className="w-full"
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Upload en cours…</>
                  ) : (
                    <><Paperclip className="w-4 h-4 mr-2" /> Joindre un fichier ({attachments.length}/{MAX_FILES})</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Images (PNG, JPG, WEBP, GIF) ou PDF · max 8 Mo par fichier · 5 fichiers max
                </p>

                {attachments.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {attachments.map((att) => {
                      const isImage = att.type.startsWith('image/');
                      const Icon = isImage ? ImageIcon : FileText;
                      return (
                        <div key={att.path} className="flex items-center gap-2 bg-muted/50 rounded-md p-2 text-xs">
                          <Icon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate font-medium">{att.name}</span>
                          <span className="text-muted-foreground flex-shrink-0">{(att.size / 1024).toFixed(0)} Ko</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att)}
                            className="text-muted-foreground hover:text-destructive flex-shrink-0"
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

              <p className="text-xs text-muted-foreground italic">
                ⚠️ Les propositions sont soumises à des tests et vérifications. Si elles répondent à un besoin elles seront approuvées, sinon elles pourront rester en attente ou être refusées.
              </p>

              <Button
                onClick={() => submit.mutate()}
                disabled={submit.isPending || uploading || title.trim().length < 5 || description.trim().length < 30}
                className="w-full"
                size="lg"
              >
                {submit.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Envoyer ma proposition</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {!suggestions?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Lightbulb className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune proposition pour le moment.</p>
                </div>
              ) : (
                suggestions.map((s) => {
                  const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  const atts = (s.attachments as any as AttachmentMeta[]) ?? [];
                  return (
                    <div key={s.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm flex-1">{s.title}</h4>
                        <Badge variant="outline" className={`${cfg.className} flex-shrink-0 text-xs`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">{s.description}</p>
                      {atts.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Paperclip className="w-3 h-3" />
                          {atts.length} pièce{atts.length > 1 ? 's' : ''} jointe{atts.length > 1 ? 's' : ''}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{format(new Date(s.created_at), 'd MMM yyyy', { locale: fr })}</span>
                        {s.credits_awarded > 0 && (
                          <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-semibold">
                            <Coins className="w-3 h-3" /> +{s.credits_awarded} crédits
                          </span>
                        )}
                      </div>
                      {s.admin_notes && (
                        <div className="text-xs bg-muted/50 rounded p-2 mt-1">
                          <span className="font-semibold">Réponse de l'équipe : </span>
                          {s.admin_notes}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SuggestionDialog;
