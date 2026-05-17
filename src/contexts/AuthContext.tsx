import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { sendWelcomeEmail } from '@/services/emailService';
import { useOnlineHeartbeat } from '@/hooks/useOnlineHeartbeat';

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

  // Online heartbeat extracted to dedicated hook
  useOnlineHeartbeat(user);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      // AbortError is a benign cancellation when the user navigates away
      // before the request finishes — not worth logging or surfacing.
      const msg = error.message || '';
      if (!msg.includes('abort')) {
        console.warn('[AuthContext] fetchProfile error:', msg || JSON.stringify(error));
      }
      return null;
    }
    return data;
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async (userId: string) => {
      try {
        const profileData = await fetchProfile(userId);
        if (isMounted) {
          setProfile(profileData);
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
        if (isMounted) setProfile(null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    const initializeAuth = async () => {
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('[AuthContext] Auth initialization timeout');
          setIsLoading(false);
        }
      }, 5000);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[AuthContext] Error getting session:', error);
          if (isMounted) { setSession(null); setUser(null); setProfile(null); }
          return;
        }
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
            const profilePromise = loadProfile(session.user.id);
            const profileTimeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
            await Promise.race([profilePromise, profileTimeout]);
          } catch (profileError) {
            console.error('[AuthContext] Profile loading error:', profileError);
          }
        }
      } catch (error) {
        console.error('[AuthContext] Auth initialization error:', error);
        if (isMounted) { setSession(null); setUser(null); setProfile(null); }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, username: string, region: string, age: number) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ user_id: data.user.id, username, region, age, is_online: true });
        if (profileError) throw profileError;
        if (data.user.email) sendWelcomeEmail(data.user.email, username);
        if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
          (window as any).gtag('event', 'conversion', { send_to: 'AW-18000558154/mbyNCImp54QcEMrwqodD' });
        }
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      localStorage.setItem('gc_session_expiry_days', Date.now().toString());
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
      const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id);
      if (error) throw error;
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
    <AuthContext.Provider value={{ user, profile, session, isLoading, signUp, signIn, signOut, updateProfile, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
