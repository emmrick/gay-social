import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionState: PermissionState | null;
}

export const useGeolocation = () => {
  const { user } = useAuth();
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    permissionState: null,
  });

  // Check permission state
  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) return;
    
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setState(prev => ({ ...prev, permissionState: result.state }));
      
      result.onchange = () => {
        setState(prev => ({ ...prev, permissionState: result.state }));
      };
    } catch (err) {
      console.error('Permission check error:', err);
    }
  }, []);

  // Request location
  const requestLocation = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setState(prev => ({ 
        ...prev, 
        error: 'La géolocalisation n\'est pas supportée par ton navigateur' 
      }));
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          setState(prev => ({
            ...prev,
            latitude,
            longitude,
            loading: false,
            error: null,
          }));

          // Update profile with location
          if (user) {
            try {
              await supabase
                .from('profiles')
                .update({
                  latitude,
                  longitude,
                  location_updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id);
            } catch (err) {
              console.error('Error updating location:', err);
            }
          }

          resolve(true);
        },
        (error) => {
          let errorMessage = 'Impossible d\'obtenir ta position';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Tu dois autoriser l\'accès à ta position pour voir les membres à proximité';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Position non disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'La demande de position a expiré';
              break;
          }

          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5 * 60 * 1000, // 5 minutes
        }
      );
    });
  }, [user]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    ...state,
    requestLocation,
    checkPermission,
  };
};

export default useGeolocation;
