import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import MaintenanceScreen from './MaintenanceScreen';

interface MaintenanceGuardProps {
  children: ReactNode;
}

const MaintenanceGuard = ({ children }: MaintenanceGuardProps) => {
  const { user } = useAuth();
  const { data: maintenance } = useMaintenanceMode();

  // Check if current user is admin or moderator
  const { data: isStaff } = useQuery({
    queryKey: ['is-staff', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const [adminRes, modRes] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' }),
      ]);
      return adminRes.data === true || modRes.data === true;
    },
    enabled: !!user?.id && maintenance?.is_active === true,
  });

  // If maintenance is active and user is NOT staff, show maintenance screen
  if (maintenance?.is_active && !isStaff) {
    return <MaintenanceScreen message={maintenance.message} estimatedEndAt={maintenance.estimated_end_at} />;
  }

  return <>{children}</>;
};

export default MaintenanceGuard;
