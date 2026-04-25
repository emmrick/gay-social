/**
 * Vérifie que le solde affiché par UnifiedPageHeader (via CreditBalanceCompact)
 * est mis à jour immédiatement après l'envoi d'un message à Henry.
 *
 * Stratégie : on partage une instance de QueryClient entre le hook useHenryChat
 * et le composant CreditBalanceCompact. Quand sendUserMessage réussit, le hook
 * invalide la clé ['user-credits'], ce qui déclenche un refetch et l'affichage
 * du nouveau solde.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// ---- Mocks ----------------------------------------------------------------

// Solde retourné par la requête ['user-credits']. Mutable pour simuler la
// déduction côté serveur.
let mockTotal = 10;

vi.mock('@/hooks/useCredits', async () => {
  const { useQuery } = await import('@tanstack/react-query');
  return {
    useCredits: () => {
      const q = useQuery({
        queryKey: ['user-credits', 'user-1'],
        queryFn: async () => ({ total_credits: mockTotal }),
        staleTime: 0,
      });
      return {
        totalCredits: q.data?.total_credits ?? 0,
        availableCredits: q.data?.total_credits ?? 0,
        isLoading: q.isLoading,
        hasEnoughCredits: (n: number) => (q.data?.total_credits ?? 0) >= n,
      };
    },
  };
});

vi.mock('@/contexts/CreditDialogContext', () => ({
  useCreditDialog: () => ({ showInsufficientCreditsDialog: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/contexts/ActiveProfileContext', () => ({
  useActiveProfile: () => ({ activeProfileId: 'user-1' }),
}));

vi.mock('@/hooks/useCoupleCreditsUserId', () => ({
  useCoupleCreditsUserId: () => 'user-1',
}));

// supabase.rpc('henry_send_user_message') → succès, débite 0.2 côté "serveur".
const rpcMock = vi.fn(async (_name: string) => {
  mockTotal = +(mockTotal - 0.2).toFixed(1);
  return {
    data: { success: true, credit_deducted: true, credit_amount: 0.2 },
    error: null,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...(args as [string])),
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => ({ data: [], error: null }) }),
      }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: () => {},
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@/components/credits/CreditDeductionAnimation', () => ({
  emitCreditDeduction: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// ---- Imports après les mocks ---------------------------------------------
import CreditBalanceCompact from './CreditBalanceCompact';
import { useHenryChat } from '@/hooks/useHenryChat';
import { renderHook } from '@testing-library/react';

// ---- Helper ---------------------------------------------------------------

const makeClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  });

const wrapWith = (client: QueryClient) =>
  ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>;

// ---- Test -----------------------------------------------------------------

describe('UnifiedPageHeader balance auto-refresh after Henry message', () => {
  beforeEach(() => {
    mockTotal = 10;
    rpcMock.mockClear();
  });

  it('refreshes the displayed credit balance after sendUserMessage succeeds', async () => {
    const client = makeClient();
    const wrapper = wrapWith(client);

    // 1. Rendre le badge de solde (présent dans UnifiedPageHeader)
    render(<CreditBalanceCompact />, { wrapper });

    // 2. Solde initial : 10
    await waitFor(() =>
      expect(screen.getByText(/10/)).toBeInTheDocument(),
    );

    // 3. Monter le hook Henry sur le MÊME QueryClient
    const { result } = renderHook(() => useHenryChat(), { wrapper });

    // 4. Envoyer un message → la RPC débite 0.2 et onSuccess invalide
    //    ['user-credits'] → la query du badge refetch automatiquement.
    await act(async () => {
      await result.current.sendUserMessage.mutateAsync({
        content: 'salut Henry',
      });
    });

    // 5. La RPC a bien été appelée
    expect(rpcMock).toHaveBeenCalledWith('henry_send_user_message', expect.any(Object));

    // 6. Le badge affiche maintenant le nouveau solde (9.8)
    await waitFor(
      () => {
        // CreditBalanceCompact affiche un nombre arrondi/formaté.
        // On vérifie qu'on ne voit plus "10" et qu'on voit un nombre <= 9.9.
        expect(screen.queryByText('10')).not.toBeInTheDocument();
        const node = screen.getByText(/9[.,]?8?/);
        expect(node).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});
