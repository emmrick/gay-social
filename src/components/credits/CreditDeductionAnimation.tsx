import { motion, AnimatePresence } from 'framer-motion';
import { Coins } from 'lucide-react';
import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';

interface DeductionEvent {
  id: string;
  amount: number;
  label?: string;
}

interface CreditDeductionContextType {
  showDeduction: (amount: number, label?: string) => void;
}

const CreditDeductionContext = createContext<CreditDeductionContextType | null>(null);

export const useCreditDeduction = () => {
  const context = useContext(CreditDeductionContext);
  // Return a no-op function if context is not available (for hooks used outside provider)
  if (!context) {
    return { showDeduction: () => {} };
  }
  return context;
};

// Global event emitter for credit deductions (can be called from anywhere)
export const emitCreditDeduction = (amount: number, label?: string) => {
  window.dispatchEvent(new CustomEvent('credit-deduction', { 
    detail: { amount, label } 
  }));
};

interface CreditDeductionProviderProps {
  children: ReactNode;
}

export const CreditDeductionProvider = ({ children }: CreditDeductionProviderProps) => {
  const [deductions, setDeductions] = useState<DeductionEvent[]>([]);
  const recentRef = useRef<Set<string>>(new Set());

  const showDeduction = useCallback((amount: number, label?: string) => {
    // Deduplicate: create a key from amount+label, ignore if seen within 500ms
    const dedupeKey = `${amount}-${label || ''}`;
    if (recentRef.current.has(dedupeKey)) return;
    recentRef.current.add(dedupeKey);
    setTimeout(() => recentRef.current.delete(dedupeKey), 500);

    const id = `${Date.now()}-${Math.random()}`;
    setDeductions(prev => [...prev, { id, amount, label }]);
    
    // Remove after animation completes
    setTimeout(() => {
      setDeductions(prev => prev.filter(d => d.id !== id));
    }, 2500);
  }, []);

  // Listen for global credit deduction events
  useEffect(() => {
    const handleCreditDeduction = (event: CustomEvent<{ amount: number; label?: string }>) => {
      showDeduction(event.detail.amount, event.detail.label);
    };

    window.addEventListener('credit-deduction', handleCreditDeduction as EventListener);
    return () => {
      window.removeEventListener('credit-deduction', handleCreditDeduction as EventListener);
    };
  }, [showDeduction]);

  return (
    <CreditDeductionContext.Provider value={{ showDeduction }}>
      {children}
      
      {/* Modern top toast notifications */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none flex flex-col items-center gap-2">
        <AnimatePresence mode="popLayout">
          {deductions.map((deduction) => (
            <motion.div
              key={deduction.id}
              initial={{ opacity: 0, y: -40, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ 
                opacity: 0, 
                y: -30,
                scale: 0.9,
                transition: { duration: 0.35, ease: "easeIn" }
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex items-center gap-2.5 bg-card/95 backdrop-blur-md border border-border/60 text-foreground px-4 py-2.5 rounded-xl shadow-lg shadow-black/10"
            >
              <div className="w-7 h-7 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Coins className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-red-500 tabular-nums">
                  -{Number(deduction.amount).toFixed(1)}
                </span>
                {deduction.label && (
                  <span className="text-xs text-muted-foreground max-w-40 truncate">
                    {deduction.label}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </CreditDeductionContext.Provider>
  );
};

// Standalone animation component for inline use
interface CreditDeductionBadgeProps {
  amount: number;
  show: boolean;
  onComplete?: () => void;
}

export const CreditDeductionBadge = ({ amount, show, onComplete }: CreditDeductionBadgeProps) => {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 0 }}
          animate={{ opacity: 1, scale: 1, y: -10 }}
          exit={{ opacity: 0, scale: 0.5, y: -30 }}
          transition={{ duration: 0.3 }}
          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-lg tabular-nums"
        >
          -{Number(amount).toFixed(1)}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreditDeductionProvider;
