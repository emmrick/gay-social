import { useState, useMemo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  CreditCard,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useAllWithdrawalRequests,
  useProcessWithdrawal,
  formatCents,
  WithdrawalRequest,
} from '@/hooks/useModeratorEarnings';
import { cn } from '@/lib/utils';
import {
  AdminSectionHeader,
  StatTile,
  AdminFilterBar,
  AdminFilterChip,
  AdminTable,
  type AdminColumn,
} from './ui';

type WithdrawalWithProfile = WithdrawalRequest & {
  profile?: { username: string; avatar_url: string | null };
};

const statusBadge = {
  pending: { label: 'En attente', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock },
  approved: { label: 'Approuvé', className: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: CheckCircle },
  completed: { label: 'Payé', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: CheckCircle },
  rejected: { label: 'Refusé', className: 'bg-red-500/15 text-red-600 border-red-500/30', icon: XCircle },
} as const;

const WithdrawalRequestsPanel = () => {
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'completed' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalWithProfile | null>(null);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: withdrawals, isLoading } = useAllWithdrawalRequests();
  const processWithdrawal = useProcessWithdrawal();

  const filteredWithdrawals = useMemo(() => {
    const list = withdrawals || [];
    return list
      .filter((w) => (selectedStatus === 'all' ? true : w.status === selectedStatus))
      .filter((w) =>
        searchQuery
          ? w.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.payment_reference?.toLowerCase().includes(searchQuery.toLowerCase())
          : true,
      );
  }, [withdrawals, selectedStatus, searchQuery]);

  const stats = useMemo(() => {
    const list = withdrawals || [];
    return {
      pending: list.filter((w) => w.status === 'pending').length,
      approved: list.filter((w) => w.status === 'approved').length,
      completed: list.filter((w) => w.status === 'completed').length,
      rejected: list.filter((w) => w.status === 'rejected').length,
      pendingAmount: list
        .filter((w) => w.status === 'pending')
        .reduce((s, w) => s + (w.amount_cents || 0), 0),
    };
  }, [withdrawals]);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    await processWithdrawal.mutateAsync({ requestId: selectedRequest.id, status: 'approved' });
    setApproveDialog(false);
    setSelectedRequest(null);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    await processWithdrawal.mutateAsync({
      requestId: selectedRequest.id,
      status: 'rejected',
      rejectionReason: rejectionReason || 'Demande refusée',
    });
    setRejectDialog(false);
    setRejectionReason('');
    setSelectedRequest(null);
  };

  const handleComplete = async () => {
    if (!selectedRequest) return;
    await processWithdrawal.mutateAsync({
      requestId: selectedRequest.id,
      status: 'completed',
      paymentReference: paymentReference || undefined,
    });
    setCompleteDialog(false);
    setPaymentReference('');
    setSelectedRequest(null);
  };

  const columns: AdminColumn<WithdrawalWithProfile>[] = [
    {
      key: 'user',
      header: 'Modérateur',
      cell: (w) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarImage src={w.profile?.avatar_url || undefined} />
            <AvatarFallback>{w.profile?.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{w.profile?.username || 'Inconnu'}</p>
            {w.payment_reference && (
              <p className="text-[11px] text-muted-foreground font-mono truncate inline-flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {w.payment_reference}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Montant',
      sortable: true,
      sortValue: (w) => w.amount_cents,
      cell: (w) => (
        <span className="font-semibold text-primary tabular-nums">{formatCents(w.amount_cents)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (w) => {
        const cfg = statusBadge[w.status];
        const Icon = cfg.icon;
        return (
          <Badge variant="outline" className={cn('text-[11px] inline-flex items-center gap-1', cfg.className)}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: 'requested',
      header: 'Demandé',
      sortable: true,
      sortValue: (w) => new Date(w.requested_at).getTime(),
      hideOnMobile: true,
      cell: (w) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(w.requested_at), { addSuffix: true, locale: fr })}
        </span>
      ),
    },
    {
      key: 'processed',
      header: 'Traité',
      hideOnMobile: true,
      cell: (w) =>
        w.processed_at ? (
          <span className="text-xs text-muted-foreground">
            {format(new Date(w.processed_at), 'dd MMM yy', { locale: fr })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (w) => (
        <div className="flex justify-end gap-1.5">
          {w.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-red-600 border-red-500/30 hover:bg-red-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRequest(w);
                  setRejectDialog(true);
                }}
              >
                <XCircle className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                className="h-8 px-2.5 bg-blue-600 hover:bg-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRequest(w);
                  setApproveDialog(true);
                }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {w.status === 'approved' && (
            <Button
              size="sm"
              className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRequest(w);
                setCompleteDialog(true);
              }}
            >
              <CreditCard className="w-3.5 h-3.5 mr-1" />
              Payé
            </Button>
          )}
          {w.rejection_reason && w.status === 'rejected' && (
            <span className="text-[11px] text-red-600 truncate max-w-[160px]">{w.rejection_reason}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <AdminSectionHeader
        icon={ArrowUpRight}
        eyebrow="Modération"
        title="Demandes de retrait"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="En attente" value={stats.pending} icon={Clock} accent="orange" />
        <StatTile
          label="Montant en attente"
          value={formatCents(stats.pendingAmount)}
          icon={CreditCard}
          accent="emerald"
        />
        <StatTile label="Approuvés" value={stats.approved} icon={CheckCircle} accent="blue" />
        <StatTile label="Payés" value={stats.completed} icon={CreditCard} accent="violet" />
      </div>

      {/* Filtres */}
      <AdminFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Rechercher modérateur ou référence…"
        filters={
          <>
            <AdminFilterChip
              active={selectedStatus === 'pending'}
              onClick={() => setSelectedStatus('pending')}
              count={stats.pending}
            >
              En attente
            </AdminFilterChip>
            <AdminFilterChip
              active={selectedStatus === 'approved'}
              onClick={() => setSelectedStatus('approved')}
              count={stats.approved}
            >
              Approuvés
            </AdminFilterChip>
            <AdminFilterChip
              active={selectedStatus === 'completed'}
              onClick={() => setSelectedStatus('completed')}
            >
              Payés
            </AdminFilterChip>
            <AdminFilterChip
              active={selectedStatus === 'rejected'}
              onClick={() => setSelectedStatus('rejected')}
            >
              Refusés
            </AdminFilterChip>
            <AdminFilterChip active={selectedStatus === 'all'} onClick={() => setSelectedStatus('all')}>
              Tous
            </AdminFilterChip>
          </>
        }
      />

      <AdminTable
        data={filteredWithdrawals}
        columns={columns}
        rowKey={(w) => w.id}
        loading={isLoading}
        emptyIcon={ArrowUpRight}
        emptyTitle="Aucune demande"
        emptyDescription="Aucune demande de retrait ne correspond à ces critères."
        mobileCard={(w) => {
          const cfg = statusBadge[w.status];
          const StatusIcon = cfg.icon;
          return (
            <div className="rounded-2xl border border-border/50 bg-card p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={w.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {w.profile?.username?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{w.profile?.username || 'Inconnu'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(w.requested_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-[10px] gap-1', cfg.className)}>
                  <StatusIcon className="w-3 h-3" />
                  {cfg.label}
                </Badge>
              </div>
              <p className="text-xl font-bold text-primary tabular-nums">{formatCents(w.amount_cents)}</p>
              {w.rejection_reason && (
                <p className="text-[11px] text-red-600">Raison : {w.rejection_reason}</p>
              )}
              {w.payment_reference && (
                <p className="text-[11px] text-emerald-600 font-mono inline-flex items-center gap-1">
                  <FileText className="w-3 h-3" /> {w.payment_reference}
                </p>
              )}
              {w.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-red-600 border-red-500/30"
                    onClick={() => {
                      setSelectedRequest(w);
                      setRejectDialog(true);
                    }}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Refuser
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setSelectedRequest(w);
                      setApproveDialog(true);
                    }}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Approuver
                  </Button>
                </div>
              )}
              {w.status === 'approved' && (
                <Button
                  size="sm"
                  className="w-full h-8 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setSelectedRequest(w);
                    setCompleteDialog(true);
                  }}
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                  Marquer payé
                </Button>
              )}
            </div>
          );
        }}
      />

      {/* Approve Dialog */}
      <AlertDialog open={approveDialog} onOpenChange={setApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              Approuver la demande ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Approuver la demande de retrait de{' '}
              <span className="font-medium">{selectedRequest?.profile?.username}</span> pour un montant
              de{' '}
              <span className="font-medium text-primary">
                {formatCents(selectedRequest?.amount_cents || 0)}
              </span>
              .
              <br />
              <br />
              Une fois approuvée, vous devrez effectuer le paiement et marquer la demande comme "Payée".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={processWithdrawal.isPending}>
              {processWithdrawal.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Approuver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Refuser la demande
            </DialogTitle>
            <DialogDescription>
              Refuser la demande de {selectedRequest?.profile?.username} pour{' '}
              {formatCents(selectedRequest?.amount_cents || 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                <p className="text-sm text-orange-600">
                  Le montant sera remboursé dans le portefeuille du modérateur.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Raison du refus</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Expliquez la raison du refus…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processWithdrawal.isPending}>
              {processWithdrawal.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Payment Dialog */}
      <Dialog open={completeDialog} onOpenChange={setCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              Marquer comme payé
            </DialogTitle>
            <DialogDescription>
              Confirmer le paiement de {formatCents(selectedRequest?.amount_cents || 0)} à{' '}
              {selectedRequest?.profile?.username}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-reference">Référence de paiement (optionnel)</Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Ex: VIREMENT-2024-001, PayPal-xxx…"
              />
              <p className="text-xs text-muted-foreground">
                Ajoutez une référence pour le suivi du paiement
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleComplete}
              disabled={processWithdrawal.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processWithdrawal.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Confirmer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WithdrawalRequestsPanel;
