import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
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
  Filter,
  Ban,
  Users,
  ShieldOff,
  IdCard,
  Ticket,
  BarChart3,
  MessageSquare,
  Wallet,
  Euro,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useIsAdmin, 
  useAdminReports, 
  useReportStats,
  useBlockedUsers,
  useUnblockUser,
  ReportStatus,
  ReportWithProfiles,
  UserBlock
} from '@/hooks/useAdmin';
import { reportReasonLabels } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import ReportDetailDialog from '@/components/admin/ReportDetailDialog';
import IdentityVerificationPanel from '@/components/admin/IdentityVerificationPanel';
import PromoCodePanel from '@/components/admin/PromoCodePanel';
import UserManagementPanel from '@/components/admin/UserManagementPanel';
import ContentModerationPanel from '@/components/admin/ContentModerationPanel';
import AdminStatsPanel from '@/components/admin/AdminStatsPanel';
import ModeratorWalletPanel from '@/components/admin/ModeratorWalletPanel';
import TaskRatesPanel from '@/components/admin/TaskRatesPanel';
import WithdrawalRequestsPanel from '@/components/admin/WithdrawalRequestsPanel';

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
  const { data: blockedUsers, isLoading: blockedLoading } = useBlockedUsers();
  const [activeSection, setActiveSection] = useState<'wallet' | 'withdrawals' | 'rates' | 'stats' | 'users' | 'reports' | 'moderation' | 'blocked' | 'verification' | 'promo'>('wallet');
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {statsLoading || blockedLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
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
              <StatsCard
                title="Bloqués"
                value={blockedUsers?.length || 0}
                icon={Ban}
                color="text-red-500"
              />
            </>
          )}
        </div>

        {/* Section Tabs */}
        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as typeof activeSection)}>
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex w-auto min-w-full md:min-w-0">
              <TabsTrigger value="wallet" className="gap-2">
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">Portefeuille</span>
              </TabsTrigger>
              <TabsTrigger value="rates" className="gap-2">
                <Euro className="w-4 h-4" />
                <span className="hidden sm:inline">Tarifs</span>
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="gap-2">
                <ArrowUpRight className="w-4 h-4" />
                <span className="hidden sm:inline">Retraits</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Statistiques</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Utilisateurs</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Signalements</span>
              </TabsTrigger>
              <TabsTrigger value="moderation" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Contenu</span>
              </TabsTrigger>
              <TabsTrigger value="verification" className="gap-2">
                <IdCard className="w-4 h-4" />
                <span className="hidden sm:inline">Vérifications</span>
              </TabsTrigger>
              <TabsTrigger value="promo" className="gap-2">
                <Ticket className="w-4 h-4" />
                <span className="hidden sm:inline">Promos</span>
              </TabsTrigger>
              <TabsTrigger value="blocked" className="gap-2">
                <Ban className="w-4 h-4" />
                <span className="hidden sm:inline">Bloqués</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Wallet Section */}
          <TabsContent value="wallet">
            <Card>
              <CardContent className="pt-6">
                <ModeratorWalletPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Task Rates Section */}
          <TabsContent value="rates">
            <Card>
              <CardContent className="pt-6">
                <TaskRatesPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawal Requests Section */}
          <TabsContent value="withdrawals">
            <Card>
              <CardContent className="pt-6">
                <WithdrawalRequestsPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Section */}
          <TabsContent value="stats">
            <Card>
              <CardContent className="pt-6">
                <AdminStatsPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Section */}
          <TabsContent value="users">
            <Card>
              <CardContent className="pt-6">
                <UserManagementPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Section */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Signalements
                </CardTitle>
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
          </TabsContent>

          {/* Content Moderation Section */}
          <TabsContent value="moderation">
            <Card>
              <CardContent className="pt-6">
                <ContentModerationPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Identity Verification Section */}
          <TabsContent value="verification">
            <Card>
              <CardContent className="pt-6">
                <IdentityVerificationPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promo Codes Section */}
          <TabsContent value="promo">
            <Card>
              <CardContent className="pt-6">
                <PromoCodePanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blocked Users Section */}
          <TabsContent value="blocked">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="w-5 h-5" />
                  Utilisateurs bloqués ({blockedUsers?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {blockedLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-lg" />
                      ))}
                    </div>
                  ) : blockedUsers?.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun utilisateur bloqué</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {blockedUsers?.map((block) => (
                        <BlockedUserCard key={block.id} block={block} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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

// Blocked User Card Component
const BlockedUserCard = ({ block }: { block: UserBlock }) => {
  const unblockUser = useUnblockUser();

  const isTemporary = block.suspension_type === 'temporary';
  const suspensionEnded = isTemporary && block.suspension_ends_at && new Date(block.suspension_ends_at) < new Date();

  return (
    <div className={`p-4 rounded-lg border ${suspensionEnded ? 'border-muted' : 'border-destructive/30'} ${suspensionEnded ? 'bg-muted/20' : 'bg-destructive/5'}`}>
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {block.user?.avatar_url ? (
            <img
              src={block.user.avatar_url}
              alt={block.user.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            block.user?.username?.charAt(0).toUpperCase() || '?'
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{block.user?.username || 'Utilisateur inconnu'}</p>
            <Badge variant={isTemporary ? 'outline' : 'destructive'} className="text-xs">
              {block.suspension_type === 'permanent' ? 'Permanent' : 'Temporaire'}
            </Badge>
            {suspensionEnded && (
              <Badge variant="secondary" className="text-xs">Expiré</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Bloqué le {format(new Date(block.blocked_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
          </p>
          {isTemporary && block.suspension_ends_at && (
            <p className={`text-sm ${suspensionEnded ? 'text-muted-foreground' : 'text-orange-500'}`}>
              {suspensionEnded ? 'Terminé le' : 'Jusqu\'au'} {format(new Date(block.suspension_ends_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
            </p>
          )}
          {block.reason && (
            <p className="text-sm text-destructive mt-1 truncate">
              Raison: {block.reason}
            </p>
          )}
        </div>

        {/* Unblock button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => unblockUser.mutate(block.user_id)}
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
      </div>
    </div>
  );
};

export default Admin;
