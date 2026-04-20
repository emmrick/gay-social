import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ShoppingCart,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Euro,
  Coins,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  notifyCreditPurchaseApproved,
  notifyCreditPurchaseRejected,
} from '@/services/pushNotificationService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AdminSectionHeader,
  StatTile,
  AdminFilterBar,
  AdminFilterChip,
  AdminTable,
  type AdminColumn,
} from './ui';

interface Profile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  region: string;
}

interface PurchaseRequest {
  id: string;
  user_id: string;
  amount: number;
  price_euros: number;
  payment_method: string | null;
  payment_reference: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  profile?: Profile;
}

const statusBadge = {
  pending: { label: 'En attente', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  approved: { label: 'Validé', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  rejected: { label: 'Rejeté', className: 'bg-red-500/15 text-red-600 border-red-500/30' },
} as const;

const CreditPurchaseRequestsPanel = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isApproving, setIsApproving] = useState(true);
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-credit-purchase-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('credit_purchase_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      const { data, error } = await query;
      if (error) throw error;

      const userIds = data?.map((r) => r.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, region')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
      return data?.map((r) => ({ ...r, profile: profileMap.get(r.user_id) })) as PurchaseRequest[];
    },
    refetchInterval: 30000,
  });

  const processMutation = useMutation({
    mutationFn: async ({ requestId, approve }: { requestId: string; approve: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const request = requests.find((r) => r.id === requestId);
      if (!request) throw new Error('Request not found');

      const { error: updateError } = await supabase
        .from('credit_purchase_requests')
        .update({
          status: approve ? 'approved' : 'rejected',
          admin_notes: adminNotes || null,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      if (updateError) throw updateError;

      if (approve) {
        const { error: creditError } = await supabase.rpc('add_credits', {
          _user_id: request.user_id,
          _amount: request.amount,
          _credit_type: 'purchased',
          _transaction_type: 'purchase',
          _description: `Achat de ${request.amount} crédits (${request.price_euros}€)`,
        });
        if (creditError) throw creditError;
        await notifyCreditPurchaseApproved(request.user_id, request.amount, request.price_euros);
      } else {
        await notifyCreditPurchaseRejected(request.user_id, adminNotes || undefined);
      }
    },
    onSuccess: (_, { approve }) => {
      toast.success(approve ? 'Achat validé ! Crédits ajoutés.' : 'Demande rejetée.');
      queryClient.invalidateQueries({ queryKey: ['admin-credit-purchase-requests'] });
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes('');
    },
    onError: (error: Error) => toast.error(error.message || 'Erreur lors du traitement'),
  });

  const filteredRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.profile?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.payment_reference?.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [requests, searchQuery],
  );

  const stats = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
      totalPending: requests.filter((r) => r.status === 'pending').reduce((s, r) => s + r.price_euros, 0),
    }),
    [requests],
  );

  const openProcessDialog = (request: PurchaseRequest, approve: boolean) => {
    setSelectedRequest(request);
    setIsApproving(approve);
    setAdminNotes('');
    setIsDialogOpen(true);
  };

  const columns: AdminColumn<PurchaseRequest>[] = [
    {
      key: 'user',
      header: 'Utilisateur',
      cell: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-9 h-9 flex-shrink-0">
            {r.profile?.avatar_url ? (
              <AvatarImage src={r.profile.avatar_url} alt={r.profile.username} />
            ) : (
              <AvatarFallback>{r.profile?.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{r.profile?.username || 'Inconnu'}</p>
            {r.payment_reference && (
              <p className="text-[11px] text-muted-foreground font-mono truncate">{r.payment_reference}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Crédits',
      sortable: true,
      sortValue: (r) => r.amount,
      cell: (r) => (
        <span className="inline-flex items-center gap-1 font-medium">
          <Coins className="w-3.5 h-3.5 text-primary" />
          {r.amount}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Prix',
      sortable: true,
      sortValue: (r) => r.price_euros,
      cell: (r) => <span className="font-semibold tabular-nums">{r.price_euros.toFixed(2)} €</span>,
    },
    {
      key: 'method',
      header: 'Méthode',
      hideOnMobile: true,
      cell: (r) => <span className="text-muted-foreground capitalize">{r.payment_method || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (r) => (
        <Badge variant="outline" className={cn('text-[11px]', statusBadge[r.status].className)}>
          {statusBadge[r.status].label}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Demandé',
      sortable: true,
      sortValue: (r) => new Date(r.created_at).getTime(),
      hideOnMobile: true,
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (r) =>
        r.status === 'pending' ? (
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-red-600 hover:bg-red-500/10 hover:text-red-700 border-red-500/30"
              onClick={(e) => {
                e.stopPropagation();
                openProcessDialog(r, false);
              }}
            >
              <XCircle className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={(e) => {
                e.stopPropagation();
                openProcessDialog(r, true);
              }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : r.admin_notes ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <MessageSquare className="w-3 h-3" />
            <span className="truncate max-w-[140px]">{r.admin_notes}</span>
          </span>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <AdminSectionHeader
        icon={ShoppingCart}
        eyebrow="Monétisation"
        title="Demandes d'achat de crédits"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="En attente" value={stats.pending} icon={Clock} accent="orange" />
        <StatTile label="Montant en attente" value={`${stats.totalPending.toFixed(2)} €`} icon={Euro} accent="emerald" />
        <StatTile label="Validés" value={stats.approved} icon={CheckCircle} accent="blue" />
        <StatTile label="Rejetés" value={stats.rejected} icon={XCircle} accent="red" />
      </div>

      {/* Filtres */}
      <AdminFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Rechercher par nom ou référence…"
        filters={
          <>
            <AdminFilterChip
              active={statusFilter === 'pending'}
              onClick={() => setStatusFilter('pending')}
              count={stats.pending}
            >
              En attente
            </AdminFilterChip>
            <AdminFilterChip
              active={statusFilter === 'approved'}
              onClick={() => setStatusFilter('approved')}
            >
              Validés
            </AdminFilterChip>
            <AdminFilterChip
              active={statusFilter === 'rejected'}
              onClick={() => setStatusFilter('rejected')}
            >
              Rejetés
            </AdminFilterChip>
            <AdminFilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
              Tous
            </AdminFilterChip>
          </>
        }
      />

      <AdminTable
        data={filteredRequests}
        columns={columns}
        rowKey={(r) => r.id}
        loading={isLoading}
        emptyIcon={ShoppingCart}
        emptyTitle="Aucune demande"
        emptyDescription="Aucune demande d'achat ne correspond à ces critères."
        mobileCard={(r) => (
          <div className="rounded-2xl border border-border/50 bg-card p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  {r.profile?.avatar_url ? (
                    <AvatarImage src={r.profile.avatar_url} />
                  ) : (
                    <AvatarFallback>{r.profile?.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{r.profile?.username || 'Inconnu'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={cn('text-[10px]', statusBadge[r.status].className)}>
                {statusBadge[r.status].label}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1 font-medium">
                <Coins className="w-3.5 h-3.5 text-primary" />
                {r.amount} crédits
              </span>
              <span className="font-semibold">{r.price_euros.toFixed(2)} €</span>
            </div>
            {r.status === 'pending' && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-red-600 border-red-500/30"
                  onClick={() => openProcessDialog(r, false)}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Rejeter
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => openProcessDialog(r, true)}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Valider
                </Button>
              </div>
            )}
          </div>
        )}
      />

      {/* Dialog de traitement (inchangé fonctionnellement) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isApproving ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  Valider l'achat
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  Rejeter la demande
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isApproving
                ? `Valider l'achat de ${selectedRequest?.amount} crédits pour ${selectedRequest?.profile?.username} ?`
                : `Rejeter la demande de ${selectedRequest?.profile?.username} ?`}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="w-10 h-10">
                    {selectedRequest.profile?.avatar_url ? (
                      <AvatarImage src={selectedRequest.profile.avatar_url} />
                    ) : (
                      <AvatarFallback>
                        {selectedRequest.profile?.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedRequest.profile?.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedRequest.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Crédits :</span>
                    <span className="ml-2 font-medium">{selectedRequest.amount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Prix :</span>
                    <span className="ml-2 font-medium">{selectedRequest.price_euros}€</span>
                  </div>
                  {selectedRequest.payment_method && (
                    <div>
                      <span className="text-muted-foreground">Méthode :</span>
                      <span className="ml-2">{selectedRequest.payment_method}</span>
                    </div>
                  )}
                  {selectedRequest.payment_reference && (
                    <div>
                      <span className="text-muted-foreground">Ref :</span>
                      <span className="ml-2 font-mono text-xs">{selectedRequest.payment_reference}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes admin (optionnel)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    isApproving
                      ? 'Ex: Paiement vérifié via PayPal'
                      : 'Ex: Référence de paiement non trouvée'
                  }
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() =>
                selectedRequest &&
                processMutation.mutate({ requestId: selectedRequest.id, approve: isApproving })
              }
              disabled={processMutation.isPending}
              className={isApproving ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : isApproving ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {isApproving ? 'Valider' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditPurchaseRequestsPanel;
