import { useState, useCallback, useMemo, memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePendingVerifications } from '@/hooks/usePendingVerifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import AdminSidebar, { AdminSection } from '@/components/admin/AdminSidebar';
import AdminMobileNav from '@/components/admin/AdminMobileNav';
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
import CreditsManagementPanel from '@/components/admin/CreditsManagementPanel';
import CreditsSurveillancePanel from '@/components/admin/CreditsSurveillancePanel';
import CreditPurchaseRequestsPanel from '@/components/admin/CreditPurchaseRequestsPanel';
import BroadcastNotificationPanel from '@/components/admin/BroadcastNotificationPanel';
import AIModerationPanel from '@/components/admin/AIModerationPanel';
import ScreenshotSanctionsPanel from '@/components/admin/ScreenshotSanctionsPanel';
import ModeratorManagementPanel from '@/components/admin/ModeratorManagementPanel';
import SwipeStatsPanel from '@/components/admin/SwipeStatsPanel';
import CreditCostsPanel from '@/components/admin/CreditCostsPanel';
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
  const { data: pendingVerificationsCount = 0 } = usePendingVerifications();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<AdminSection>('wallet');
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'all'>('pending');
  const [selectedReport, setSelectedReport] = useState<ReportWithProfiles | null>(null);

  // Check if user is moderator
  const { data: isModerator } = useQuery({
    queryKey: ['is-moderator', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' });
      return data === true;
    },
    enabled: !!user?.id,
  });

  const isAdminOrMod = isAdmin || isModerator;

  // Memoize section change handler
  const handleSectionChange = useCallback((section: AdminSection) => {
    setActiveSection(section);
  }, []);

  // Fetch pending purchase requests count
  const { data: pendingPurchasesCount = 0 } = useQuery({
    queryKey: ['admin-pending-purchases-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('credit_purchase_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    staleTime: 10000, // Keep data fresh for 10 seconds
    refetchInterval: 30000,
  });

  // Memoize pending reports count 
  const pendingReportsCount = useMemo(() => stats?.pending || 0, [stats?.pending]);

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
  if (!isAdminOrMod) {
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
      
      case 'credits':
        return <CreditsManagementPanel />;
      
      case 'credits-surveillance':
        return <CreditsSurveillancePanel />;
      
      case 'credit-purchases':
        return <CreditPurchaseRequestsPanel />;
      
      case 'blocked':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Ban className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Utilisateurs bloqués ({blockedUsers?.length || 0})</h2>
            </div>
            <ScrollArea className={isMobile ? "h-[calc(100vh-280px)]" : "h-[calc(100vh-200px)]"}>
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
              <TabsList className={isMobile ? "grid grid-cols-3 mb-4" : "grid grid-cols-5 mb-4"}>
                <TabsTrigger value="pending" className="text-xs">En attente</TabsTrigger>
                <TabsTrigger value="reviewed" className="text-xs">En cours</TabsTrigger>
                <TabsTrigger value="resolved" className="text-xs">Résolus</TabsTrigger>
                {!isMobile && (
                  <>
                    <TabsTrigger value="dismissed" className="text-xs">Rejetés</TabsTrigger>
                    <TabsTrigger value="all" className="text-xs">Tous</TabsTrigger>
                  </>
                )}
              </TabsList>
              {isMobile && (
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="dismissed" className="text-xs">Rejetés</TabsTrigger>
                  <TabsTrigger value="all" className="text-xs">Tous</TabsTrigger>
                </TabsList>
              )}

              <TabsContent value={selectedStatus} className="mt-0">
                <ScrollArea className={isMobile ? "h-[calc(100vh-360px)]" : "h-[calc(100vh-280px)]"}>
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
      
      case 'broadcast':
        return <BroadcastNotificationPanel />;
      
      case 'ai-moderation':
        return <AIModerationPanel />;
      
      case 'screenshot-sanctions':
        return <ScreenshotSanctionsPanel />;
      
      case 'moderators':
        return <ModeratorManagementPanel />;
      
      case 'swipe-stats':
        return <SwipeStatsPanel />;
      
      case 'credit-costs':
        return <CreditCostsPanel />;
      
      default:
        return null;
    }
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Mobile Navigation Header */}
        <AdminMobileNav
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          pendingReports={pendingReportsCount}
          blockedCount={blockedUsers?.length || 0}
          pendingPurchases={pendingPurchasesCount}
          pendingVerifications={pendingVerificationsCount}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 pb-8">
            {renderContent()}
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
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        pendingReports={pendingReportsCount}
        blockedCount={blockedUsers?.length || 0}
        pendingPurchases={pendingPurchasesCount}
        pendingVerifications={pendingVerificationsCount}
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
