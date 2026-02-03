import { useCallback } from 'react';
import { useCreditDeduction } from '@/components/credits/CreditDeductionAnimation';
import { deductCredits as deductCreditsBase, checkSufficientCredits, CREDIT_COSTS } from '@/hooks/useCredits';
import { useCreditCheck } from '@/hooks/useCreditCheck';

type CreditCostKey = keyof typeof CREDIT_COSTS;

interface UseAnimatedCreditsResult {
  deductWithAnimation: (
    userId: string,
    amount: number,
    transactionType: string,
    description?: string,
    label?: string
  ) => Promise<{ success: boolean; error?: string }>;
  checkAndDeduct: (
    userId: string,
    costKey: CreditCostKey,
    label?: string
  ) => Promise<boolean>;
}

export const useAnimatedCredits = (): UseAnimatedCreditsResult => {
  const { showDeduction } = useCreditDeduction();
  const { showInsufficientCreditsDialog } = useCreditCheck();

  const deductWithAnimation = useCallback(async (
    userId: string,
    amount: number,
    transactionType: string,
    description?: string,
    label?: string
  ) => {
    const result = await deductCreditsBase(userId, amount, transactionType, description);
    
    if (result.success) {
      showDeduction(amount, label);
    }
    
    return result;
  }, [showDeduction]);

  const checkAndDeduct = useCallback(async (
    userId: string,
    costKey: CreditCostKey,
    label?: string
  ): Promise<boolean> => {
    const amount = CREDIT_COSTS[costKey];
    
    // Check if user has enough credits
    const hasCredits = await checkSufficientCredits(userId, amount);
    if (!hasCredits) {
      showInsufficientCreditsDialog(amount, label || costKey);
      return false;
    }

    // Deduct credits with animation
    const result = await deductCreditsBase(userId, amount, costKey, label);
    
    if (result.success) {
      showDeduction(amount, label);
      return true;
    }
    
    return false;
  }, [showDeduction, showInsufficientCreditsDialog]);

  return {
    deductWithAnimation,
    checkAndDeduct,
  };
};

export default useAnimatedCredits;
