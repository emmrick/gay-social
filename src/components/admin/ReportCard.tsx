import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Eye, CheckCircle, XCircle, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ReportWithProfiles, ReportStatus } from '@/hooks/useAdmin';
import { reportReasonLabels } from '@/hooks/useReports';

const statusConfig: Record<ReportStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'bg-yellow-500', icon: Clock },
  reviewed: { label: 'En cours', color: 'bg-blue-500', icon: Eye },
  resolved: { label: 'Résolu', color: 'bg-green-500', icon: CheckCircle },
  dismissed: { label: 'Rejeté', color: 'bg-gray-500', icon: XCircle },
};

interface ReportCardProps {
  report: ReportWithProfiles;
  onClick: () => void;
}

const ReportCard = ({ report, onClick }: ReportCardProps) => {
  const status = statusConfig[report.status];
  const StatusIcon = status.icon;

  const reportTypeLabels: Record<string, { label: string; icon: React.ElementType }> = {
    user: { label: 'Utilisateur', icon: Users },
    message: { label: 'Message', icon: Eye },
    group: { label: 'Groupe', icon: Users },
  };

  const typeConfig = reportTypeLabels[report.report_type] || reportTypeLabels.user;

  return (
    <div
      className="p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Status indicator */}
        <div className={`w-10 h-10 rounded-full ${status.color} bg-opacity-20 flex items-center justify-center flex-shrink-0`}>
          <StatusIcon className={`w-5 h-5 ${status.color.replace('bg-', 'text-')}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium truncate">
              {report.reported_user?.username || 'Utilisateur inconnu'}
            </span>
            <Badge variant="secondary" className="text-xs">
              {typeConfig.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {reportReasonLabels[report.reason as keyof typeof reportReasonLabels] || report.reason}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            Signalé par {report.reporter?.username || 'Anonyme'}
          </p>
          {report.report_type === 'message' && report.message?.content && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1 italic">
              "{report.message.content}"
            </p>
          )}
          {report.description && report.report_type !== 'message' && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {report.description}
            </p>
          )}
        </div>

        {/* Time */}
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(report.created_at), { 
            addSuffix: true, 
            locale: fr 
          })}
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
