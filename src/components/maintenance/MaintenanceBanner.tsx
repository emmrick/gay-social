import { Wrench, X } from 'lucide-react';
import { useState } from 'react';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const MaintenanceBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const { user } = useAuth();
  const { data: maintenance } = useMaintenanceMode();

  const { data: isStaff } = useQuery({
    queryKey: ['is-staff', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const [a, m] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' }),
      ]);
      return a.data === true || m.data === true;
    },
    enabled: !!user?.id,
  });

  if (!maintenance?.is_active || !isStaff || dismissed) return null;

  return (
    <div className="sticky top-0 z-[60] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2 text-sm">
      <Wrench className="w-4 h-4 flex-shrink-0" />
      <span className="font-medium">Mode maintenance actif</span>
      <span className="hidden sm:inline">— le site est inaccessible pour les membres</span>
      <button onClick={() => setDismissed(true)} className="ml-2 p-0.5 rounded hover:bg-destructive-foreground/20 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default MaintenanceBanner;
