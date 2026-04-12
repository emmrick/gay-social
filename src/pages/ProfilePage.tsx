import { lazy, Suspense, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useBlockedUserContext } from '@/components/BlockedUserGuard';
import { useFeatureFlags } from '@/hooks/useFeatureToggles';
import UnifiedPageHeader from '@/components/layout/UnifiedPageHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ProfileView = lazy(() => import('@/components/profile/ProfileView'));

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: isAdmin } = useIsAdmin();
  const { isRestricted } = useBlockedUserContext();
  const featureFlags = useFeatureFlags();
  const params = new URLSearchParams(location.search);
  const [openEditProfile, setOpenEditProfile] = useState(params.get('edit') === 'true');

  const { data: isModerator } = useQuery({
    queryKey: ['is-moderator', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' });
      return data === true;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (params.get('edit') === 'true') {
      setOpenEditProfile(true);
      window.history.replaceState({}, '', '/profile');
    }
  }, [location.search]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <UnifiedPageHeader
        onNavigateToCredits={isRestricted ? undefined : () => navigate('/credits')}
        onNavigateToProfile={() => {}}
      />
      <ScrollArea className="flex-1 min-h-0">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
          <ProfileView
            onSignOut={handleSignOut}
            onNavigateToAdmin={isRestricted ? undefined : () => navigate('/admin')}
            onNavigateToCredits={isRestricted ? undefined : () => navigate('/credits')}
            onContactAdmin={() => navigate('/aide/chat')}
            onNavigateToChatbot={isRestricted || featureFlags['personal_chatbot'] === false ? undefined : () => navigate('/profile/chatbot')}
            isAdmin={isRestricted ? false : isAdmin}
            isModerator={isRestricted ? false : isModerator}
            openEditProfile={openEditProfile}
            onEditProfileHandled={() => setOpenEditProfile(false)}
          />
        </Suspense>
      </ScrollArea>
    </div>
  );
};

export default ProfilePage;
