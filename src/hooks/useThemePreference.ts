import { useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ThemePreference = 'light' | 'dark' | 'system';

export const useThemePreference = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  // Load theme preference from database when user is authenticated
  useEffect(() => {
    const loadThemePreference = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme_preference')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error loading theme preference:', error);
          return;
        }

        if (data?.theme_preference && data.theme_preference !== theme) {
          setTheme(data.theme_preference);
        }
      } catch (err) {
        console.error('Failed to load theme preference:', err);
      }
    };

    loadThemePreference();
  }, [user?.id]); // Only run when user changes, not when theme changes

  // Save theme preference to database
  const saveThemePreference = useCallback(async (newTheme: ThemePreference) => {
    setTheme(newTheme);

    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving theme preference:', error);
      }
    } catch (err) {
      console.error('Failed to save theme preference:', err);
    }
  }, [user?.id, setTheme]);

  return {
    theme: theme as ThemePreference | undefined,
    setTheme: saveThemePreference,
  };
};
