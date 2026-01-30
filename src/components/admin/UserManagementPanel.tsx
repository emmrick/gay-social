import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  Search,
  Loader2,
  Eye,
  Ban,
  Shield,
  ShieldOff,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Mail,
  MoreVertical,
  ExternalLink,
  Crown,
  Trash2,
  RefreshCw,
  Euro,
  Send,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import UserProfileDialog from './UserProfileDialog';
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
        query = query.eq('is_online', true);
      } else if (filter === 'verified') {
        query = query.eq('is_verified', true);
      } else if (filter === 'unverified') {
        query = query.eq('is_verified', false);
      } else if (filter === 'premium') {
        query = query.eq('is_premium', true);
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
      
      if (!data) {
        return { status: 'none', submitted_at: null };
      }
      
      return {
        status: data.status as VerificationStatus['status'],
        submitted_at: data.submitted_at,
      };
    },
    enabled: !!userId,
  });
};

// Hook to manually verify a user without documents
const useManualVerification = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Update profile to verified
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Create or update verification record as approved
      const { error: verificationError } = await supabase
        .from('identity_verifications')
        .upsert({
          user_id: userId,
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          documents_deleted: true, // No documents needed
        }, { onConflict: 'user_id' });

      if (verificationError) throw verificationError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-verification-status'] });
      toast.success('Utilisateur vérifié manuellement');
    },
    onError: () => {
      toast.error('Erreur lors de la vérification manuelle');
    },
  });
};

// Hook to request verification from a user
const useRequestVerification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Check if a verification record exists
      const { data: existing } = await supabase
        .from('identity_verifications')
        .select('id, status')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing && existing.status === 'pending' && existing.id) {
        // Already has pending verification with submitted documents
        const { data: checkSubmitted } = await supabase
          .from('identity_verifications')
          .select('submitted_at')
          .eq('id', existing.id)
          .single();
        
        if (checkSubmitted?.submitted_at) {
          throw new Error('Une demande de vérification est déjà en attente de traitement');
        }
        // Otherwise it's a pending request awaiting user submission - allow re-send notification
      }

      if (existing && existing.status === 'approved') {
        throw new Error('L\'utilisateur est déjà vérifié');
      }

      // If existing record (rejected or pending without submission), update it
      // Otherwise create new record
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
          .insert({
            user_id: userId,
            status: 'pending',
          });

        if (error) throw error;
      }

      // Create notification for the user
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'verification_request',
        title: 'Vérification d\'identité requise',
        message: 'Un modérateur vous demande de vérifier votre identité. Veuillez soumettre vos documents pour continuer à utiliser l\'application.',
        action_url: '/profile',
      });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-verification-status'] });
      toast.success('Demande de vérification envoyée avec notification');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'envoi de la demande');
    },
  });
};

