import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_LOCK_KEY = 'gc_app_unlocked';
const SESSION_EXPIRY_KEY = 'gc_session_expiry_days';
const SESSION_MAX_DAYS = 60;

async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useAppLock() {
  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(true);
  const [hasPin, setHasPin] = useState<boolean | null>(null); // null = loading
  const [isLoading, setIsLoading] = useState(true);
  const [pinData, setPinData] = useState<{ pin_hash: string; pin_salt: string; biometric_enabled: boolean; biometric_credential_id: string | null } | null>(null);

  // Check if user has a PIN set
  useEffect(() => {
    if (!user) {
      setIsLocked(false);
      setHasPin(null);
      setIsLoading(false);
      return;
    }

    const checkPin = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_security_pins')
          .select('pin_hash, pin_salt, biometric_enabled, biometric_credential_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[AppLock] Error checking PIN:', error);
          setHasPin(false);
          setIsLocked(false);
        } else if (data) {
          setHasPin(true);
          setPinData(data);
          // Check if already unlocked this session
          const unlocked = sessionStorage.getItem(SESSION_LOCK_KEY);
          setIsLocked(unlocked !== 'true');
        } else {
          setHasPin(false);
          setIsLocked(false); // No PIN = show setup, not locked
        }
      } catch {
        setHasPin(false);
        setIsLocked(false);
      }
      setIsLoading(false);
    };

    checkPin();
  }, [user]);

  // Check 60-day session expiry
  useEffect(() => {
    if (!user) return;
    
    const loginTimestamp = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (!loginTimestamp) {
      // Set the login timestamp now
      localStorage.setItem(SESSION_EXPIRY_KEY, Date.now().toString());
    } else {
      const loginDate = parseInt(loginTimestamp, 10);
      const daysSinceLogin = (Date.now() - loginDate) / (1000 * 60 * 60 * 24);
      if (daysSinceLogin >= SESSION_MAX_DAYS) {
        // Force logout after 60 days
        localStorage.removeItem(SESSION_EXPIRY_KEY);
        supabase.auth.signOut();
      }
    }
  }, [user]);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!pinData) return false;
    const hash = await hashPin(pin, pinData.pin_salt);
    if (hash === pinData.pin_hash) {
      sessionStorage.setItem(SESSION_LOCK_KEY, 'true');
      setIsLocked(false);
      return true;
    }
    return false;
  }, [pinData]);

  const setupPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!user) return false;
    const salt = generateSalt();
    const hash = await hashPin(pin, salt);

    const { error } = await supabase
      .from('user_security_pins')
      .upsert({
        user_id: user.id,
        pin_hash: hash,
        pin_salt: salt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('[AppLock] Error setting PIN:', error);
      return false;
    }

    setHasPin(true);
    setPinData({ pin_hash: hash, pin_salt: salt, biometric_enabled: false, biometric_credential_id: null });
    sessionStorage.setItem(SESSION_LOCK_KEY, 'true');
    setIsLocked(false);
    return true;
  }, [user]);

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    if (!pinData?.biometric_credential_id) return false;
    
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          rpId: window.location.hostname,
          allowCredentials: [{
            id: Uint8Array.from(atob(pinData.biometric_credential_id), c => c.charCodeAt(0)),
            type: 'public-key',
            transports: ['internal'],
          }],
          userVerification: 'required',
        },
      });

      if (credential) {
        sessionStorage.setItem(SESSION_LOCK_KEY, 'true');
        setIsLocked(false);
        return true;
      }
    } catch (e) {
      console.warn('[AppLock] Biometric auth failed:', e);
    }
    return false;
  }, [pinData]);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'GayConnect', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email || 'user',
            displayName: user.email || 'Utilisateur',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });

      if (credential) {
        const credentialId = btoa(String.fromCharCode(...new Uint8Array((credential as PublicKeyCredential).rawId)));
        
        await supabase
          .from('user_security_pins')
          .update({ 
            biometric_enabled: true, 
            biometric_credential_id: credentialId,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        setPinData(prev => prev ? { ...prev, biometric_enabled: true, biometric_credential_id: credentialId } : null);
        return true;
      }
    } catch (e) {
      console.warn('[AppLock] Biometric registration failed:', e);
    }
    return false;
  }, [user]);

  const isBiometricAvailable = useCallback(async (): Promise<boolean> => {
    try {
      if (!window.PublicKeyCredential) return false;
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch {
      return false;
    }
  }, []);

  return {
    isLocked,
    hasPin,
    isLoading,
    verifyPin,
    setupPin,
    unlockWithBiometric,
    enableBiometric,
    isBiometricAvailable,
    biometricEnabled: pinData?.biometric_enabled ?? false,
  };
}

// Reset session expiry on login
export function resetSessionExpiry() {
  localStorage.setItem(SESSION_EXPIRY_KEY, Date.now().toString());
}
