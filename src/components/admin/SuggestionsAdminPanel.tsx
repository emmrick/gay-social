/**
 * SuggestionsAdminPanel — gestion des idées proposées par les membres.
 *
 * Permet à l'admin / modérateur de :
 *   - Filtrer par statut (pending / in_review / approved / rejected / implemented)
 *   - Consulter le détail complet d'une idée (description, exemples, pièces jointes)
 *   - Approuver pour rendre publique (vote communautaire) ou rejeter
 *   - Récompenser l'auteur en crédits (champ credits_awarded)
 *   - Ajouter une note interne (admin_notes)
 *   - Supprimer (admin uniquement)
 *
 * Le trigger `trg_notify_suggestion_decision` envoie automatiquement la
 * notification au membre dès qu'on passe en `approved` ou `rejected`.
 */
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Lightbulb,
  Loader2,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles,
  Trash2,
  Coins,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Calendar,
  Filter as FilterIcon,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AdminCard } from '@/components/admin/ui/AdminCard';
import { AdminSectionHeader } from '@/components/admin/ui/AdminSectionHeader';

type Status = 'pending' | 'in_review' | 'approved' | 'rejected' | 'implemented';

interface SuggestionRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  examples: string | null;
  category: string;
  status: Status;
  admin_notes: string | null;
  credits_awarded: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  attachments: Array<{ path: string; name: string; type: string; size: number }>;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  upvotes: number;
  downvotes: number;
}

const STATUS_META: Record<Status, { label: string; icon: any; className: string }> = {
  pending: {
    label: 'En attente',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  },
  in_review: {
    label: 'En examen (public)',
    icon: Eye,
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  },
  approved: {
    label: 'Approuvée',
    icon: CheckCircle2,
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  },
  rejected: {
    label: 'Rejetée',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  },
  implemented: {
    label: 'Implémentée',
    icon: Sparkles,
    className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
  },
};

const FILTERS: Array<{ key: Status | 'all'; label: string }> = [
  { key: 'pending', label: 'À traiter' },
  { key: 'in_review', label: 'En examen' },
  { key: 'approved', label: 'Approuvées' },
  { key: 'rejected', label: 'Rejetées' },
  { key: 'implemented', label: 'Implémentées' },
  { key: 'all', label: 'Toutes' },
];

