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
  ShieldOff,
  Clock,
  AlertTriangle,
  Euro
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ReportWithProfiles, 
  ReportStatus, 
  useUpdateReportStatus,
  useSuspendUser,
  useBlockUser,
  useIsUserBlocked,
  useUnblockUser,
  SuspensionDuration,
  suspensionDurations,
} from '@/hooks/useAdmin';
import { reportReasonLabels, reportReasonDescriptions } from '@/hooks/useReports';
import { useRecordEarning, useTaskRates, formatCents } from '@/hooks/useModeratorEarnings';
import { toast } from 'sonner';

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

const reportTypeLabels: Record<string, string> = {
  user: 'Utilisateur',
  message: 'Message',
  group: 'Groupe',
};

const ReportDetailDialog = ({ report, open, onOpenChange }: ReportDetailDialogProps) => {
  const [resolutionNotes, setResolutionNotes] = useState(report.resolution_notes || '');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<SuspensionDuration>('24hours');
  
  const updateStatus = useUpdateReportStatus();
  const suspendUser = useSuspendUser();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const { data: isBlocked, isLoading: checkingBlock } = useIsUserBlocked(report.reported_user_id);
  const recordEarning = useRecordEarning();
  const { data: taskRates } = useTaskRates();
  const reportRate = taskRates?.find(r => r.task_type === 'report_response')?.rate_cents || 10;
  const suspensionRate = taskRates?.find(r => r.task_type === 'user_suspension')?.rate_cents || 15;

  const handleUpdateStatus = async (status: ReportStatus) => {
    await updateStatus.mutateAsync({
      reportId: report.id,
      status,
      resolutionNotes: resolutionNotes.trim() || undefined,
    });
    
    // Record earning for report response
    const earned = await recordEarning.mutateAsync({
      taskType: 'report_response',
      targetUserId: report.reported_user_id,
      targetEntityId: report.id,
      description: `Traitement signalement: ${status === 'resolved' ? 'Résolu' : status === 'dismissed' ? 'Rejeté' : 'En cours'}`,
    });
    
    if (earned) {
      toast.success(`Signalement traité (+${formatCents(reportRate)})`);
    }
    
    onOpenChange(false);
  };

  const handleSuspendUser = async () => {
    await suspendUser.mutateAsync({
      userId: report.reported_user_id,
      reason: suspensionReason.trim() || `Signalement: ${report.reason}`,
      duration: selectedDuration,
    });
    
    // Record earning for suspension
    const earned = await recordEarning.mutateAsync({
      taskType: 'user_suspension',
      targetUserId: report.reported_user_id,
      description: `Suspension suite signalement (${suspensionDurations[selectedDuration].label})`,
    });
    
    if (earned) {
      toast.success(`Utilisateur suspendu (+${formatCents(suspensionRate)})`);
    }
    
    setSuspensionReason('');
  };

  const handleBanUser = async () => {
    await blockUser.mutateAsync({
      userId: report.reported_user_id,
      reason: suspensionReason.trim() || `Signalement: ${report.reason}`,
    });
    
    // Record earning for ban
    const earned = await recordEarning.mutateAsync({
      taskType: 'user_suspension',
      targetUserId: report.reported_user_id,
      description: 'Bannissement permanent suite signalement',
    });
    
    if (earned) {
      toast.success(`Utilisateur banni (+${formatCents(suspensionRate)})`);
    }
    
    setSuspensionReason('');
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
          {/* Status & Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={report.status === 'pending' ? 'destructive' : 'secondary'}>
              {statusLabels[report.status]}
            </Badge>
            <Badge variant="outline">
              {reportTypeLabels[report.report_type] || report.report_type}
            </Badge>
            {isBlocked && (
              <Badge variant="destructive" className="bg-red-600">
                <Ban className="w-3 h-3 mr-1" />
                Bloqué
              </Badge>
            )}
          </div>

          {/* Message content if this is a message report */}
          {report.report_type === 'message' && report.message_id && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                <MessageSquare className="w-3 h-3 inline mr-1" />
                Message signalé
              </Label>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm whitespace-pre-wrap">
                  {report.message?.content || '[Contenu média ou supprimé]'}
                </p>
              </div>
            </div>
          )}

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

          {/* Suspension Actions */}
          {!isBlocked && (report.status === 'pending' || report.status === 'reviewed') && (
            <div className="space-y-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <Label className="text-sm font-medium">Actions de modération</Label>
              </div>
              
              {/* Suspension reason */}
              <div className="space-y-2">
                <Label htmlFor="suspension-reason" className="text-xs text-muted-foreground">
                  Raison (optionnel)
                </Label>
                <Textarea
                  id="suspension-reason"
                  placeholder="Raison de la suspension..."
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              </div>

              {/* Duration selection */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Durée de suspension</Label>
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

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {checkingBlock ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSuspendUser}
                      disabled={suspendUser.isPending}
                      className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                    >
                      {suspendUser.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Clock className="w-4 h-4 mr-1" />
                      )}
                      Suspendre
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBanUser}
                      disabled={blockUser.isPending}
                    >
                      {blockUser.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Ban className="w-4 h-4 mr-1" />
                      )}
                      Bannir définitivement
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Unblock if already blocked */}
          {isBlocked && (
            <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Cet utilisateur est actuellement bloqué.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnblockUser}
                  disabled={unblockUser.isPending}
                  className="border-green-500/50 text-green-500 hover:bg-green-500/10"
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
