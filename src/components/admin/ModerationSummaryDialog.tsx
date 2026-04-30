import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  User, Clock, Flag, MessageSquare, Image as ImageIcon, Folder,
  Lock, ShieldCheck, AlertTriangle, Trash2, Eye, ExternalLink,
  MapPin, Calendar, FileText, History, Gavel,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

export type ModerationSummaryItem =
  | { kind: 'message'; id: string; userId: string; username?: string; avatarUrl?: string | null;
      content: string | null; messageType: string; isPrivate: boolean | null;
      createdAt: string; deletedAt?: string | null; }
  | { kind: 'pending-photo'; id: string; userId: string; username?: string; avatarUrl?: string | null;
      photoUrl: string; createdAt: string; }
  | { kind: 'reported-photo'; id: string; userId: string; username?: string; avatarUrl?: string | null;
      photoUrl: string; isPrimary?: boolean; createdAt: string; }
  | { kind: 'album'; id: string; userId: string; username?: string; avatarUrl?: string | null;
      name: string; isPrivate: boolean; mediaCount: number; createdAt: string; };

interface Props {
  item: ModerationSummaryItem | null;
  onClose: () => void;
  onDelete?: (item: ModerationSummaryItem) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onPreviewImage?: (url: string) => void;
}

const KIND_META: Record<ModerationSummaryItem['kind'], { label: string; Icon: any; color: string }> = {
  'message': { label: 'Message', Icon: MessageSquare, color: 'text-blue-500' },
  'pending-photo': { label: 'Photo en attente', Icon: ShieldCheck, color: 'text-amber-500' },
  'reported-photo': { label: 'Photo signalée', Icon: ImageIcon, color: 'text-orange-500' },
  'album': { label: 'Album', Icon: Folder, color: 'text-primary' },
};