const SuggestionsAdminPanel = () => {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SuggestionRow | null>(null);

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['admin-suggestions', filter],
    queryFn: async (): Promise<SuggestionRow[]> => {
      let q = supabase
        .from('user_suggestions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (filter !== 'all') q = q.eq('status', filter);
      const { data: rows, error } = await q;
      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      const userIds = Array.from(new Set(rows.map((r: any) => r.user_id)));
      const ids = rows.map((r: any) => r.id);

      const [profilesRes, votesRes] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url').in('id', userIds),
        supabase
          .from('suggestion_votes' as any)
          .select('suggestion_id, vote_type')
          .in('suggestion_id', ids),
      ]);

      const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
      const voteMap = new Map<string, { up: number; down: number }>();
      ((votesRes.data as any[]) ?? []).forEach((v) => {
        const cur = voteMap.get(v.suggestion_id) ?? { up: 0, down: 0 };
        if (v.vote_type === 'up') cur.up++;
        else cur.down++;
        voteMap.set(v.suggestion_id, cur);
      });

      return rows.map((r: any) => {
        const author: any = profileMap.get(r.user_id);
        const votes = voteMap.get(r.id) ?? { up: 0, down: 0 };
        return {
          ...r,
          attachments: Array.isArray(r.attachments) ? r.attachments : [],
          authorUsername: author?.username ?? null,
          authorAvatarUrl: author?.avatar_url ?? null,
          upvotes: votes.up,
          downvotes: votes.down,
        } as SuggestionRow;
      });
    },
    staleTime: 15_000,
  });

  // Compteurs par statut (pour les onglets)
  const { data: counts } = useQuery({
    queryKey: ['admin-suggestions-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_suggestions')
        .select('status')
        .limit(1000);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        map[r.status] = (map[r.status] ?? 0) + 1;
      });
      return map;
    },
    staleTime: 15_000,
  });

  const filtered = useMemo(() => {
    if (!suggestions) return [];
    const s = search.trim().toLowerCase();
    if (!s) return suggestions;
    return suggestions.filter(
      (x) =>
        x.title.toLowerCase().includes(s) ||
        x.description.toLowerCase().includes(s) ||
        (x.authorUsername ?? '').toLowerCase().includes(s),
    );
  }, [suggestions, search]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      status?: Status;
      admin_notes?: string;
      credits_awarded?: number;
    }) => {
      const patch: any = { reviewed_by: user?.id, reviewed_at: new Date().toISOString() };
      if (payload.status) patch.status = payload.status;
      if (payload.admin_notes !== undefined) patch.admin_notes = payload.admin_notes;
      if (payload.credits_awarded !== undefined) patch.credits_awarded = payload.credits_awarded;

      const { data, error } = await supabase
        .from('user_suggestions')
        .update(patch)
        .eq('id', payload.id)
        .select()
        .single();
      if (error) throw error;

      // Crédit l'auteur si une récompense est définie et qu'on approuve
      if (payload.status === 'approved' && (payload.credits_awarded ?? 0) > 0) {
        const { error: cErr } = await supabase.rpc('add_credits' as any, {
          _user_id: data.user_id,
          _amount: payload.credits_awarded,
          _credit_type: 'bonus',
          _transaction_type: 'suggestion_reward',
          _description: `Idée approuvée : ${data.title}`,
        });
        if (cErr) console.warn('add_credits failed', cErr);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-suggestions-counts'] });
      queryClient.invalidateQueries({ queryKey: ['community-suggestions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_suggestions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-suggestions-counts'] });
      setSelected(null);
      toast.success('Idée supprimée');
    },
    onError: (e: any) => toast.error('Suppression impossible', { description: e?.message }),
  });

  return (
    <div className="space-y-4">
      <AdminSectionHeader
        icon={Lightbulb}
        title="Idées de la communauté"
        eyebrow="Suggestions des membres"
      />

      {/* Filtres */}
      <AdminCard padding="sm">
        <div className="flex flex-wrap items-center gap-2">
          <FilterIcon className="w-4 h-4 text-muted-foreground" />
          {FILTERS.map((f) => {
            const count = f.key === 'all'
              ? Object.values(counts ?? {}).reduce((a, b) => a + b, 0)
              : counts?.[f.key] ?? 0;
            const active = filter === f.key;
            return (
              <Button
                key={f.key}
                size="sm"
                variant={active ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {count}
                </Badge>
              </Button>
            );
          })}
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
      </AdminCard>

      {/* Liste */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <AdminCard padding="lg">
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune idée dans cette catégorie.</p>
          </div>
        </AdminCard>
      ) : (
        <div className="grid gap-2">
          {filtered.map((s) => {
            const meta = STATUS_META[s.status];
            const StatusIcon = meta.icon;
            return (
              <AdminCard
                key={s.id}
                interactive
                padding="md"
                onClick={() => setSelected(s)}
                className="flex gap-3"
              >
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarImage src={s.authorAvatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {(s.authorUsername ?? '?').slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start gap-2">
                    <h3 className="font-semibold text-sm leading-snug flex-1 truncate">
                      {s.title}
                    </h3>
                    <Badge variant="outline" className={cn(meta.className, 'flex-shrink-0 text-[10px]')}>
                      <StatusIcon className="w-2.5 h-2.5 mr-1" />
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                    <span className="truncate">@{s.authorUsername ?? 'inconnu'}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(s.created_at), 'd MMM yyyy', { locale: fr })}
                    </span>
                    {(s.upvotes > 0 || s.downvotes > 0) && (
                      <>
                        <span>·</span>
                        <span className="tabular-nums">
                          👍 {s.upvotes} · 👎 {s.downvotes}
                        </span>
                      </>
                    )}
                    {s.attachments.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="w-3 h-3" /> {s.attachments.length}
                        </span>
                      </>
                    )}
                    {s.credits_awarded > 0 && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Coins className="w-3 h-3" /> +{s.credits_awarded}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      {/* Détail */}
      {selected && (
        <SuggestionDetailDialog
          suggestion={selected}
          onClose={() => setSelected(null)}
          onUpdate={(p) =>
            updateMutation.mutateAsync(p).then(() => {
              toast.success('Idée mise à jour');
              setSelected(null);
            }).catch((e) => toast.error('Échec', { description: e?.message }))
          }
          onDelete={() => deleteMutation.mutate(selected.id)}
          isUpdating={updateMutation.isPending}
          isDeleting={deleteMutation.isPending}
          isAdmin={!!isAdmin}
        />
      )}
    </div>
  );
};

/* ----------------------------- Detail dialog ----------------------------- */

interface DetailProps {
  suggestion: SuggestionRow;
  onClose: () => void;
  onUpdate: (p: { id: string; status?: Status; admin_notes?: string; credits_awarded?: number }) => void;
  onDelete: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
  isAdmin: boolean;
}

const SuggestionDetailDialog = ({
  suggestion,
  onClose,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
  isAdmin,
}: DetailProps) => {
  const [notes, setNotes] = useState(suggestion.admin_notes ?? '');
  const [credits, setCredits] = useState<number>(suggestion.credits_awarded ?? 0);
  const meta = STATUS_META[suggestion.status];
  const StatusIcon = meta.icon;

  const handleStatus = (status: Status) => {
    onUpdate({
      id: suggestion.id,
      status,
      admin_notes: notes,
      credits_awarded: credits,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={suggestion.authorAvatarUrl ?? undefined} />
              <AvatarFallback>
                {(suggestion.authorUsername ?? '?').slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base leading-snug">{suggestion.title}</DialogTitle>
              <DialogDescription className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                <span>@{suggestion.authorUsername ?? 'inconnu'}</span>
                <span>·</span>
                <span>{format(new Date(suggestion.created_at), 'd MMM yyyy à HH:mm', { locale: fr })}</span>
                <Badge variant="outline" className={cn(meta.className, 'text-[10px]')}>
                  <StatusIcon className="w-2.5 h-2.5 mr-1" />
                  {meta.label}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-1">
            {/* Description */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Description
              </h4>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{suggestion.description}</p>
            </section>

            {/* Exemples */}
            {suggestion.examples && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Exemples / cas d'usage
                </h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {suggestion.examples}
                </p>
              </section>
            )}

            {/* Pièces jointes */}
            {suggestion.attachments.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Pièces jointes
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {suggestion.attachments.map((a) => (
                    <AttachmentPreview key={a.path} attachment={a} />
                  ))}
                </div>
              </section>
            )}

            {/* Votes */}
            {(suggestion.upvotes > 0 || suggestion.downvotes > 0) && (
              <section className="flex items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                  👍 {suggestion.upvotes}
                </span>
                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                  👎 {suggestion.downvotes}
                </span>
                <span className="text-muted-foreground">
                  · Score : {suggestion.upvotes - suggestion.downvotes}
                </span>
              </section>
            )}

            {/* Modération */}
            <section className="space-y-3 pt-2 border-t">
              <div>
                <Label className="text-xs">Note interne (visible uniquement par la modération)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 text-sm"
                  placeholder="Justification, contexte, lien GitHub…"
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <Coins className="w-3 h-3" /> Crédits à récompenser (sur approbation)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={500}
                  value={credits}
                  onChange={(e) => setCredits(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1 h-9 text-sm w-32"
                />
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 order-2 sm:order-1">
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer cette idée ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Action irréversible. L'idée et tous les votes associés seront supprimés.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex flex-wrap gap-2 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatus('rejected')}
              disabled={isUpdating}
            >
              <XCircle className="w-4 h-4 mr-1" /> Rejeter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatus('in_review')}
              disabled={isUpdating}
            >
              <Eye className="w-4 h-4 mr-1" /> Mettre en examen
            </Button>
            <Button
              size="sm"
              onClick={() => handleStatus('approved')}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              Approuver
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatus('implemented')}
                disabled={isUpdating}
              >
                <Sparkles className="w-4 h-4 mr-1" /> Marquer implémentée
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ------------------------- Attachment preview ---------------------------- */

const AttachmentPreview = ({
  attachment,
}: {
  attachment: { path: string; name: string; type: string; size: number };
}) => {
  const isImage = attachment.type?.startsWith('image/');
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.storage
      .from('suggestion-attachments')
      .createSignedUrl(attachment.path, 3600)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [attachment.path]);

  if (isImage) {
    return (
      <a
        href={url ?? '#'}
        target="_blank"
        rel="noreferrer"
        className="block rounded-lg border bg-muted overflow-hidden aspect-video"
      >
        {url ? (
          <img src={url} alt={attachment.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </a>
    );
  }

  return (
    <a
      href={url ?? '#'}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/30 hover:bg-muted text-sm"
    >
      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="truncate flex-1">{attachment.name}</span>
      <span className="text-xs text-muted-foreground">
        {(attachment.size / 1024).toFixed(0)} ko
      </span>
    </a>
  );
};

export default SuggestionsAdminPanel;
