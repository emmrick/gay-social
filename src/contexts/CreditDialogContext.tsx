import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import InsufficientCreditsDialog from '@/components/credits/InsufficientCreditsDialog';

interface CreditDialogContextType {
  showInsufficientCreditsDialog: (requiredCredits: number, actionName: string) => void;
}

const CreditDialogContext = createContext<CreditDialogContextType | undefined>(undefined);

export const useCreditDialog = () => {
  const context = useContext(CreditDialogContext);
  if (!context) {
    throw new Error('useCreditDialog must be used within a CreditDialogProvider');
  }
  return context;
};

interface CreditDialogProviderProps {
  children: ReactNode;
}

export const CreditDialogProvider = ({ children }: CreditDialogProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(0);
  const [actionName, setActionName] = useState('');

  const showInsufficientCreditsDialog = useCallback((credits: number, action: string) => {
    setRequiredCredits(credits);
    setActionName(action);
    setIsOpen(true);
  }, []);

  return (
    <CreditDialogContext.Provider value={{ showInsufficientCreditsDialog }}>
      {children}
      <InsufficientCreditsDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        requiredCredits={requiredCredits}
        actionName={actionName}
      />
    </CreditDialogContext.Provider>
  );
};
