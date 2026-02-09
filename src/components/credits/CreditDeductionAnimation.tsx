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
      
      {/* Floating deduction animations */}
      <div className="fixed top-20 right-4 z-[100] pointer-events-none">
        <AnimatePresence mode="popLayout">
          {deductions.map((deduction, index) => (
            <motion.div
              key={deduction.id}
              initial={{ opacity: 0, y: -20, scale: 0.8, x: 50 }}
              animate={{ 
                opacity: 1, 
                y: index * 60, 
                scale: 1, 
                x: 0,
              }}
              exit={{ 
                opacity: 0, 
                y: index * 60 + 40, 
                x: 60,
                scale: 0.5,
                transition: { duration: 0.5, ease: "easeOut" }
              }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 25 
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2.5 rounded-full shadow-lg shadow-orange-500/30 mb-2"
            >
              <motion.div
                animate={{ 
                  rotate: [0, -15, 15, -10, 10, 0],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Coins className="w-5 h-5" />
              </motion.div>
              <motion.span 
                className="font-bold text-base"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                -{deduction.amount}
              </motion.span>
              {deduction.label && (
                <span className="text-sm text-white/90 max-w-32 truncate">
                  {deduction.label}
                </span>
              )}
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
          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-lg"
        >
          -{amount}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreditDeductionProvider;
