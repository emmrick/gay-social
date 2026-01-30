import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, username: string, region: string, age: number) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profile
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  // Set up auth listener BEFORE getSession
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async (userId: string) => {
      try {
        const profileData = await fetchProfile(userId);
        if (isMounted) {
          setProfile(profileData);
          // Update online status
          if (profileData) {
            await supabase
              .from('profiles')
              .update({ is_online: true, last_seen: new Date().toISOString() })
              .eq('user_id', userId);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        if (isMounted) {
          setProfile(null);
        }
      }
    };

    // Listener for ONGOING auth changes (does NOT control isLoading after initial load)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fire and forget - profile loading happens in background
          loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    // INITIAL load (controls isLoading)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // Fetch profile BEFORE setting loading false for existing sessions
        if (session?.user) {
          await loadProfile(session.user.id);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Heartbeat: Update online status and last_seen periodically
  useEffect(() => {
    if (!user) return;

    // Update online status immediately
    const updateOnlineStatus = async () => {
      await supabase
        .from('profiles')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('user_id', user.id);
    };

    updateOnlineStatus();

    // Heartbeat every 2 minutes to keep online status fresh
    const heartbeatInterval = setInterval(updateOnlineStatus, 2 * 60 * 1000);

    // Handle visibility change (tab becomes hidden/visible)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await updateOnlineStatus();
      } else {
        // When tab is hidden, mark as offline after a short delay
        // This handles cases where user switches tabs briefly
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    };

    // Handle before unload (closing tab/browser)
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline status on page unload
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`;
      const body = JSON.stringify({ is_online: false, last_seen: new Date().toISOString() });
      
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const signUp = async (email: string, password: string, username: string, region: string, age: number) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      // Create profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            username,
            region,
            age,
            is_online: true,
          });

        if (profileError) throw profileError;
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('user_id', user.id);
    }
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh profile
      const newProfile = await fetchProfile(user.id);
      setProfile(newProfile);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const refetchProfile = useCallback(async () => {
    if (user) {
      const newProfile = await fetchProfile(user.id);
      setProfile(newProfile);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      isLoading,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
