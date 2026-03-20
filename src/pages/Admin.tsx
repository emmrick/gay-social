import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Shield, AlertTriangle, CheckCircle, XCircle, Clock, Eye, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useIsAdmin, useAdminReports, useReportStats,
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
import PromoCodePanel from '@/components/admin/PromoCodePanel';
import UserManagementPanel from '@/components/admin/UserManagementPanel';
import ContentModerationPanel from '@/components/admin/ContentModerationPanel';
import AdminStatsPanel from '@/components/admin/AdminStatsPanel';
import ModeratorWalletPanel from '@/components/admin/ModeratorWalletPanel';
import TaskRatesPanel from '@/components/admin/TaskRatesPanel';
import WithdrawalRequestsPanel from '@/components/admin/WithdrawalRequestsPanel';
import GlobalEarningsPanel from '@/components/admin/GlobalEarningsPanel';
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
import IdentityVerificationPanel from '@/components/admin/IdentityVerificationPanel';
import FeatureTogglesPanel from '@/components/admin/FeatureTogglesPanel';
import SiteUpdatesPanel from '@/components/admin/SiteUpdatesPanel';
import { useActiveTask } from '@/hooks/useModerationTaskQueue';
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
  const { data: pendingVerificationsCount = 0 } = usePendingVerifications();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<AdminSection>(() => {
    const saved = sessionStorage.getItem('admin-navigate-section');
    if (saved) {
      sessionStorage.removeItem('admin-navigate-section');
      return saved as AdminSection;
    }
    return 'dashboard';
  });
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'all'>('pending');
  const [selectedReport, setSelectedReport] = useState<ReportWithProfiles | null>(null);
  const { data: activeTask } = useActiveTask();
  const autoOpenedReportRef = useRef<string | null>(null);

  const { data: isModerator } = useQuery({
    queryKey: ['is-moderator', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' });
      return data === true;
    },
    enabled: !!user?.id,
  });

  // Fetch moderator permissions for the current user
  const { data: modPermissions } = useQuery({
    queryKey: ['moderator-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('moderator_permissions')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id && !isAdmin,
    staleTime: 60000,
  });

  const isAdminOrMod = isAdmin || isModerator;

  const handleSectionChange = useCallback((section: AdminSection | string, userId?: string) => {
    // Support "users:userId" format from support chat
    if (typeof section === 'string' && section.startsWith('users:')) {
      const uid = section.split(':')[1];
      setActiveSection('users');
      setTargetUserId(uid);
      return;
    }
    setActiveSection(section as AdminSection);
    if (section === 'users' && userId) {
      setTargetUserId(userId);
    } else if (section !== 'users') {
      setTargetUserId(null);
    }
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

  // Auto-open report linked to active moderation task
  useEffect(() => {
    if (
      activeSection === 'reports' &&
      activeTask?.task_type === 'report_review' &&
      activeTask.target_entity_id &&
      reports &&
      reports.length > 0 &&
      autoOpenedReportRef.current !== activeTask.target_entity_id
    ) {
      const matchingReport = reports.find(r => r.id === activeTask.target_entity_id);
      if (matchingReport) {
        setSelectedReport(matchingReport);
        autoOpenedReportRef.current = activeTask.target_entity_id;
      } else if (selectedStatus !== 'all') {
        setSelectedStatus('all');
      }
    }
  }, [activeSection, activeTask, reports, selectedStatus]);

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
      case 'users': return <UserManagementPanel initialUserId={targetUserId} onUserSelected={setTargetUserId} />;
      case 'credits-surveillance': return <CreditsSurveillancePanel />;
      case 'credit-purchases': return <CreditPurchaseRequestsPanel />;
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
      case 'verification': return <IdentityVerificationPanel />;
      case 'feature-toggles': return <FeatureTogglesPanel />;
      case 'site-updates': return <SiteUpdatesPanel />;
      default: return null;
    }
  };

  // Mobile Layout
  if (isMobile) {
    if (activeSection === 'dashboard') {
      return (
        <div className="min-h-[100dvh] bg-background flex flex-col">
          <AdminMobileNav
            activeSection={'dashboard'}
            onSectionChange={handleSectionChange}
            pendingReports={pendingReportsCount}
            blockedCount={0}
            pendingPurchases={pendingPurchasesCount}
            pendingVerifications={pendingVerificationsCount}
            isAdmin={!!isAdmin}
            modPermissions={modPermissions}
            dashboardTopSlot={<TaskQueuePopup onNavigateToSection={handleSectionChange} />}
          />
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

    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <AdminMobileNav
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          pendingReports={pendingReportsCount}
          blockedCount={0}
          pendingPurchases={pendingPurchasesCount}
          pendingVerifications={pendingVerificationsCount}
          isAdmin={!!isAdmin}
          modPermissions={modPermissions}
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
        blockedCount={0}
        pendingPurchases={pendingPurchasesCount}
        pendingVerifications={pendingVerificationsCount}
        isAdmin={!!isAdmin}
        modPermissions={modPermissions}
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
