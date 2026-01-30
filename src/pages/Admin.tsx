import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Loader2,
  Ban,
  Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useIsAdmin, 
  useAdminReports, 
  useReportStats,
  useBlockedUsers,
  ReportStatus,
  ReportWithProfiles
} from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import AdminSidebar, { AdminSection } from '@/components/admin/AdminSidebar';
import ReportDetailDialog from '@/components/admin/ReportDetailDialog';
import ReportCard from '@/components/admin/ReportCard';
import BlockedUserCard from '@/components/admin/BlockedUserCard';
import IdentityVerificationPanel from '@/components/admin/IdentityVerificationPanel';
import PromoCodePanel from '@/components/admin/PromoCodePanel';
import UserManagementPanel from '@/components/admin/UserManagementPanel';
import ContentModerationPanel from '@/components/admin/ContentModerationPanel';
import AdminStatsPanel from '@/components/admin/AdminStatsPanel';
import ModeratorWalletPanel from '@/components/admin/ModeratorWalletPanel';
import TaskRatesPanel from '@/components/admin/TaskRatesPanel';
import WithdrawalRequestsPanel from '@/components/admin/WithdrawalRequestsPanel';
import GlobalEarningsPanel from '@/components/admin/GlobalEarningsPanel';
import ModerationHistoryPanel from '@/components/admin/ModerationHistoryPanel';
import PremiumUsersPanel from '@/components/admin/PremiumUsersPanel';

const statusConfig: Record<ReportStatus, { label: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', icon: Clock },
  reviewed: { label: 'En cours', icon: Eye },
  resolved: { label: 'Résolu', icon: CheckCircle },
  dismissed: { label: 'Rejeté', icon: XCircle },
};

const Admin = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: stats } = useReportStats();
  const { data: blockedUsers, isLoading: blockedLoading } = useBlockedUsers();
  const [activeSection, setActiveSection] = useState<AdminSection>('wallet');
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
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'wallet':
        return <ModeratorWalletPanel />;
      
      case 'rates':
        return <TaskRatesPanel />;
      
      case 'withdrawals':
        return <WithdrawalRequestsPanel />;
      
      case 'global':
        return <GlobalEarningsPanel />;
      
      case 'stats':
        return <AdminStatsPanel />;
      
      case 'users':
        return <UserManagementPanel />;
      
      case 'premium':
        return <PremiumUsersPanel />;
      
      case 'blocked':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Ban className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Utilisateurs bloqués ({blockedUsers?.length || 0})</h2>
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
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
          </div>
        );
      
      case 'reports':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Signalements</h2>
            </div>
            <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as ReportStatus | 'all')}>
              <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="pending">En attente</TabsTrigger>
                <TabsTrigger value="reviewed">En cours</TabsTrigger>
                <TabsTrigger value="resolved">Résolus</TabsTrigger>
                <TabsTrigger value="dismissed">Rejetés</TabsTrigger>
                <TabsTrigger value="all">Tous</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedStatus} className="mt-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
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
          </div>
        );
      
      case 'moderation':
        return <ContentModerationPanel />;
      
      case 'verification':
        return <IdentityVerificationPanel />;
      
      case 'history':
        return <ModerationHistoryPanel />;
      
      case 'promo':
        return <PromoCodePanel />;
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        pendingReports={stats?.pending || 0}
        blockedCount={blockedUsers?.length || 0}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <Card className="h-full">
            <CardContent className="p-6 h-full overflow-auto">
              {renderContent()}
            </CardContent>
          </Card>
        </div>
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

export default Admin;
