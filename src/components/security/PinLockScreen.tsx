import { useState, useEffect, useCallback } from 'react';
import { Fingerprint, Lock, Delete, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface PinLockScreenProps {
  onUnlock: (pin: string) => Promise<boolean>;
  onBiometricUnlock: () => Promise<boolean>;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
}

const PinLockScreen = ({ onUnlock, onBiometricUnlock, biometricAvailable, biometricEnabled }: PinLockScreenProps) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // Auto-trigger biometric on mount
  useEffect(() => {
    if (biometricAvailable && biometricEnabled) {
      handleBiometric();
    }
  }, [biometricAvailable, biometricEnabled]);

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= 6 || isChecking) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 6) {
      setIsChecking(true);
      onUnlock(newPin).then(success => {
        if (!success) {
          setError(true);
          setAttempts(prev => prev + 1);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 600);
        }
        setIsChecking(false);
      });
    }
  }, [pin, isChecking, onUnlock]);

  const handleDelete = useCallback(() => {
    if (isChecking) return;
    setPin(prev => prev.slice(0, -1));
    setError(false);
  }, [isChecking]);

  const handleBiometric = useCallback(async () => {
    setIsChecking(true);
    const success = await onBiometricUnlock();
    if (!success) {
      setError(true);
      setTimeout(() => setError(false), 600);
    }
    setIsChecking(false);
  }, [onBiometricUnlock]);

  const handleLogout = async () => {
    localStorage.removeItem('gc_session_expiry_days');
    await supabase.auth.signOut();
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)] flex flex-col items-center justify-center select-none">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-6 w-full max-w-xs px-4"
      >
        {/* Lock icon */}
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2">
          <Lock className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-white text-xl font-bold">Entrer le code PIN</h1>
        
        {attempts >= 3 && (
          <p className="text-white/60 text-xs text-center">
            {attempts} tentatives échouées
          </p>
        )}

        {/* PIN dots */}
        <motion.div 
          className="flex gap-3 mb-4"
          animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                error
                  ? 'bg-red-400 border-red-400'
                  : i < pin.length
                    ? 'bg-white border-white scale-110'
                    : 'border-white/40 bg-transparent'
              }`}
            />
          ))}
        </motion.div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === 'del') {
              return (
                <button
                  key={i}
                  onClick={handleDelete}
                  className="h-16 rounded-2xl flex items-center justify-center text-white active:bg-white/10 transition-colors"
                >
                  <Delete className="w-6 h-6" />
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(d)}
                className="h-16 rounded-2xl bg-white/10 backdrop-blur-sm text-white text-2xl font-semibold active:bg-white/25 transition-colors hover:bg-white/15"
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Biometric button */}
        {biometricAvailable && biometricEnabled && (
          <button
            onClick={handleBiometric}
            disabled={isChecking}
            className="mt-2 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <Fingerprint className="w-6 h-6" />
            <span className="text-sm">Empreinte digitale</span>
          </button>
        )}

        {/* Logout link */}
        <button
          onClick={handleLogout}
          className="mt-4 flex items-center gap-1.5 text-white/50 hover:text-white/70 text-xs transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Se déconnecter
        </button>
      </motion.div>
    </div>
  );
};

export default PinLockScreen;
