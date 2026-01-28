import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  ArrowLeft,
  Loader2,
  Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useIsAdmin, 
  useAdminReports, 
  useUpdateReportStatus, 
  useReportStats,
  ReportStatus,
  ReportWithProfiles
} from '@/hooks/useAdmin';
import { reportReasonLabels } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import ReportDetailDialog from '@/components/admin/ReportDetailDialog';

const statusConfig: Record<ReportStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'bg-yellow-500', icon: Clock },
  reviewed: { label: 'En cours', color: 'bg-blue-500', icon: Eye },
  resolved: { label: 'Résolu', color: 'bg-green-500', icon: CheckCircle },
  dismissed: { label: 'Rejeté', color: 'bg-gray-500', icon: XCircle },
};

const Admin = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: stats, isLoading: statsLoading } = useReportStats();
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'all'>('pending');
  const [selectedReport, setSelectedReport] = useState<ReportWithProfiles | null>(null);

  const { data: reports, isLoading: reportsLoading } = useAdminReports(
    selectedStatus === 'all' ? undefined : selectedStatus
  );

  // Loading state
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Accès refusé</h2>
            <p className="text-muted-foreground mb-6">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="font-display text-xl font-bold">Administration</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : (
            <>
              <StatsCard
                title="Total"
                value={stats?.total || 0}
                icon={AlertTriangle}
                color="text-foreground"
              />
              <StatsCard
                title="En attente"
                value={stats?.pending || 0}
                icon={Clock}
                color="text-yellow-500"
              />
              <StatsCard
                title="En cours"
                value={stats?.reviewed || 0}
                icon={Eye}
                color="text-blue-500"
              />
              <StatsCard
                title="Résolus"
                value={stats?.resolved || 0}
                icon={CheckCircle}
                color="text-green-500"
              />
              <StatsCard
                title="Rejetés"
                value={stats?.dismissed || 0}
                icon={XCircle}
                color="text-gray-500"
              />
            </>
          )}
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Signalements
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as ReportStatus | 'all')}>
              <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="pending">En attente</TabsTrigger>
                <TabsTrigger value="reviewed">En cours</TabsTrigger>
                <TabsTrigger value="resolved">Résolus</TabsTrigger>
                <TabsTrigger value="dismissed">Rejetés</TabsTrigger>
                <TabsTrigger value="all">Tous</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedStatus} className="mt-0">
                <ScrollArea className="h-[500px]">
                  {reportsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-lg" />
                      ))}
                    </div>
                  ) : reports?.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Aucun signalement {selectedStatus !== 'all' && `avec le statut "${statusConfig[selectedStatus as ReportStatus]?.label}"`}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reports?.map((report) => (
                        <ReportCard
                          key={report.id}
                          report={report}
                          onClick={() => setSelectedReport(report)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Report Detail Dialog */}
      {selectedReport && (
        <ReportDetailDialog
          report={selectedReport}
          open={!!selectedReport}
          onOpenChange={(open) => !open && setSelectedReport(null)}
        />
      )}
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  color: string;
}) => (
  <Card>
    <CardContent className="pt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${color} opacity-80`} />
      </div>
    </CardContent>
  </Card>
);

// Report Card Component
const ReportCard = ({ 
  report, 
  onClick 
}: { 
  report: ReportWithProfiles; 
  onClick: () => void;
}) => {
  const status = statusConfig[report.status];
  const StatusIcon = status.icon;

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
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">
              {report.reported_user?.username || 'Utilisateur inconnu'}
            </span>
            <Badge variant="outline" className="text-xs">
              {reportReasonLabels[report.reason as keyof typeof reportReasonLabels] || report.reason}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            Signalé par {report.reporter?.username || 'Anonyme'}
          </p>
          {report.description && (
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

export default Admin;