const UserManagementPanel = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'suspend' | 'ban' | 'delete'>('suspend');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<SuspensionDuration>('24hours');

  const { data: users, isLoading, refetch } = useAllUsers(search, filter);
  const suspendUser = useSuspendUser();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const { data: isSelectedUserBlocked } = useIsUserBlocked(selectedUser?.user_id || '');
  const recordEarning = useRecordEarning();
  const logAction = useLogModerationAction();
  const { data: taskRates } = useTaskRates();
  const suspensionRate = taskRates?.find(r => r.task_type === 'user_suspension')?.rate_cents || 15;

  const handleAction = (user: UserProfile, action: 'suspend' | 'ban' | 'delete') => {
    setSelectedUser(user);
    setActionType(action);
    setActionDialogOpen(true);
    setSuspensionReason('');
  };

  const executeAction = async () => {
    if (!selectedUser) return;

    try {
      if (actionType === 'suspend') {
        await suspendUser.mutateAsync({
          userId: selectedUser.user_id,
          reason: suspensionReason.trim() || undefined,
          duration: selectedDuration,
        });
        
        // Log action
        await logAction.mutateAsync({
          targetUserId: selectedUser.user_id,
          actionType: 'user_suspended',
          details: `Suspension de ${selectedUser.username} (${suspensionDurations[selectedDuration].label})${suspensionReason ? `: ${suspensionReason}` : ''}`,
          metadata: { duration: selectedDuration, reason: suspensionReason },
        });
        
        // Record earning for suspension
        const earned = await recordEarning.mutateAsync({
          taskType: 'user_suspension',
          targetUserId: selectedUser.user_id,
          description: `Suspension de ${selectedUser.username} (${suspensionDurations[selectedDuration].label})`,
        });
        
        if (earned) {
          toast.success(`Utilisateur suspendu (+${formatCents(suspensionRate)})`);
        }
      } else if (actionType === 'ban') {
        await blockUser.mutateAsync({
          userId: selectedUser.user_id,
          reason: suspensionReason.trim() || undefined,
        });
        
        // Log action
        await logAction.mutateAsync({
          targetUserId: selectedUser.user_id,
          actionType: 'user_suspended',
          details: `Bannissement permanent de ${selectedUser.username}${suspensionReason ? `: ${suspensionReason}` : ''}`,
          metadata: { permanent: true, reason: suspensionReason },
        });
        
        // Record earning for ban
        const earned = await recordEarning.mutateAsync({
          taskType: 'user_suspension',
          targetUserId: selectedUser.user_id,
          description: `Bannissement permanent de ${selectedUser.username}`,
        });
        
        if (earned) {
          toast.success(`Utilisateur banni (+${formatCents(suspensionRate)})`);
        }
      } else if (actionType === 'delete') {
        // Suppression du profil (l'utilisateur ne sera pas supprimé de auth)
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('user_id', selectedUser.user_id);
        
        if (error) throw error;
        toast.success('Profil supprimé');
        refetch();
      }
      setActionDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Action error:', error);
      toast.error('Erreur lors de l\'action');
    }
  };

  const handleUnblock = async (userId: string, username: string) => {
    try {
      await unblockUser.mutateAsync(userId);
      
      // Log action
      await logAction.mutateAsync({
        targetUserId: userId,
        actionType: 'user_unblocked',
        details: `Déblocage de ${username}`,
      });
    } catch (error) {
      console.error('Unblock error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Gestion des utilisateurs</h2>
          <p className="text-sm text-muted-foreground">
            {users?.length || 0} utilisateur(s) trouvé(s)
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => refetch()}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrer par..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            <SelectItem value="online">En ligne</SelectItem>
            <SelectItem value="verified">Vérifiés</SelectItem>
            <SelectItem value="unverified">Non vérifiés</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      <ScrollArea className="h-[500px]">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : users?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users?.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onAction={handleAction}
                onUnblock={handleUnblock}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'suspend' && <Clock className="w-5 h-5 text-orange-500" />}
              {actionType === 'ban' && <Ban className="w-5 h-5 text-destructive" />}
              {actionType === 'delete' && <Trash2 className="w-5 h-5 text-destructive" />}
              {actionType === 'suspend' && 'Suspendre l\'utilisateur'}
              {actionType === 'ban' && 'Bannir définitivement'}
              {actionType === 'delete' && 'Supprimer le profil'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType !== 'delete' && (
              <>
                <div className="space-y-2">
                  <Label>Raison (optionnel)</Label>
                  <Textarea
                    placeholder="Raison de l'action..."
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    rows={2}
                  />
                </div>

                {actionType === 'suspend' && (
                  <div className="space-y-2">
                    <Label>Durée de suspension</Label>
                    <Select value={selectedDuration} onValueChange={(v) => setSelectedDuration(v as SuspensionDuration)}>
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
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">
                  Cette action supprimera le profil de l'utilisateur. Cette action est irréversible.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setActionDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                variant={actionType === 'delete' || actionType === 'ban' ? 'destructive' : 'default'}
                className="flex-1"
                onClick={executeAction}
                disabled={suspendUser.isPending || blockUser.isPending}
              >
                {(suspendUser.isPending || blockUser.isPending) ? (
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

// User Card Component
const UserCard = ({
  user,
  onAction,
  onUnblock,
}: {
  user: UserProfile;
  onAction: (user: UserProfile, action: 'suspend' | 'ban' | 'delete') => void;
  onUnblock: (userId: string, username: string) => void;
}) => {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const { data: isBlocked } = useIsUserBlocked(user.user_id);
  const { data: verificationStatus } = useUserVerificationStatus(user.user_id);
  const manualVerification = useManualVerification();
  const requestVerification = useRequestVerification();
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

  const getVerificationBadge = () => {
    if (user.is_verified) {
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <CheckCircle className="w-3 h-3" />
          Vérifié
        </Badge>
      );
    }

    if (verificationStatus?.status === 'pending' && verificationStatus.submitted_at) {
      return (
        <Badge variant="outline" className="text-xs gap-1 border-orange-500/50 text-orange-500">
          <Clock className="w-3 h-3" />
          En attente
        </Badge>
      );
    }

    if (verificationStatus?.status === 'pending' && !verificationStatus.submitted_at) {
      return (
        <Badge variant="outline" className="text-xs gap-1 border-blue-500/50 text-blue-500">
          <Send className="w-3 h-3" />
          Demande envoyée
        </Badge>
      );
    }

    if (verificationStatus?.status === 'rejected') {
      return (
        <Badge variant="outline" className="text-xs gap-1 border-destructive/50 text-destructive">
          <XCircle className="w-3 h-3" />
          Refusé
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs gap-1 border-muted-foreground/50 text-muted-foreground">
        <ShieldAlert className="w-3 h-3" />
        Non vérifié
      </Badge>
    );
  };

  return (
    <div className={`p-4 rounded-lg border ${isBlocked ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'} hover:bg-secondary/30 transition-colors`}>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.avatar_url || ''} />
            <AvatarFallback>
              {user.username?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          {user.is_online && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{user.username}</p>
            {getVerificationBadge()}
            {user.is_premium && (
              <Badge className="text-xs gap-1 bg-gradient-to-r from-primary to-accent">
                <Crown className="w-3 h-3" />
                Premium
              </Badge>
            )}
            {isBlocked && (
              <Badge variant="destructive" className="text-xs gap-1">
                <Ban className="w-3 h-3" />
                Bloqué
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
            {user.age && <span>{user.age} ans</span>}
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {user.region}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: fr })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isBlocked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUnblock(user.user_id, user.username)}
              className="border-green-500/50 text-green-500 hover:bg-green-500/10"
            >
              <ShieldOff className="w-4 h-4 mr-1" />
              Débloquer
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Voir le profil
                </DropdownMenuItem>
                
                {/* Verification actions - only for non-verified users */}
                {!user.is_verified && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleManualVerify}
                      disabled={manualVerification.isPending}
                      className="text-green-600"
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
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onAction(user, 'suspend')}
                  className="text-orange-500"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Suspendre
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction(user, 'ban')}
                  className="text-destructive"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Bannir définitivement
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onAction(user, 'delete')}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer le profil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Profile Dialog */}
      <UserProfileDialog
        user={user}
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
      />
    </div>
  );
};

export default UserManagementPanel;
