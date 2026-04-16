import { useNavigate, useOutletContext } from 'react-router-dom';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { useReportStats } from '@/hooks/useAdmin';
import { usePendingVerifications } from '@/hooks/usePendingVerifications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AdminSection } from '@/components/admin/AdminSidebar';
import { buildAdminPath } from '@/config/adminRoutes';
import type { AdminOutletContext } from '../AdminLayout';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useOutletContext<AdminOutletContext>();
  const { data: stats } = useReportStats();
  const { data: pendingVerifications = 0 } = usePendingVerifications();
  const { data: pendingPurchases = 0 } = useQuery({
    queryKey: ['admin-pending-purchases-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('credit_purchase_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count || 0;
    },
    staleTime: 10000,
  });

  return (
    <AdminDashboard
      onNavigate={(s: AdminSection) => navigate(buildAdminPath(s))}
      pendingReports={stats?.pending || 0}
      pendingVerifications={pendingVerifications}
      pendingPurchases={pendingPurchases}
      isAdmin={isAdmin}
    />
  );
};

export default DashboardPage;
