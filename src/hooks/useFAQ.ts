import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FAQArticle {
  id: string;
  category: string;
  question: string;
  answer: string;
  display_order: number;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HelpChatbotNode {
  id: string;
  parent_id: string | null;
  faq_article_id: string | null;
  label: string;
  response_text: string | null;
  is_root: boolean;
  display_order: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useFAQArticles = (searchQuery?: string) => {
  return useQuery({
    queryKey: ['faq-articles', searchQuery],
    queryFn: async (): Promise<FAQArticle[]> => {
      let query = supabase
        .from('faq_articles' as any)
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      
      let articles = (data || []) as unknown as FAQArticle[];
      
      if (searchQuery && searchQuery.trim().length > 0) {
        const search = searchQuery.toLowerCase();
        articles = articles.filter(a => 
          a.question.toLowerCase().includes(search) || 
          a.answer.toLowerCase().includes(search) ||
          a.category.toLowerCase().includes(search)
        );
      }
      
      return articles;
    },
  });
};

export const useAllFAQArticles = () => {
  return useQuery({
    queryKey: ['faq-articles-admin'],
    queryFn: async (): Promise<FAQArticle[]> => {
      const { data, error } = await supabase
        .from('faq_articles' as any)
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as FAQArticle[];
    },
  });
};

export const useFAQMutations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createArticle = useMutation({
    mutationFn: async (article: { category: string; question: string; answer: string; display_order?: number; is_published?: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('faq_articles' as any)
        .insert({ ...article, created_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-articles'] });
      toast.success('Article FAQ créé');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateArticle = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FAQArticle> & { id: string }) => {
      const { error } = await supabase
        .from('faq_articles' as any)
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-articles'] });
      toast.success('Article FAQ mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('faq_articles' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-articles'] });
      toast.success('Article FAQ supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  return { createArticle, updateArticle, deleteArticle };
};

export const useHelpChatbotNodes = (parentId?: string | null) => {
  return useQuery({
    queryKey: ['help-chatbot-nodes', parentId],
    queryFn: async (): Promise<HelpChatbotNode[]> => {
      let query = supabase
        .from('help_chatbot_nodes' as any)
        .select('*')
        .order('display_order', { ascending: true });

      if (parentId === undefined) {
        // Root nodes
        query = query.eq('is_root', true);
      } else if (parentId === null) {
        query = query.is('parent_id', null).eq('is_root', true);
      } else {
        query = query.eq('parent_id', parentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as HelpChatbotNode[];
    },
  });
};

export const useAllChatbotNodes = () => {
  return useQuery({
    queryKey: ['help-chatbot-nodes-all'],
    queryFn: async (): Promise<HelpChatbotNode[]> => {
      const { data, error } = await supabase
        .from('help_chatbot_nodes' as any)
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as HelpChatbotNode[];
    },
  });
};

export const useChatbotNodeMutations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createNode = useMutation({
    mutationFn: async (node: { parent_id?: string | null; label: string; response_text?: string; faq_article_id?: string | null; is_root?: boolean; display_order?: number }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('help_chatbot_nodes' as any)
        .insert({ ...node, created_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-chatbot-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['help-chatbot-nodes-all'] });
      toast.success('Nœud chatbot créé');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateNode = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HelpChatbotNode> & { id: string }) => {
      const { error } = await supabase
        .from('help_chatbot_nodes' as any)
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-chatbot-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['help-chatbot-nodes-all'] });
      toast.success('Nœud chatbot mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteNode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('help_chatbot_nodes' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-chatbot-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['help-chatbot-nodes-all'] });
      toast.success('Nœud chatbot supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  return { createNode, updateNode, deleteNode };
};
