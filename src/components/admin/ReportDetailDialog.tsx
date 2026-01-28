import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Flag, 
  Calendar, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Eye,
  Loader2,
  Ban,
  ShieldOff
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ReportWithProfiles, 
  ReportStatus, 
  useUpdateReportStatus,
  useBlockUser,
  useIsUserBlocked,
  useUnblockUser
} from '@/hooks/useAdmin';
import { reportReasonLabels, reportReasonDescriptions } from '@/hooks/useReports';

interface ReportDetailDialogProps {
  report: ReportWithProfiles;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<ReportStatus, string> = {
  pending: 'En attente',
  reviewed: 'En cours d\'examen',
  resolved: 'Résolu',
  dismissed: 'Rejeté',
};

const ReportDetailDialog = ({ report, open, onOpenChange }: ReportDetailDialogProps) => {
  const [resolutionNotes, setResolutionNotes] = useState(report.resolution_notes || '');
  const [blockReason, setBlockReason] = useState('');
  const updateStatus = useUpdateReportStatus();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const { data: isBlocked, isLoading: checkingBlock } = useIsUserBlocked(report.reported_user_id);

  const handleUpdateStatus = async (status: ReportStatus) => {
    await updateStatus.mutateAsync({
      reportId: report.id,
      status,
      resolutionNotes: resolutionNotes.trim() || undefined,
    });
    onOpenChange(false);
  };

  const handleBlockUser = async () => {
    await blockUser.mutateAsync({
      userId: report.reported_user_id,
      reason: blockReason.trim() || `Signalement: ${report.reason}`,
    });
    setBlockReason('');
  };

  const handleUnblockUser = async () => {
    await unblockUser.mutateAsync(report.reported_user_id);
  };

  const reasonLabel = reportReasonLabels[report.reason as keyof typeof reportReasonLabels] || report.reason;
  const reasonDescription = reportReasonDescriptions[report.reason as keyof typeof reportReasonDescriptions];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            Détails du signalement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant={report.status === 'pending' ? 'destructive' : 'secondary'}>
              {statusLabels[report.status]}
            </Badge>
            {isBlocked && (
              <Badge variant="destructive" className="bg-red-600">
                <Ban className="w-3 h-3 mr-1" />
                Bloqué
              </Badge>
            )}
          </div>

          {/* Reported User */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Utilisateur signalé
            </Label>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center text-white font-semibold">
                {report.reported_user?.avatar_url ? (
                  <img
                    src={report.reported_user.avatar_url}
                    alt={report.reported_user.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  report.reported_user?.username?.charAt(0).toUpperCase() || '?'
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{report.reported_user?.username || 'Utilisateur inconnu'}</p>
                <p className="text-xs text-muted-foreground">ID: {report.reported_user_id.slice(0, 8)}...</p>
              </div>
              
              {/* Block/Unblock button */}
              {checkingBlock ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isBlocked ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnblockUser}
                  disabled={unblockUser.isPending}
                >
                  {unblockUser.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldOff className="w-4 h-4 mr-1" />
                      Débloquer
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBlockUser}
                  disabled={blockUser.isPending}
                >
                  {blockUser.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-1" />
                      Bloquer
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Reporter */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Signalé par
            </Label>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                {report.reporter?.avatar_url ? (
                  <img
                    src={report.reporter.avatar_url}
                    alt={report.reporter.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  report.reporter?.username?.charAt(0).toUpperCase() || '?'
                )}
              </div>
              <div>
                <p className="font-medium">{report.reporter?.username || 'Anonyme'}</p>
                <p className="text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {format(new Date(report.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reason */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Motif du signalement
            </Label>
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="font-medium text-destructive">{reasonLabel}</p>
              {reasonDescription && (
                <p className="text-sm text-muted-foreground mt-1">{reasonDescription}</p>
              )}
            </div>
          </div>

          {/* Description */}
          {report.description && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                <MessageSquare className="w-3 h-3 inline mr-1" />
                Description
              </Label>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm whitespace-pre-wrap">{report.description}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Resolution Notes */}
          <div className="space-y-2">
            <Label htmlFor="resolution-notes" className="text-xs text-muted-foreground uppercase tracking-wide">
              Notes de résolution
            </Label>
            <Textarea
              id="resolution-notes"
              placeholder="Ajoutez des notes sur les actions prises..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="resize-none"
              rows={3}
              disabled={report.status === 'resolved' || report.status === 'dismissed'}
            />
          </div>

          {/* Actions */}
          {(report.status === 'pending' || report.status === 'reviewed') && (
            <div className="flex flex-wrap gap-2 pt-2">
              {report.status === 'pending' && (
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus('reviewed')}
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  Marquer en cours
                </Button>
              )}
              
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleUpdateStatus('resolved')}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Résoudre
              </Button>

              <Button
                variant="outline"
                onClick={() => handleUpdateStatus('dismissed')}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Rejeter
              </Button>
            </div>
          )}

          {/* Resolution info for closed reports */}
          {(report.status === 'resolved' || report.status === 'dismissed') && report.resolved_at && (
            <div className="p-3 rounded-lg bg-secondary/50 text-sm">
              <p className="text-muted-foreground">
                {report.status === 'resolved' ? 'Résolu' : 'Rejeté'} le{' '}
                {format(new Date(report.resolved_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
              </p>
              {report.resolution_notes && (
                <p className="mt-2">{report.resolution_notes}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDetailDialog;
