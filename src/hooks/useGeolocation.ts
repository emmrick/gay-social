import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionState: PermissionState | null;
}

// Cache module-level partagé entre tous les montages du hook.
// Évite que la position soit réinitialisée quand on quitte/revient sur la page.
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

interface CachedPosition {
  latitude: number;
  longitude: number;
  timestamp: number;
}

let cachedPosition: CachedPosition | null = null;
let inflightRequest: Promise<boolean> | null = null;
const subscribers = new Set<(pos: CachedPosition) => void>();

const notifySubscribers = (pos: CachedPosition) => {
  subscribers.forEach((cb) => {
    try {
      cb(pos);
    } catch (err) {
      console.error('[geolocation] subscriber error:', err);
    }
  });
};

export const useGeolocation = () => {
  const { user } = useAuth();
  const isMountedRef = useRef(true);
  const [state, setState] = useState<GeolocationState>(() => ({
    latitude: cachedPosition?.latitude ?? null,
    longitude: cachedPosition?.longitude ?? null,
    error: null,
    loading: false,
    permissionState: null,
  }));

  // Check permission state
  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) return;
    
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      if (!isMountedRef.current) return;
      setState(prev => ({ ...prev, permissionState: result.state }));
      
      result.onchange = () => {
        if (!isMountedRef.current) return;
        setState(prev => ({ ...prev, permissionState: result.state }));
      };
    } catch (err) {
      console.error('Permission check error:', err);
    }
  }, []);

  // Request location (force = ignore le cache même s'il est frais)
  const requestLocation = useCallback(async (force = false): Promise<boolean> => {
    if (!navigator.geolocation) {
      setState(prev => ({ 
        ...prev, 
        error: 'La géolocalisation n\'est pas supportée par ton navigateur' 
      }));
      return false;
    }

    // Sert depuis le cache si frais (< 10 min) et pas de force
    if (!force && cachedPosition && Date.now() - cachedPosition.timestamp < REFRESH_INTERVAL_MS) {
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          latitude: cachedPosition!.latitude,
          longitude: cachedPosition!.longitude,
          loading: false,
          error: null,
        }));
      }
      return true;
    }

    // Coalesce les requêtes concurrentes
    if (inflightRequest) {
      if (isMountedRef.current) setState(prev => ({ ...prev, loading: true }));
      return inflightRequest;
    }

    if (isMountedRef.current) setState(prev => ({ ...prev, loading: true, error: null }));

    inflightRequest = new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          try {
            const { latitude, longitude } = position.coords;
            cachedPosition = { latitude, longitude, timestamp: Date.now() };
            notifySubscribers(cachedPosition);

            // Fire-and-forget DB update
            if (user) {
              void (async () => {
                try {
                  const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                      latitude,
                      longitude,
                      location_updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', user.id);

                  if (updateError) {
                    console.error('[geolocation] Error updating location:', updateError);
                  }
                } catch (err) {
                  console.error('[geolocation] Unexpected error updating location:', err);
                }
              })();
            }

            resolve(true);
          } catch (err) {
            console.error('[geolocation] Unexpected success callback error:', err);
            if (isMountedRef.current) {
              setState(prev => ({
                ...prev,
                loading: false,
                error: 'Erreur inattendue lors de la récupération de ta position',
              }));
            }
            resolve(false);
          }
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

          if (isMountedRef.current) {
            setState(prev => ({
              ...prev,
              loading: false,
              error: errorMessage,
            }));
          }
          resolve(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 12000,
          maximumAge: REFRESH_INTERVAL_MS,
        }
      );
    }).finally(() => {
      inflightRequest = null;
    });

    return inflightRequest;
  }, [user]);

  // Souscription aux mises à jour du cache + refresh auto toutes les 10 min
  useEffect(() => {
    isMountedRef.current = true;
    checkPermission();

    const handleUpdate = (pos: CachedPosition) => {
      if (!isMountedRef.current) return;
      setState(prev => ({
        ...prev,
        latitude: pos.latitude,
        longitude: pos.longitude,
        loading: false,
        error: null,
      }));
    };
    subscribers.add(handleUpdate);

    // Refresh automatique toutes les 10 minutes (un seul timer global suffirait, mais
    // chaque hook gère le sien — protégé par le cache + inflightRequest, donc safe)
    const interval = window.setInterval(() => {
      void requestLocation(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      subscribers.delete(handleUpdate);
      window.clearInterval(interval);
    };
  }, [checkPermission, requestLocation]);

  return {
    ...state,
    requestLocation,
    checkPermission,
  };
};

export default useGeolocation;
