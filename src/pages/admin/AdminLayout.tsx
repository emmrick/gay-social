/**
 * AdminLayout — squelette commun à toutes les routes /admin/*.
 *
 * Responsabilités :
 *  - Auth + permission guard (admin OU modérateur)
 *  - Sidebar desktop / nav mobile
 *  - Outlet pour la section active (rendue via React Router)
 *  - TaskQueuePopup, ReportDetailDialog (état partagé via outlet context)
 *  - Bridge realtime admin
 *  - Migration douce des anciennes URL `?section=xxx` et sessionStorage
 */
import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin, useReportStats, ReportWithProfiles } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePendingVerifications } from '@/hooks/usePendingVerifications';
import { Button } from '@/components/ui/button';
import AdminSidebar, { AdminSection, ModPermissions } from '@/components/admin/AdminSidebar';
import AdminBottomTabs from '@/components/admin/AdminBottomTabs';
import AdminTopBar from '@/components/admin/AdminTopBar';
import AdminCommandBar from '@/components/admin/AdminCommandBar';
import ReportDetailDialog from '@/components/admin/ReportDetailDialog';
import TaskQueuePopup from '@/components/admin/TaskQueuePopup';
import { useAdminRealtimeBridge } from '@/hooks/admin/useAdminRealtimeBridge';
import { AdminPageTransition } from '@/components/admin/AdminPageTransition';
import {
  buildAdminPath,
  sectionFromSlug,
  titleForSection,
} from '@/config/adminRoutes';

export interface AdminOutletContext {
  isAdmin: boolean;
  modPermissions: ModPermissions | null;
  taskEntityId: string | null;
  consumeTaskEntityId: () => string | null;
  setSelectedReport: (r: ReportWithProfiles | null) => void;
}

const AdminLayout = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: stats } = useReportStats();
  const { data: pendingVerificationsCount = 0 } = usePendingVerifications();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  useAdminRealtimeBridge(!!isAdmin);

  // Section déduite de l'URL : /admin → dashboard, /admin/<slug> → section
  const slug = location.pathname.replace(/^\/admin\/?/, '').split('/')[0] || '';
  const activeSection: AdminSection = sectionFromSlug(slug);

  // Entity id éventuel (mission contextuelle)
  const [taskEntityId, setTaskEntityId] = useState<string | null>(() => {
    const saved = sessionStorage.getItem('admin-navigate-entity-id');
    if (saved) {
      sessionStorage.removeItem('admin-navigate-entity-id');
      return saved;
    }
    return null;
  });

  const consumeTaskEntityId = useCallback(() => {
    const v = taskEntityId;
    setTaskEntityId(null);
    return v;
  }, [taskEntityId]);

  const [selectedReport, setSelectedReport] = useState<ReportWithProfiles | null>(null);

  // Compatibilité legacy : ?section=xxx → redirige vers /admin/<slug>
  useEffect(() => {
    const legacy = searchParams.get('section');
    if (legacy) {
      navigate(buildAdminPath(legacy as AdminSection), { replace: true });
    }
    const saved = sessionStorage.getItem('admin-navigate-section');
    if (saved) {
      sessionStorage.removeItem('admin-navigate-section');
      navigate(buildAdminPath(saved as AdminSection), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: isModerator } = useQuery({
    queryKey: ['is-moderator', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' });
      return data === true;
    },
    enabled: !!user?.id,
  });

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

  // Navigation centralisée (sidebar / mobile nav / command bar / TaskQueuePopup)
  // IMPORTANT : on utilise `replace: true` pour la navigation INTERNE entre sections
  // afin de ne pas empiler 30 entrées d'historique. Ainsi un seul "Retour" suffit
  // pour sortir réellement de l'admin.
  const handleSectionChange = useCallback(
    (section: AdminSection | string) => {
      // Membre ciblé (depuis modale signalement par ex.)
      if (typeof section === 'string' && section.startsWith('users:')) {
        const uid = section.split(':')[1];
        navigate(`${buildAdminPath('users')}?user=${uid}`, { replace: true });
        return;
      }
      const entityId = sessionStorage.getItem('admin-navigate-entity-id');
      if (entityId) {
        sessionStorage.removeItem('admin-navigate-entity-id');
        setTaskEntityId(entityId);
      } else if (section !== activeSection) {
        setTaskEntityId(null);
      }
      // Évite un re-navigate vers la même section
      if (section === activeSection) return;
      navigate(buildAdminPath(section as AdminSection), { replace: true });
    },
    [activeSection, navigate],
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

  const outletContext: AdminOutletContext = {
    isAdmin: !!isAdmin,
    modPermissions: modPermissions ?? null,
    taskEntityId,
    consumeTaskEntityId,
    setSelectedReport,
  };

  // ===== MOBILE LAYOUT =====
  if (isMobile) {
    const totalAlerts =
      pendingReportsCount + pendingPurchasesCount + pendingVerificationsCount;

    // Dashboard mobile : grille des modules + widget mission
    if (activeSection === 'dashboard') {
      return (
        <div className="min-h-[100dvh] bg-background flex flex-col pb-[calc(64px+env(safe-area-inset-bottom,0px))]">
          <AdminTopBar
            title={isAdmin ? 'Admin' : 'Modération'}
            subtitle="Tableau de bord"
            alertCount={totalAlerts}
            onAlertClick={() => handleSectionChange('reports')}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="px-3 py-3">
              <TaskQueuePopup onNavigateToSection={handleSectionChange} />
            </div>
            <AdminPageTransition>
              <Outlet context={outletContext} />
            </AdminPageTransition>
          </main>
          <AdminBottomTabs
            activeSection="dashboard"
            onSectionChange={handleSectionChange}
            pendingReports={pendingReportsCount}
            pendingPurchases={pendingPurchasesCount}
            pendingVerifications={pendingVerificationsCount}
            isAdmin={!!isAdmin}
            modPermissions={modPermissions}
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

    // Section interne : top bar avec back + bottom tabs
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col pb-[calc(64px+env(safe-area-inset-bottom,0px))]">
        <AdminTopBar
          title={titleForSection(activeSection)}
          showBack
          onBack={() => handleSectionChange('dashboard')}
          alertCount={totalAlerts}
          onAlertClick={() => handleSectionChange('reports')}
        />
        <main className="flex-1 overflow-auto">
          <div className="p-3 pb-6">
            <AdminPageTransition>
              <Outlet context={outletContext} />
            </AdminPageTransition>
          </div>
        </main>
        <AdminBottomTabs
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          pendingReports={pendingReportsCount}
          pendingPurchases={pendingPurchasesCount}
          pendingVerifications={pendingVerificationsCount}
          isAdmin={!!isAdmin}
          modPermissions={modPermissions}
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

  // Desktop
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
        bottomSlot={<TaskQueuePopup onNavigateToSection={handleSectionChange} />}
      />

      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-40 bg-card/70 backdrop-blur-xl border-b border-border/30 shadow-sm">
          <div className="flex items-center justify-between px-4 md:px-6 h-14">
            <h1 className="text-sm font-display font-semibold text-muted-foreground truncate">
              {titleForSection(activeSection)}
            </h1>
            <AdminCommandBar onNavigate={handleSectionChange} className="w-48 md:w-64" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
          <AdminPageTransition>
            <Outlet context={outletContext} />
          </AdminPageTransition>
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

export default AdminLayout;

