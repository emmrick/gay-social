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
      console.error('Error fetching profile:', error.message || JSON.stringify(error));
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
          // Update online status (fire and forget, don't await)
          if (profileData) {
            supabase
              .from('profiles')
              .update({ is_online: true, last_seen: new Date().toISOString() })
              .eq('user_id', userId)
              .then(({ error }) => {
                if (error) console.warn('[AuthContext] Online status update failed:', error.message);
              });
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error loading profile:', error);
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

    // INITIAL load (controls isLoading) with timeout safety
    const initializeAuth = async () => {
      // Safety timeout - prevent infinite loading on slow/failed network
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('[AuthContext] Auth initialization timeout - forcing completion');
          setIsLoading(false);
        }
      }, 5000); // 5 second max wait

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] Error getting session:', error);
          // Don't throw - just continue without session
          if (isMounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
          return;
        }
        
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // Fetch profile BEFORE setting loading false for existing sessions
        if (session?.user) {
          try {
            // Profile loading with its own timeout
            const profilePromise = loadProfile(session.user.id);
            const profileTimeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
            
            await Promise.race([profilePromise, profileTimeout]);
          } catch (profileError) {
            console.error('[AuthContext] Profile loading error:', profileError);
            // Continue even if profile fails - user is still authenticated
          }
        }
      } catch (error) {
        console.error('[AuthContext] Auth initialization error:', error);
        // Ensure clean state on error
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        clearTimeout(timeoutId);
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
    // Note: We update last_seen on unload - the heartbeat stopping will naturally
    // mark the user offline after the threshold (1h free, 24h premium)
    const handleBeforeUnload = async () => {
      // Update last_seen timestamp - the heartbeat stopping will naturally mark user offline
      try {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch {
        // Ignore errors during unload
      }
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
      
      // Reset 60-day session timer on login
      localStorage.setItem('gc_session_expiry_days', Date.now().toString());
      // Clear lock so PIN is required on next fresh session
      sessionStorage.removeItem('gc_app_unlocked');
      
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
