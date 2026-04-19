import { useCallback } from 'react';
import { useCreditDeduction } from '@/components/credits/CreditDeductionAnimation';
import { deductCredits as deductCreditsBase, checkSufficientCredits, CREDIT_COSTS, getDynamicCreditCost } from '@/hooks/useCredits';
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
    // deductCreditsBase émet déjà l'animation avec le montant FINAL (après promo).
    return await deductCreditsBase(userId, amount, transactionType, description ?? label);
  }, []);

  const checkAndDeduct = useCallback(async (
    userId: string,
    costKey: CreditCostKey,
    label?: string
  ): Promise<boolean> => {
    const amount = await getDynamicCreditCost(costKey);
    if (amount <= 0) return true;

    const hasCredits = await checkSufficientCredits(userId, amount);
    if (!hasCredits) {
      showInsufficientCreditsDialog(amount, label || costKey);
      return false;
    }

    // Animation déclenchée automatiquement par deductCreditsBase (montant après promo).
    const result = await deductCreditsBase(userId, amount, costKey, label);
    return result.success;
  }, [showInsufficientCreditsDialog]);

  return {
    deductWithAnimation,
    checkAndDeduct,
  };
};

export default useAnimatedCredits;
