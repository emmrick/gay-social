/**
 * Hooks pour le ChatBot Personnel — flow décisionnel.
 * Gère :
 * - Configuration globale (is_active, greeting_message) — table user_chatbot_config existante
 * - Arbre de blocs (personal_chatbot_nodes)
 * - Calcul du coût en crédits (RPC compute_chatbot_node_cost)
 * - Achat d'un nouveau bloc (RPC purchase_chatbot_node)
 * - Conversation visiteur (edge function chatbot-reply, sans IA)
 * - Aide IA à la création (edge function chatbot-block-suggest)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChatbotNode {
  id: string;
  user_id: string;
  parent_id: string | null;
  label: string;
  response_text: string | null;
  display_order: number;
  is_root: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChatbotConfig {
  id: string;
  user_id: string;
  is_active: boolean;
  greeting_message: string;
  created_at: string;
  updated_at: string;
}

/**
 * Garantit qu'un utilisateur a une config (création silencieuse au besoin).
 * Appelée à l'ouverture du panneau de config pour migrer les anciens utilisateurs.
 */
export const useEnsureChatbotConfig = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      await supabase.rpc('ensure_chatbot_config' as any, { _user_id: user.id });
    },
  });
};

/* ------------------------------------------------------------------ */
/* Configuration (greeting + actif)                                    */
/* ------------------------------------------------------------------ */

export const useChatbotConfig = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['chatbot-config', targetUserId],
    queryFn: async (): Promise<ChatbotConfig | null> => {
      if (!targetUserId) return null;
      const { data, error } = await supabase
        .from('user_chatbot_config' as any)
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();
      if (error) {
        console.error('chatbot-config:', error);
        return null;
      }
      return data as any;
    },
    enabled: !!targetUserId,
  });
};

export const useUpdateChatbotConfig = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: { is_active?: boolean; greeting_message?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data: existing } = await supabase
        .from('user_chatbot_config' as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_chatbot_config' as any)
          .update(config as any)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_chatbot_config' as any)
          .insert({ user_id: user.id, ...config } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-config', user?.id] });
      toast.success('ChatBot mis à jour');
    },
    onError: (e: any) => {
      console.error(e);
      toast.error("Erreur lors de la mise à jour");
    },
  });
};

/* ------------------------------------------------------------------ */
/* Nodes (arbre de blocs)                                             */
/* ------------------------------------------------------------------ */

export const useChatbotNodes = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['chatbot-nodes', targetUserId],
    queryFn: async (): Promise<ChatbotNode[]> => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from('personal_chatbot_nodes' as any)
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) {
        console.error('chatbot-nodes:', error);
        return [];
      }
      return (data || []) as any[];
    },
    enabled: !!targetUserId,
  });
};

/** Coût total en crédits pour N blocs (lecture côté client). */
export const useNodeCost = (nodeCount: number) => {
  return useQuery({
    queryKey: ['chatbot-node-cost', nodeCount],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('compute_chatbot_node_cost' as any, {
        _count: nodeCount,
      });
      if (error) {
        console.error('compute cost:', error);
        return 0;
      }
      return (data as number) || 0;
    },
  });
};

/** Crée un nouveau bloc — débite les crédits via RPC purchase_chatbot_node. */
export const useCreateChatbotNode = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      label: string;
      response_text: string;
      parent_id?: string | null;
      is_root?: boolean;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // 1) Débit crédits
      const { data: purchase, error: pErr } = await supabase.rpc(
        'purchase_chatbot_node' as any,
        { _user_id: user.id },
      );
      if (pErr) throw pErr;
      const result = purchase as any;
      if (!result?.success) {
        if (result?.error === 'insufficient_credits') {
          throw new Error(`Crédits insuffisants. Il vous faut ${result.required} crédits (vous avez ${result.available}).`);
        }
        throw new Error(result?.error || 'Erreur lors de l\'achat du bloc');
      }

      // 2) Insertion du bloc
      const isRoot = params.is_root ?? !params.parent_id;
      const { data: existing } = await supabase
        .from('personal_chatbot_nodes' as any)
        .select('display_order')
        .eq('user_id', user.id)
        .eq(isRoot ? 'is_root' : 'parent_id', isRoot ? true : params.parent_id)
        .order('display_order', { ascending: false })
        .limit(1);
      const nextOrder = ((existing as any)?.[0]?.display_order ?? -1) + 1;

      const { data, error } = await supabase
        .from('personal_chatbot_nodes' as any)
        .insert({
          user_id: user.id,
          label: params.label.slice(0, 80),
          response_text: params.response_text,
          parent_id: params.parent_id || null,
          is_root: isRoot,
          display_order: nextOrder,
        } as any)
        .select()
        .single();
      if (error) throw error;

      return { node: data, cost: result.cost as number };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-nodes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile-credits'] });
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      if (res.cost > 0) {
        toast.success(`Bloc créé — ${res.cost} crédit${res.cost > 1 ? 's' : ''} débité${res.cost > 1 ? 's' : ''}`);
      } else {
        toast.success('Bloc créé');
      }
    },
    onError: (e: any) => {
      toast.error(e?.message || 'Erreur lors de la création');
    },
  });
};

export const useUpdateChatbotNode = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; label?: string; response_text?: string }) => {
      const { error } = await supabase
        .from('personal_chatbot_nodes' as any)
        .update({
          ...(params.label !== undefined ? { label: params.label.slice(0, 80) } : {}),
          ...(params.response_text !== undefined ? { response_text: params.response_text } : {}),
        } as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-nodes', user?.id] });
      toast.success('Bloc enregistré');
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  });
};

export const useDeleteChatbotNode = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('personal_chatbot_nodes' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-nodes', user?.id] });
      toast.success('Bloc supprimé (aucun remboursement)');
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  });
};

/* ------------------------------------------------------------------ */
/* Aide IA à la création (rephrase / suggest)                         */
/* ------------------------------------------------------------------ */

export const useAiRephrase = () => {
  return useMutation({
    mutationFn: async ({ text, label }: { text: string; label?: string }) => {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;
      if (!accessToken) throw new Error('Non authentifié');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot-block-suggest`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ mode: 'rephrase', text, label }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur IA');
      }
      const data = await res.json();
      return data.text as string;
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur de reformulation'),
  });
};

export const useAiSuggestBlocks = () => {
  return useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;
      if (!accessToken) throw new Error('Non authentifié');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot-block-suggest`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ mode: 'suggest' }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur IA');
      }
      const data = await res.json();
      return (data.blocks || []) as { label: string; response_text: string }[];
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur de suggestion'),
  });
};

/* ------------------------------------------------------------------ */
/* Visiteur — récupération des blocs (zéro IA)                        */
/* ------------------------------------------------------------------ */

export const useChatbotReply = () => {
  return useMutation({
    mutationFn: async ({ profileUserId, nodeId }: { profileUserId: string; nodeId?: string | null }) => {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;
      if (!accessToken) throw new Error('Non authentifié');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot-reply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            profile_user_id: profileUserId,
            node_id: nodeId || null,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      return await res.json() as {
        greeting: string;
        current: ChatbotNode | null;
        children: ChatbotNode[];
      };
    },
  });
};
