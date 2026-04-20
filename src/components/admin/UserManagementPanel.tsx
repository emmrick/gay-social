import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  Loader2,
  Eye,
  Ban,
  ShieldOff,
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Mail,
  MoreVertical,
  ChevronLeft,
  Trash2,
  RefreshCw,
  Send,
  UserCheck,
  Wifi,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SecureAvatar } from '@/components/ui/secure-avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import UserProfileDialog from './UserProfileDialog';
import ClientDossierPanel from './ClientDossierPanel';
import SendEmailDialog from './SendEmailDialog';
import BackfillWelcomeEmailsButton from './BackfillWelcomeEmailsButton';
import {
  useSuspendUser,
  useBlockUser,
  useUnblockUser,
  useIsUserBlocked,
  SuspensionDuration,
  suspensionDurations,
} from '@/hooks/useAdmin';
import { useRecordEarning, useTaskRates, formatCents } from '@/hooks/useModeratorEarnings';
import { useLogModerationAction } from '@/hooks/useModerationActions';
import { useAuth } from '@/contexts/AuthContext';
import LiveOnlineDot from '@/components/presence/LiveOnlineDot';
import { cn } from '@/lib/utils';
import {
  AdminSectionHeader,
  StatTile,
  AdminFilterBar,
  AdminFilterChip,
  AdminTable,
  type AdminColumn,
} from './ui';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  age: number | null;
  region: string;
  bio: string | null;
  is_online: boolean | null;
  is_verified: boolean;
  is_premium: boolean | null;
  created_at: string;
  last_seen: string | null;
}

interface VerificationStatus {
  status: 'pending' | 'approved' | 'rejected' | 'none';
  submitted_at: string | null;
}

const useAllUsers = (search: string, filter: string) => {
  return useQuery({
    queryKey: ['admin-users', search, filter],
    queryFn: async (): Promise<UserProfile[]> => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.ilike('username', `%${search}%`);
      }

      if (filter === 'online') {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        query = query.eq('is_online', true).gte('last_seen', fiveMinutesAgo);
      } else if (filter === 'verified') {
        query = query.eq('is_verified', true);
      } else if (filter === 'unverified') {
        query = query.eq('is_verified', false);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
  });
};

const useUserVerificationStatus = (userId: string) => {
  return useQuery({
    queryKey: ['user-verification-status', userId],
    queryFn: async (): Promise<VerificationStatus> => {
      const { data, error } = await supabase
        .from('identity_verifications')
        .select('status, submitted_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { status: 'none', submitted_at: null };
      return {
        status: data.status as VerificationStatus['status'],
        submitted_at: data.submitted_at,
      };
    },
    enabled: !!userId,
  });
};

const useManualVerification = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('user_id', userId);
      if (profileError) throw profileError;

      const { error: verificationError } = await supabase
        .from('identity_verifications')
        .upsert(
          {
            user_id: userId,
            status: 'approved',
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString(),
            documents_deleted: true,
          },
          { onConflict: 'user_id' },
        );
      if (verificationError) throw verificationError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-verification-status'] });
      toast.success('Utilisateur vérifié manuellement');
    },
    onError: () => toast.error('Erreur lors de la vérification manuelle'),
  });
};

const useRequestVerification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data: existing } = await supabase
        .from('identity_verifications')
        .select('id, status')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing && existing.status === 'pending' && existing.id) {
        const { data: checkSubmitted } = await supabase
          .from('identity_verifications')
          .select('submitted_at')
          .eq('id', existing.id)
          .single();
        if (checkSubmitted?.submitted_at) {
          throw new Error('Une demande de vérification est déjà en attente de traitement');
        }
      }
      if (existing && existing.status === 'approved') {
        throw new Error("L'utilisateur est déjà vérifié");
      }

      if (existing) {
        const { error } = await supabase
          .from('identity_verifications')
          .update({
            status: 'pending',
            submitted_at: null,
            selfie_url: null,
            id_front_url: null,
            id_back_url: null,
            rejection_reason: null,
            reviewed_at: null,
            reviewed_by: null,
            documents_deleted: false,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('identity_verifications')
          .insert({ user_id: userId, status: 'pending' });
        if (error) throw error;
      }

      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'verification_request',
        title: "Vérification d'identité requise",
        message:
          "Un modérateur vous demande de vérifier votre identité. Veuillez soumettre vos documents pour continuer à utiliser l'application.",
        action_url: '/',
      });
      if (notifError) console.error('Error creating notification:', notifError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-verification-status'] });
      toast.success('Demande de vérification envoyée avec notification');
    },
    onError: (error: Error) => toast.error(error.message || "Erreur lors de l'envoi de la demande"),
  });
};

