import { useState, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Shield, AlertTriangle, CheckCircle, XCircle, Clock, Eye, Loader2, Ban, Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useIsAdmin, useAdminReports, useReportStats, useBlockedUsers,
  ReportStatus, ReportWithProfiles
} from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePendingVerifications } from '@/hooks/usePendingVerifications';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import AdminSidebar, { AdminSection } from '@/components/admin/AdminSidebar';
import AdminMobileNav from '@/components/admin/AdminMobileNav';
import AdminDashboard from '@/components/admin/AdminDashboard';
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
import MaintenanceTogglePanel from '@/components/admin/MaintenanceTogglePanel';
import TaskQueuePopup from '@/components/admin/TaskQueuePopup';
import PendingTasksPanel from '@/components/admin/PendingTasksPanel';
import AdminSupportChatPanel from '@/components/admin/AdminSupportChatPanel';
import SupportRatingsPanel from '@/components/admin/SupportRatingsPanel';
import PopupManagementPanel from '@/components/admin/PopupManagementPanel';
import FAQManagementPanel from '@/components/admin/FAQManagementPanel';
import FlyerGeneratorPanel from '@/components/admin/FlyerGeneratorPanel';
import PromoImageGeneratorPanel from '@/components/admin/PromoImageGeneratorPanel';
import ErrorLogsPanel from '@/components/admin/ErrorLogsPanel';
import SecurityEventsPanel from '@/components/admin/SecurityEventsPanel';

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
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'all'>('pending');
  const [selectedReport, setSelectedReport] = useState<ReportWithProfiles | null>(null);

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

  const handleSectionChange = useCallback((section: AdminSection | string) => {
    setActiveSection(section as AdminSection);
  }, []);

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
    staleTime: 10000,
    refetchInterval: 30000,
  });

  const pendingReportsCount = useMemo(() => stats?.pending || 0, [stats?.pending]);

  const { data: reports, isLoading: reportsLoading } = useAdminReports(
    selectedStatus === 'all' ? undefined : selectedStatus
  );

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!isAdminOrMod) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Shield className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Accès refusé</h2>
          <p className="text-sm text-muted-foreground">
            Vous n'avez pas les permissions nécessaires.
          </p>
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <AdminDashboard
            onNavigate={handleSectionChange as (s: AdminSection) => void}
            pendingReports={pendingReportsCount}
            pendingVerifications={pendingVerificationsCount}
            pendingPurchases={pendingPurchasesCount}
            isAdmin={!!isAdmin}
          />
        );
      case 'wallet': return <ModeratorWalletPanel />;
      case 'rates': return <TaskRatesPanel />;
      case 'withdrawals': return <WithdrawalRequestsPanel />;
      case 'global': return <GlobalEarningsPanel />;
      case 'stats': return <AdminStatsPanel />;
      case 'users': return <UserManagementPanel />;
      case 'credits': return <CreditsManagementPanel />;
      case 'credits-surveillance': return <CreditsSurveillancePanel />;
      case 'credit-purchases': return <CreditPurchaseRequestsPanel />;
      case 'blocked':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Ban className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Utilisateurs bloqués ({blockedUsers?.length || 0})</h2>
            </div>
            <ScrollArea className="h-[calc(100dvh-200px)]">
              {blockedLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
              ) : blockedUsers?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun utilisateur bloqué</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedUsers?.map((block) => <BlockedUserCard key={block.id} block={block} />)}
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
              <TabsList className="w-full grid grid-cols-5 h-9">
                <TabsTrigger value="pending" className="text-xs">En attente</TabsTrigger>
                <TabsTrigger value="reviewed" className="text-xs">En cours</TabsTrigger>
                <TabsTrigger value="resolved" className="text-xs">Résolus</TabsTrigger>
                <TabsTrigger value="dismissed" className="text-xs">Rejetés</TabsTrigger>
                <TabsTrigger value="all" className="text-xs">Tous</TabsTrigger>
              </TabsList>
              <TabsContent value={selectedStatus} className="mt-3">
                <ScrollArea className="h-[calc(100dvh-280px)]">
                  {reportsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                    </div>
                  ) : reports?.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Aucun signalement {selectedStatus !== 'all' && `avec le statut "${statusConfig[selectedStatus as ReportStatus]?.label}"`}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reports?.map((report) => (
                        <ReportCard key={report.id} report={report} onClick={() => setSelectedReport(report)} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        );
      case 'moderation': return <ContentModerationPanel />;
      case 'verification': return <IdentityVerificationPanel />;
      case 'history': return <ModerationHistoryPanel />;
      case 'promo': return <PromoCodePanel />;
      case 'broadcast': return <BroadcastNotificationPanel />;
      case 'ai-moderation': return <AIModerationPanel />;
      case 'screenshot-sanctions': return <ScreenshotSanctionsPanel />;
      case 'moderators': return <ModeratorManagementPanel />;
      case 'swipe-stats': return <SwipeStatsPanel />;
      case 'credit-costs': return <CreditCostsPanel />;
      case 'maintenance': return <MaintenanceTogglePanel />;
      case 'pending-tasks': return <PendingTasksPanel />;
      case 'support': return <AdminSupportChatPanel onBack={() => handleSectionChange('dashboard')} onNavigateToSection={handleSectionChange} />;
      case 'support-ratings': return <SupportRatingsPanel />;
      case 'popups': return <PopupManagementPanel />;
      case 'faq': return <FAQManagementPanel />;
      case 'flyers': return <FlyerGeneratorPanel />;
      case 'promo-images': return <PromoImageGeneratorPanel />;
      case 'error-logs': return <ErrorLogsPanel />;
      case 'security': return <SecurityEventsPanel />;
      default: return null;
    }
  };

  // Mobile Layout
  if (isMobile) {
    if (activeSection === 'dashboard') {
      return (
        <>
          <TaskQueuePopup onNavigateToSection={handleSectionChange} />
          <AdminMobileNav
            activeSection={'dashboard'}
            onSectionChange={handleSectionChange}
            pendingReports={pendingReportsCount}
            blockedCount={blockedUsers?.length || 0}
            pendingPurchases={pendingPurchasesCount}
            pendingVerifications={pendingVerificationsCount}
            isAdmin={!!isAdmin}
          />
        </>
      );
    }

    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <AdminMobileNav
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          pendingReports={pendingReportsCount}
          blockedCount={blockedUsers?.length || 0}
          pendingPurchases={pendingPurchasesCount}
          pendingVerifications={pendingVerificationsCount}
          isAdmin={!!isAdmin}
        />
        <main className="flex-1 overflow-auto">
          <div className="p-3 pb-8">
            <TaskQueuePopup onNavigateToSection={handleSectionChange} />
            {renderContent()}
          </div>
        </main>
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
    <div className="h-screen bg-background flex overflow-hidden">
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        pendingReports={pendingReportsCount}
        blockedCount={blockedUsers?.length || 0}
        pendingPurchases={pendingPurchasesCount}
        pendingVerifications={pendingVerificationsCount}
        isAdmin={!!isAdmin}
      />

      <main className="flex-1 overflow-auto bg-muted/20">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <TaskQueuePopup onNavigateToSection={handleSectionChange} />
          {renderContent()}
        </div>
      </main>

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