const ModerationSummaryDialog = ({ item, onClose, onDelete, onApprove, onReject, onPreviewImage }: Props) => {
  const open = !!item;
  const userId = item?.userId;

  // Fetch full profile + reports + photo stats + history in parallel
  const { data: details, isLoading } = useQuery({
    queryKey: ['mod-summary', item?.kind, item?.id, userId],
    queryFn: async () => {
      if (!userId) return null;
      const [profileRes, reportsRes, photosRes, actionsRes] = await Promise.all([
        supabase.from('profiles')
          .select('user_id, username, avatar_url, age, region, bio, created_at, is_verified, last_seen')
          .eq('user_id', userId).maybeSingle(),
        supabase.from('reports')
          .select('id, reason, description, status, created_at, resolved_at, report_type')
          .eq('reported_user_id', userId)
          .order('created_at', { ascending: false }).limit(20),
        supabase.from('profile_photos')
          .select('id, status')
          .eq('user_id', userId),
        supabase.from('moderation_actions')
          .select('id, action_type, details, created_at, performed_by')
          .eq('target_user_id', userId)
          .order('created_at', { ascending: false }).limit(15),
      ]);
      const photos = (photosRes.data ?? []) as Array<{ id: string; status: string | null }>;
      return {
        profile: profileRes.data,
        reports: reportsRes.data ?? [],
        actions: actionsRes.data ?? [],
        photoStats: {
          total: photos.length,
          approved: photos.filter(p => p.status === 'approved').length,
          pending: photos.filter(p => p.status === 'pending').length,
          rejected: photos.filter(p => p.status === 'rejected').length,
        },
      };
    },
    enabled: open && !!userId,
  });

  if (!item) return null;
  const meta = KIND_META[item.kind];
  const Icon = meta.Icon;

  const renderContent = () => {
    switch (item.kind) {
      case 'message':
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">{item.messageType}</Badge>
              {item.isPrivate && <Badge variant="outline" className="text-xs"><Lock className="w-3 h-3 mr-1" />Privé</Badge>}
              {item.deletedAt && <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-500">Supprimé</Badge>}
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap break-words">
              {item.content || <span className="italic text-muted-foreground">[{item.messageType} sans texte]</span>}
            </div>
          </div>
        );
      case 'pending-photo':
      case 'reported-photo':
        return (
          <div className="space-y-2">
            <div
              className="aspect-square w-full max-h-72 rounded-lg overflow-hidden bg-secondary cursor-pointer"
              onClick={() => onPreviewImage?.(item.photoUrl)}
            >
              <img src={item.photoUrl} alt="" className="w-full h-full object-contain" />
            </div>
            {item.kind === 'reported-photo' && item.isPrimary && (
              <Badge className="text-xs">Photo principale</Badge>
            )}
          </div>
        );
      case 'album':
        return (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-3">
              <Folder className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.mediaCount} média(s) {item.isPrivate ? '· Privé' : '· Public'}
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[88vh] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${meta.color}`}>
              <Icon className="w-4 h-4" />
            </span>
            Résumé · {meta.label}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Vue détaillée pour décision de modération
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" className="flex flex-col">
          <div className="px-5 pt-3">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="summary" className="text-xs gap-1.5">
                <FileText className="w-3.5 h-3.5" />Résumé
              </TabsTrigger>
              <TabsTrigger value="details" className="text-xs gap-1.5">
                <History className="w-3.5 h-3.5" />Détails
                {details && (details.reports.length > 0 || details.actions.length > 0) && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-0.5">
                    {details.reports.length + details.actions.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="max-h-[calc(88vh-220px)]">
            {/* ===== Onglet Résumé ===== */}
            <TabsContent value="summary" className="px-5 py-4 space-y-5 mt-0">
              {/* Author */}
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={item.avatarUrl || undefined} />
                  <AvatarFallback>{(item.username || '?').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{item.username || 'Inconnu'}</span>
                    {details?.profile?.is_verified && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        <ShieldCheck className="w-3 h-3 mr-0.5" />Vérifié
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {details?.profile?.age && <span>{details.profile.age} ans</span>}
                    {details?.profile?.region && <span>· {details.profile.region}</span>}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="gap-1">
                  <Link to={`/admin/membres?user=${item.userId}`} onClick={onClose}>
                    <ExternalLink className="w-3.5 h-3.5" />
                    Profil
                  </Link>
                </Button>
              </div>

              <Separator />

              {/* Content */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contenu</p>
                {renderContent()}
              </div>

              {/* Quick stats */}
              {!isLoading && details && (
                <>
                  <Separator />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md border border-border p-2">
                      <div className="text-lg font-semibold">{details.reports.length}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Flag className="w-3 h-3" />Signalements
                      </div>
                    </div>
                    <div className="rounded-md border border-border p-2">
                      <div className="text-lg font-semibold">{details.photoStats.pending}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3 h-3" />En attente
                      </div>
                    </div>
                    <div className="rounded-md border border-border p-2">
                      <div className="text-lg font-semibold">{details.actions.length}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Gavel className="w-3 h-3" />Sanctions
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ===== Onglet Détails ===== */}
            <TabsContent value="details" className="px-5 py-4 space-y-5 mt-0">
              {/* Champs utiles */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Informations clés
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border border-border bg-muted/20 p-2">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <FileText className="w-3 h-3" />Type de contenu
                    </div>
                    <div className="font-medium mt-0.5 capitalize">{meta.label}</div>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 p-2">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />Région
                    </div>
                    <div className="font-medium mt-0.5">
                      {details?.profile?.region || <span className="text-muted-foreground italic">—</span>}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 p-2">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />Créé le
                    </div>
                    <div className="font-medium mt-0.5">
                      {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 p-2">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />Inscrit le
                    </div>
                    <div className="font-medium mt-0.5">
                      {details?.profile?.created_at
                        ? format(new Date(details.profile.created_at), 'dd/MM/yyyy', { locale: fr })
                        : <span className="text-muted-foreground italic">—</span>}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 p-2 col-span-2">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Eye className="w-3 h-3" />Dernière connexion
                    </div>
                    <div className="font-medium mt-0.5">
                      {details?.profile?.last_seen
                        ? formatDistanceToNow(new Date(details.profile.last_seen), { addSuffix: true, locale: fr })
                        : <span className="text-muted-foreground italic">—</span>}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 p-2 col-span-2">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" />ID du contenu
                    </div>
                    <div className="font-mono text-[10px] break-all mt-0.5">{item.id}</div>
                  </div>
                </div>
              </div>

              {/* Signalements liés */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Flag className="w-3 h-3" />Signalements liés
                  </p>
                  {details && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {details.reports.length}
                    </Badge>
                  )}
                </div>
                {isLoading ? (
                  <div className="text-xs text-muted-foreground italic">Chargement…</div>
                ) : !details || details.reports.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic rounded-md border border-dashed border-border p-3 text-center">
                    Aucun signalement enregistré pour cet utilisateur.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {details.reports.slice(0, 10).map((r: any) => (
                      <div key={r.id} className="rounded-md border border-orange-500/30 bg-orange-500/5 p-2 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium truncate">{r.reason}</span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] h-4 px-1 shrink-0 ${
                              r.status === 'resolved' ? 'border-green-500/40 text-green-600' :
                              r.status === 'pending' ? 'border-orange-500/40 text-orange-600' : ''
                            }`}
                          >
                            {r.status}
                          </Badge>
                        </div>
                        {r.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{r.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{format(new Date(r.created_at), 'dd/MM/yy HH:mm', { locale: fr })}</span>
                          {r.report_type && r.report_type !== 'user' && (
                            <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{r.report_type}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {details.reports.length > 10 && (
                      <p className="text-[10px] text-muted-foreground text-center pt-1">
                        + {details.reports.length - 10} signalement(s) plus ancien(s)
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Historique récent */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <History className="w-3 h-3" />Historique de modération
                  </p>
                  {details && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {details.actions.length}
                    </Badge>
                  )}
                </div>
                {isLoading ? (
                  <div className="text-xs text-muted-foreground italic">Chargement…</div>
                ) : !details || details.actions.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic rounded-md border border-dashed border-border p-3 text-center">
                    Aucune action de modération antérieure.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {details.actions.slice(0, 10).map((a: any) => (
                      <div key={a.id} className="rounded-md border border-border bg-muted/20 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 capitalize">
                            <Gavel className="w-2.5 h-2.5 mr-0.5" />
                            {String(a.action_type).replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                          </span>
                        </div>
                        {a.details && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{a.details}</p>
                        )}
                      </div>
                    ))}
                    {details.actions.length > 10 && (
                      <p className="text-[10px] text-muted-foreground text-center pt-1">
                        + {details.actions.length - 10} action(s) plus ancienne(s)
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Actions */}
        <div className="border-t border-border px-5 py-3 flex flex-wrap gap-2 justify-end bg-background">
          {item.kind === 'pending-photo' && (
            <>
              <Button variant="destructive" size="sm" onClick={() => { onReject?.(item.id); onClose(); }}>
                Refuser
              </Button>
              <Button size="sm" onClick={() => { onApprove?.(item.id); onClose(); }}>
                Approuver
              </Button>
            </>
          )}
          {(item.kind === 'reported-photo' || item.kind === 'pending-photo') && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => onPreviewImage?.(item.photoUrl)}>
              <Eye className="w-3.5 h-3.5" />Aperçu
            </Button>
          )}
          {onDelete && item.kind !== 'pending-photo' && (
            <Button variant="destructive" size="sm" className="gap-1" onClick={() => { onDelete(item); onClose(); }}>
              <Trash2 className="w-3.5 h-3.5" />Supprimer
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModerationSummaryDialog;
