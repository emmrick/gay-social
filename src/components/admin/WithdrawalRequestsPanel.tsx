import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  User,
  CreditCard,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAllWithdrawalRequests,
  useProcessWithdrawal,
  formatCents,
  WithdrawalRequest,
} from '@/hooks/useModeratorEarnings';

type WithdrawalWithProfile = WithdrawalRequest & { 
  profile?: { username: string; avatar_url: string | null } 
};

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Approuvé', color: 'bg-blue-500', icon: CheckCircle },
  completed: { label: 'Payé', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'Refusé', color: 'bg-red-500', icon: XCircle },
};

const WithdrawalRequestsPanel = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalWithProfile | null>(null);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: withdrawals, isLoading } = useAllWithdrawalRequests();
  const processWithdrawal = useProcessWithdrawal();

  const filteredWithdrawals = withdrawals?.filter(w => 
    selectedStatus === 'all' ? true : w.status === selectedStatus
  );

  const pendingCount = withdrawals?.filter(w => w.status === 'pending').length || 0;
  const approvedCount = withdrawals?.filter(w => w.status === 'approved').length || 0;

  const handleApprove = async () => {
    if (!selectedRequest) return;
    await processWithdrawal.mutateAsync({
      requestId: selectedRequest.id,
      status: 'approved',
    });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <ArrowUpRight className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Demandes de retrait</h2>
          <p className="text-sm text-muted-foreground">
            Gérez les demandes de paiement des modérateurs
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">En attente</span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Approuvés</span>
          </div>
          <p className="text-2xl font-bold text-blue-500">{approvedCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Payés</span>
          </div>
          <p className="text-2xl font-bold text-green-500">
            {withdrawals?.filter(w => w.status === 'completed').length || 0}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-muted-foreground">Refusés</span>
          </div>
          <p className="text-2xl font-bold text-red-500">
            {withdrawals?.filter(w => w.status === 'rejected').length || 0}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="pending" className="gap-1">
            <Clock className="w-3 h-3" />
            En attente
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            Approuvés
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1">
            <CreditCard className="w-3 h-3" />
            Payés
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1">
            <XCircle className="w-3 h-3" />
            Refusés
          </TabsTrigger>
          <TabsTrigger value="all">Tous</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="mt-4">
          <ScrollArea className="h-[400px]">
            {!filteredWithdrawals?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowUpRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune demande de retrait</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWithdrawals.map((withdrawal) => (
                  <WithdrawalCard
                    key={withdrawal.id}
                    withdrawal={withdrawal}
                    onApprove={() => {
                      setSelectedRequest(withdrawal);
                      setApproveDialog(true);
                    }}
                    onReject={() => {
                      setSelectedRequest(withdrawal);
                      setRejectDialog(true);
                    }}
                    onComplete={() => {
                      setSelectedRequest(withdrawal);
                      setCompleteDialog(true);
                    }}
                    isProcessing={processWithdrawal.isPending}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <AlertDialog open={approveDialog} onOpenChange={setApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              Approuver la demande ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point d'approuver la demande de retrait de{' '}
              <span className="font-medium">{selectedRequest?.profile?.username}</span> pour un montant de{' '}
              <span className="font-medium text-primary">{formatCents(selectedRequest?.amount_cents || 0)}</span>.
              <br /><br />
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
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
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
                placeholder="Expliquez la raison du refus..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={processWithdrawal.isPending}
            >
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
              <CreditCard className="w-5 h-5 text-green-500" />
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
                placeholder="Ex: VIREMENT-2024-001, PayPal-xxx..."
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
              className="bg-green-600 hover:bg-green-700"
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

// Withdrawal Card Component
const WithdrawalCard = ({
  withdrawal,
  onApprove,
  onReject,
  onComplete,
  isProcessing,
}: {
  withdrawal: WithdrawalWithProfile;
  onApprove: () => void;
  onReject: () => void;
  onComplete: () => void;
  isProcessing: boolean;
}) => {
  const status = statusConfig[withdrawal.status];
  const StatusIcon = status.icon;

  return (
    <div className="p-4 rounded-xl border bg-card hover:bg-secondary/30 transition-colors">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Avatar className="w-12 h-12">
          <AvatarImage src={withdrawal.profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20">
            <User className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">
              {withdrawal.profile?.username || 'Utilisateur inconnu'}
            </span>
            <Badge 
              variant="outline" 
              className={`${status.color} bg-opacity-20 text-xs`}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <p className="text-2xl font-bold text-primary mt-1">
            {formatCents(withdrawal.amount_cents)}
          </p>
          <p className="text-xs text-muted-foreground">
            Demandé {formatDistanceToNow(new Date(withdrawal.requested_at), { addSuffix: true, locale: fr })}
          </p>
          
          {withdrawal.processed_at && (
            <p className="text-xs text-muted-foreground">
              Traité le {format(new Date(withdrawal.processed_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
            </p>
          )}
          
          {withdrawal.rejection_reason && (
            <p className="text-xs text-red-500 mt-1">
              Raison: {withdrawal.rejection_reason}
            </p>
          )}
          
          {withdrawal.payment_reference && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Réf: {withdrawal.payment_reference}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {withdrawal.status === 'pending' && (
            <>
              <Button
                size="sm"
                onClick={onApprove}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approuver
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onReject}
                disabled={isProcessing}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Refuser
              </Button>
            </>
          )}
          {withdrawal.status === 'approved' && (
            <Button
              size="sm"
              onClick={onComplete}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="w-4 h-4 mr-1" />
              Payé
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WithdrawalRequestsPanel;
