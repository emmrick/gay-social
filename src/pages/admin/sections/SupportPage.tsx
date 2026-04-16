import { useNavigate, useOutletContext } from 'react-router-dom';
import AdminSupportChatPanel from '@/components/admin/AdminSupportChatPanel';
import type { AdminSection } from '@/components/admin/AdminSidebar';
import { buildAdminPath } from '@/config/adminRoutes';
import type { AdminOutletContext } from '../AdminLayout';

const SupportPage = () => {
  const navigate = useNavigate();
  return (
    <AdminSupportChatPanel
      onBack={() => navigate(buildAdminPath('dashboard'))}
      onNavigateToSection={(s: AdminSection | string) => {
        if (typeof s === 'string' && s.startsWith('users:')) {
          const uid = s.split(':')[1];
          navigate(`${buildAdminPath('users')}?user=${uid}`);
        } else {
          navigate(buildAdminPath(s as AdminSection));
        }
      }}
    />
  );
};

export default SupportPage;
