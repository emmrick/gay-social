import { useState, useCallback } from 'react';
import { Lock, Fingerprint, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface PinSetupScreenProps {
  onSetup: (pin: string) => Promise<boolean>;
  onEnableBiometric: () => Promise<boolean>;
  isBiometricAvailable: () => Promise<boolean>;
}

type Step = 'enter' | 'confirm' | 'biometric' | 'done';

const PinSetupScreen = ({ onSetup, onEnableBiometric, isBiometricAvailable }: PinSetupScreenProps) => {
  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDigit = useCallback((digit: string) => {
    if (currentPin.length >= 6 || isProcessing) return;
    const newPin = currentPin + digit;
    setCurrentPin(newPin);
    setError(false);

    if (newPin.length === 6) {
      if (step === 'enter') {
        setFirstPin(newPin);
        setCurrentPin('');
        setStep('confirm');
      } else if (step === 'confirm') {
        if (newPin === firstPin) {
          setIsProcessing(true);
          onSetup(newPin).then(async success => {
            if (success) {
              const bioAvailable = await isBiometricAvailable();
              if (bioAvailable) {
                setStep('biometric');
              } else {
                setStep('done');
                toast.success('Code PIN configuré !');
              }
            } else {
              setError(true);
              toast.error('Erreur lors de la configuration');
              setTimeout(() => {
                setCurrentPin('');
                setError(false);
              }, 600);
            }
            setIsProcessing(false);
          });
        } else {
          setError(true);
          setTimeout(() => {
            setCurrentPin('');
            setFirstPin('');
            setStep('enter');
            setError(false);
            toast.error('Les codes ne correspondent pas, recommencez');
          }, 600);
        }
      }
    }
  }, [currentPin, step, firstPin, isProcessing, onSetup, isBiometricAvailable]);

  const handleDelete = useCallback(() => {
    if (isProcessing) return;
    setCurrentPin(prev => prev.slice(0, -1));
    setError(false);
  }, [isProcessing]);

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('enter');
      setCurrentPin('');
      setFirstPin('');
    }
  };

  const handleEnableBiometric = async () => {
    setIsProcessing(true);
    const success = await onEnableBiometric();
    if (success) {
      toast.success('Empreinte digitale activée !');
    } else {
      toast.error("Impossible d'activer l'empreinte");
    }
    setStep('done');
    setIsProcessing(false);
  };

  const handleSkipBiometric = () => {
    toast.success('Code PIN configuré !');
    setStep('done');
  };

  if (step === 'biometric') {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)] flex flex-col items-center justify-center select-none">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-6 w-full max-w-xs px-4"
        >
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
            <Fingerprint className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white text-xl font-bold text-center">Activer l'empreinte digitale ?</h1>
          <p className="text-white/70 text-sm text-center">
            Déverrouille l'app rapidement sans saisir ton code PIN
          </p>
          <div className="flex flex-col gap-3 w-full mt-4">
            <Button
              onClick={handleEnableBiometric}
              disabled={isProcessing}
              className="w-full bg-white text-[hsl(var(--primary))] hover:bg-white/90 font-semibold"
            >
              <Fingerprint className="w-4 h-4 mr-2" />
              Activer
            </Button>
            <Button
              onClick={handleSkipBiometric}
              variant="ghost"
              className="w-full text-white/70 hover:text-white hover:bg-white/10"
            >
              Plus tard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'done') return null;

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)] flex flex-col items-center justify-center select-none">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-6 w-full max-w-xs px-4"
      >
        {/* Back button on confirm step */}
        {step === 'confirm' && (
          <button onClick={handleBack} className="absolute top-12 left-4 text-white/70 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Retour</span>
          </button>
        )}

        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2">
          <Lock className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-white text-xl font-bold">
          {step === 'enter' ? 'Créer un code PIN' : 'Confirmer le code PIN'}
        </h1>
        <p className="text-white/60 text-sm text-center">
          {step === 'enter'
            ? 'Choisis un code à 6 chiffres pour sécuriser ton accès'
            : 'Saisis à nouveau ton code PIN'}
        </p>

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
                  : i < currentPin.length
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
                  <span className="text-sm">Effacer</span>
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
      </motion.div>
    </div>
  );
};

export default PinSetupScreen;
