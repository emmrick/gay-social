import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Hero from '@/components/landing/Hero';

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to home
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/home', { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading) return null;

  // Show landing page for unauthenticated users
  if (!user) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Hero onGetStarted={() => navigate('/auth')} />
      </div>
    );
  }

  return null;
};

export default Index;