const useRevokeAndRequestVerification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_verified: false })
        .eq('user_id', userId);
      if (profileError) throw profileError;

      const { error: verificationError } = await supabase
        .from('identity_verifications')
        .update({
          status: 'pending',
          submitted_at: null,
          selfie_url: null,
          id_front_url: null,
          id_back_url: null,
          rejection_reason: 'Re-vérification demandée par un modérateur',
          reviewed_at: null,
          reviewed_by: null,
          documents_deleted: false,
        })
        .eq('user_id', userId);
      if (verificationError) throw verificationError;

      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'verification_request',
        title: '⚠️ Nouvelle vérification requise',
        message:
          "Un modérateur a des doutes sur votre identité et demande une nouvelle vérification. Veuillez soumettre de nouveaux documents pour continuer à utiliser l'application.",
        action_url: '/?tab=profile&showVerification=true',
      });
      if (notifError) console.error('Error creating notification:', notifError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-verification-status'] });
      toast.success('Vérification révoquée et nouvelle demande envoyée');
    },
    onError: () => toast.error('Erreur lors de la révocation'),
  });
};

interface UserManagementPanelProps {
  initialUserId?: string | null;
  onUserSelected?: (userId: string | null) => void;
}

const UserManagementPanel = ({ initialUserId, onUserSelected }: UserManagementPanelProps = {}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'suspend' | 'ban' | 'delete'>('suspend');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<SuspensionDuration>('24hours');
  const [viewingDossierUserId, setViewingDossierUserId] = useState<string | null>(initialUserId || null);

  useEffect(() => {
    if (initialUserId) setViewingDossierUserId(initialUserId);
  }, [initialUserId]);

  const { data: users, isLoading, refetch } = useAllUsers(search, filter);
  const suspendUser = useSuspendUser();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const recordEarning = useRecordEarning();
  const logAction = useLogModerationAction();
  const { data: taskRates } = useTaskRates();
  const suspensionRate = taskRates?.find((r) => r.task_type === 'user_suspension')?.rate_cents || 15;

  const handleOpenDossier = (userId: string) => {
    setViewingDossierUserId(userId);
    onUserSelected?.(userId);
  };
  const handleCloseDossier = () => {
    setViewingDossierUserId(null);
    onUserSelected?.(null);
  };

  const handleAction = (user: UserProfile, action: 'suspend' | 'ban' | 'delete') => {
    setSelectedUser(user);
    setActionType(action);
    setActionDialogOpen(true);
    setSuspensionReason('');
  };

  const stats = useMemo(() => {
    const list = users || [];
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    return {
      total: list.length,
      online: list.filter(
        (u) => u.is_online && u.last_seen && new Date(u.last_seen).getTime() > fiveMinAgo,
      ).length,
      verified: list.filter((u) => u.is_verified).length,
      unverified: list.filter((u) => !u.is_verified).length,
    };
  }, [users]);

  // Dossier vue : early return après tous les hooks
  if (viewingDossierUserId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleCloseDossier} className="gap-1.5">
          <ChevronLeft className="w-4 h-4" />
          Retour à la liste des utilisateurs
        </Button>
        <ClientDossierPanel userId={viewingDossierUserId} onClose={handleCloseDossier} />
      </div>
    );
  }

  const executeAction = async () => {
    if (!selectedUser) return;
    try {
      if (actionType === 'suspend') {
        await suspendUser.mutateAsync({
          userId: selectedUser.user_id,
          reason: suspensionReason.trim() || undefined,
          duration: selectedDuration,
        });
        await logAction.mutateAsync({
          targetUserId: selectedUser.user_id,
          actionType: 'user_suspended',
          details: `Suspension de ${selectedUser.username} (${suspensionDurations[selectedDuration].label})${suspensionReason ? `: ${suspensionReason}` : ''}`,
          metadata: { duration: selectedDuration, reason: suspensionReason },
        });
        const earned = await recordEarning.mutateAsync({
          taskType: 'user_suspension',
          targetUserId: selectedUser.user_id,
          description: `Suspension de ${selectedUser.username} (${suspensionDurations[selectedDuration].label})`,
        });
        if (earned) toast.success(`Utilisateur suspendu (+${formatCents(suspensionRate)})`);
      } else if (actionType === 'ban') {
        await blockUser.mutateAsync({
          userId: selectedUser.user_id,
          reason: suspensionReason.trim() || undefined,
        });
        await logAction.mutateAsync({
          targetUserId: selectedUser.user_id,
          actionType: 'user_suspended',
          details: `Bannissement permanent de ${selectedUser.username}${suspensionReason ? `: ${suspensionReason}` : ''}`,
          metadata: { permanent: true, reason: suspensionReason },
        });
        const earned = await recordEarning.mutateAsync({
          taskType: 'user_suspension',
          targetUserId: selectedUser.user_id,
          description: `Bannissement permanent de ${selectedUser.username}`,
        });
        if (earned) toast.success(`Utilisateur banni (+${formatCents(suspensionRate)})`);
      } else if (actionType === 'delete') {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('user_id', selectedUser.user_id);
        if (error) throw error;
        await logAction.mutateAsync({
          targetUserId: selectedUser.user_id,
          actionType: 'user_suspended',
          details: `Suppression du profil de ${selectedUser.username}${suspensionReason ? `: ${suspensionReason}` : ''}`,
          metadata: { deleted: true, reason: suspensionReason },
        });
        const earned = await recordEarning.mutateAsync({
          taskType: 'user_suspension',
          targetUserId: selectedUser.user_id,
          description: `Suppression du profil de ${selectedUser.username}`,
        });
        if (earned) toast.success(`Profil supprimé (+${formatCents(suspensionRate)})`);
        else toast.success('Profil supprimé');
        refetch();
      }
      setActionDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Action error:', error);
      toast.error("Erreur lors de l'action");
    }
  };

  const handleUnblock = async (userId: string, username: string) => {
    try {
      await unblockUser.mutateAsync(userId);
      await logAction.mutateAsync({
        targetUserId: userId,
        actionType: 'user_unblocked',
        details: `Déblocage de ${username}`,
      });
    } catch (error) {
      console.error('Unblock error:', error);
    }
  };

  const columns: AdminColumn<UserProfile>[] = [
    {
      key: 'user',
      header: 'Utilisateur',
      cell: (u) => <UserCellPrimary user={u} onOpenDossier={handleOpenDossier} />,
    },
    {
      key: 'verification',
      header: 'Vérification',
      cell: (u) => <VerificationBadgeCell user={u} />,
    },
    {
      key: 'region',
      header: 'Région',
      hideOnMobile: true,
      cell: (u) => (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {u.region}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Inscrit le',
      hideOnMobile: true,
      sortable: true,
      sortValue: (u) => new Date(u.created_at).getTime(),
      cell: (u) => (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {format(new Date(u.created_at), 'dd/MM/yyyy', { locale: fr })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (u) => (
        <UserActionsCell
          user={u}
          onAction={handleAction}
          onUnblock={handleUnblock}
          onOpenDossier={handleOpenDossier}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <AdminSectionHeader
        icon={Users}
        eyebrow="Communauté"
        title="Gestion des utilisateurs"
        action={
          <div className="flex items-center gap-1.5">
            <BackfillWelcomeEmailsButton />
            <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Rafraîchir">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total affichés" value={stats.total} icon={Users} accent="primary" />
        <StatTile label="En ligne" value={stats.online} icon={Wifi} accent="emerald" pulse={stats.online > 0} />
        <StatTile label="Vérifiés" value={stats.verified} icon={ShieldCheck} accent="blue" />
        <StatTile label="Non vérifiés" value={stats.unverified} icon={ShieldAlert} accent="orange" />
      </div>

      <AdminFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un utilisateur…"
        filters={
          <>
            <AdminFilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              Tous
            </AdminFilterChip>
            <AdminFilterChip active={filter === 'online'} onClick={() => setFilter('online')}>
              En ligne
            </AdminFilterChip>
            <AdminFilterChip active={filter === 'verified'} onClick={() => setFilter('verified')}>
              Vérifiés
            </AdminFilterChip>
            <AdminFilterChip active={filter === 'unverified'} onClick={() => setFilter('unverified')}>
              Non vérifiés
            </AdminFilterChip>
          </>
        }
      />

      <AdminTable
        data={users || []}
        columns={columns}
        rowKey={(u) => u.id}
        loading={isLoading}
        emptyIcon={Users}
        emptyTitle="Aucun utilisateur"
        emptyDescription="Aucun utilisateur ne correspond à ces critères."
        mobileCard={(u) => (
          <UserMobileCard
            user={u}
            onAction={handleAction}
            onUnblock={handleUnblock}
            onOpenDossier={handleOpenDossier}
          />
        )}
      />

      {/* Action Dialog (suspendre / bannir / supprimer) */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'suspend' && <Clock className="w-5 h-5 text-orange-500" />}
              {actionType === 'ban' && <Ban className="w-5 h-5 text-destructive" />}
              {actionType === 'delete' && <Trash2 className="w-5 h-5 text-destructive" />}
              {actionType === 'suspend' && "Suspendre l'utilisateur"}
              {actionType === 'ban' && 'Bannir définitivement'}
              {actionType === 'delete' && 'Supprimer le profil'}
            </DialogTitle>
            <DialogDescription>{selectedUser?.username}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType !== 'delete' && (
              <>
                <div className="space-y-2">
                  <Label>Raison (optionnel)</Label>
                  <Textarea
                    placeholder="Raison de l'action…"
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    rows={2}
                  />
                </div>

                {actionType === 'suspend' && (
                  <div className="space-y-2">
                    <Label>Durée de suspension</Label>
                    <Select
                      value={selectedDuration}
                      onValueChange={(v) => setSelectedDuration(v as SuspensionDuration)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(suspensionDurations).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {actionType === 'delete' && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">
                  Cette action supprimera le profil de l'utilisateur. Cette action est irréversible.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setActionDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                variant={actionType === 'delete' || actionType === 'ban' ? 'destructive' : 'default'}
                className="flex-1"
                onClick={executeAction}
                disabled={suspendUser.isPending || blockUser.isPending}
              >
                {suspendUser.isPending || blockUser.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Confirmer'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ───────────────────────────── Sub-cells ─────────────────────────────

const UserCellPrimary = ({
  user,
  onOpenDossier,
}: {
  user: UserProfile;
  onOpenDossier: (id: string) => void;
}) => {
  const { data: isBlocked } = useIsUserBlocked(user.user_id);
  return (
    <button
      type="button"
      onClick={() => onOpenDossier(user.user_id)}
      className="flex items-center gap-3 min-w-0 text-left hover:opacity-80 transition-opacity"
    >
      <div className="relative flex-shrink-0">
        <SecureAvatar
          src={user.avatar_url}
          alt={user.username}
          className="w-9 h-9"
          fallback={user.username?.charAt(0).toUpperCase() || '?'}
        />
        <span className="absolute -bottom-0.5 -right-0.5">
          <LiveOnlineDot
            profile={{ ...user, user_id: user.user_id }}
            size="sm"
            showOffline
            borderClassName="border-background"
          />
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-medium text-sm truncate flex items-center gap-1.5">
          {user.username}
          {isBlocked && (
            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
              <Ban className="w-2.5 h-2.5 mr-0.5" />
              Bloqué
            </Badge>
          )}
        </p>
        {user.age && <p className="text-[11px] text-muted-foreground">{user.age} ans</p>}
      </div>
    </button>
  );
};

const VerificationBadgeCell = ({ user }: { user: UserProfile }) => {
  const { data: verificationStatus } = useUserVerificationStatus(user.user_id);

  if (user.is_verified) {
    return (
      <Badge
        variant="outline"
        className="text-[11px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      >
        <CheckCircle className="w-3 h-3" />
        Vérifié
      </Badge>
    );
  }
  if (verificationStatus?.status === 'pending' && verificationStatus.submitted_at) {
    return (
      <Badge
        variant="outline"
        className="text-[11px] gap-1 bg-orange-500/10 text-orange-600 border-orange-500/30"
      >
        <Clock className="w-3 h-3" />
        En attente
      </Badge>
    );
  }
  if (verificationStatus?.status === 'pending' && !verificationStatus.submitted_at) {
    return (
      <Badge
        variant="outline"
        className="text-[11px] gap-1 bg-blue-500/10 text-blue-600 border-blue-500/30"
      >
        <Send className="w-3 h-3" />
        Demande envoyée
      </Badge>
    );
  }
  if (verificationStatus?.status === 'rejected') {
    return (
      <Badge
        variant="outline"
        className="text-[11px] gap-1 bg-destructive/10 text-destructive border-destructive/30"
      >
        <XCircle className="w-3 h-3" />
        Refusé
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[11px] gap-1 text-muted-foreground border-muted-foreground/30">
      <ShieldAlert className="w-3 h-3" />
      Non vérifié
    </Badge>
  );
};

const UserActionsCell = ({
  user,
  onAction,
  onUnblock,
  onOpenDossier,
}: {
  user: UserProfile;
  onAction: (u: UserProfile, a: 'suspend' | 'ban' | 'delete') => void;
  onUnblock: (id: string, username: string) => void;
  onOpenDossier: (id: string) => void;
}) => {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const { data: isBlocked } = useIsUserBlocked(user.user_id);
  const { data: verificationStatus } = useUserVerificationStatus(user.user_id);
  const manualVerification = useManualVerification();
  const requestVerification = useRequestVerification();
  const revokeAndRequestVerification = useRevokeAndRequestVerification();
  const logAction = useLogModerationAction();

  const handleManualVerify = async () => {
    await manualVerification.mutateAsync(user.user_id);
    await logAction.mutateAsync({
      targetUserId: user.user_id,
      actionType: 'manual_verification',
      details: `Vérification manuelle de ${user.username}`,
    });
  };
  const handleRequestVerification = async () => {
    await requestVerification.mutateAsync(user.user_id);
    await logAction.mutateAsync({
      targetUserId: user.user_id,
      actionType: 'verification_requested',
      details: `Demande de vérification envoyée à ${user.username}`,
    });
  };
  const handleRevokeAndRequestVerification = async () => {
    await revokeAndRequestVerification.mutateAsync(user.user_id);
    await logAction.mutateAsync({
      targetUserId: user.user_id,
      actionType: 'verification_requested',
      details: `Re-vérification demandée pour ${user.username} (utilisateur précédemment vérifié)`,
    });
  };

  return (
    <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      {isBlocked ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUnblock(user.user_id, user.username)}
          className="h-8 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
        >
          <ShieldOff className="w-3.5 h-3.5 mr-1" />
          Débloquer
        </Button>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 hidden md:inline-flex"
            onClick={() => onOpenDossier(user.user_id)}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpenDossier(user.user_id)}>
                <Eye className="w-4 h-4 mr-2" />
                Ouvrir le dossier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
                <Eye className="w-4 h-4 mr-2" />
                Voir le profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
                <Mail className="w-4 h-4 mr-2" />
                Envoyer un email
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              {!user.is_verified ? (
                <>
                  <DropdownMenuItem
                    onClick={handleManualVerify}
                    disabled={manualVerification.isPending}
                    className="text-emerald-600"
                  >
                    {manualVerification.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UserCheck className="w-4 h-4 mr-2" />
                    )}
                    Vérifier manuellement
                  </DropdownMenuItem>
                  {verificationStatus?.status !== 'pending' && (
                    <DropdownMenuItem
                      onClick={handleRequestVerification}
                      disabled={requestVerification.isPending}
                      className="text-blue-600"
                    >
                      {requestVerification.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Demander vérification
                    </DropdownMenuItem>
                  )}
                </>
              ) : (
                <DropdownMenuItem
                  onClick={handleRevokeAndRequestVerification}
                  disabled={revokeAndRequestVerification.isPending}
                  className="text-orange-600"
                >
                  {revokeAndRequestVerification.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 mr-2" />
                  )}
                  Demander re-vérification
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction(user, 'suspend')} className="text-orange-500">
                <Clock className="w-4 h-4 mr-2" />
                Suspendre
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction(user, 'ban')} className="text-destructive">
                <Ban className="w-4 h-4 mr-2" />
                Bannir définitivement
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction(user, 'delete')} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer le profil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      <UserProfileDialog user={user} open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
      <SendEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        userId={user.user_id}
        username={user.username}
      />
    </div>
  );
};

const UserMobileCard = ({
  user,
  onAction,
  onUnblock,
  onOpenDossier,
}: {
  user: UserProfile;
  onAction: (u: UserProfile, a: 'suspend' | 'ban' | 'delete') => void;
  onUnblock: (id: string, username: string) => void;
  onOpenDossier: (id: string) => void;
}) => {
  const { data: isBlocked } = useIsUserBlocked(user.user_id);
  return (
    <div
      className={cn(
        'rounded-2xl border p-3.5 transition-colors',
        isBlocked ? 'border-destructive/30 bg-destructive/5' : 'border-border/50 bg-card',
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onOpenDossier(user.user_id)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div className="relative flex-shrink-0">
            <SecureAvatar
              src={user.avatar_url}
              alt={user.username}
              className="w-11 h-11"
              fallback={user.username?.charAt(0).toUpperCase() || '?'}
            />
            <span className="absolute bottom-0 right-0">
              <LiveOnlineDot
                profile={{ ...user, user_id: user.user_id }}
                size="sm"
                showOffline
                borderClassName="border-background"
              />
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{user.username}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {user.age ? `${user.age} ans • ` : ''}
              {user.region}
            </p>
          </div>
        </button>
        <UserActionsCell
          user={user}
          onAction={onAction}
          onUnblock={onUnblock}
          onOpenDossier={onOpenDossier}
        />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <VerificationBadgeCell user={user} />
        <span className="text-[10px] text-muted-foreground">
          Inscrit {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: fr })}
        </span>
      </div>
    </div>
  );
};

export default UserManagementPanel;
