import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Tween {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  has_poll: boolean;
  poll_options: any;
  poll_ends_at: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
    user_id: string;
  };
  user_has_liked?: boolean;
}

export interface TweenComment {
  id: string;
  tween_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  likes_count: number;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
    user_id: string;
  };
  replies?: TweenComment[];
}

const PAGE_SIZE = 20;

async function enrichWithProfiles(items: any[], userIdField = 'user_id') {
  const userIds = [...new Set(items.map(i => i[userIdField]))];
  if (!userIds.length) return items;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, username, avatar_url')
    .in('user_id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
  return items.map(item => ({
    ...item,
    profiles: profileMap.get(item[userIdField]) || null,
  }));
}

export function useTweenFeed() {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['tweens-feed'],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: tweens, error } = await supabase
        .from('tweens')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (!tweens?.length) return [] as Tween[];

      let enriched = await enrichWithProfiles(tweens);

      if (user) {
        const tweenIds = tweens.map(t => t.id);
        const { data: likes } = await supabase
          .from('tween_likes')
          .select('tween_id')
          .eq('user_id', user.id)
          .in('tween_id', tweenIds);

        const likedSet = new Set(likes?.map(l => l.tween_id) || []);
        enriched = enriched.map(t => ({ ...t, user_has_liked: likedSet.has(t.id) }));
      }

      return enriched as Tween[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    initialPageParam: 0,
    enabled: !!user,
  });
}

export function useUserTweens(userId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tweens-user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tweens')
        .select('*')
        .eq('user_id', userId!)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data?.length) return [] as Tween[];

      let enriched = await enrichWithProfiles(data);

      if (user) {
        const tweenIds = data.map(t => t.id);
        const { data: likes } = await supabase
          .from('tween_likes')
          .select('tween_id')
          .eq('user_id', user.id)
          .in('tween_id', tweenIds);

        const likedSet = new Set(likes?.map(l => l.tween_id) || []);
        enriched = enriched.map(t => ({ ...t, user_has_liked: likedSet.has(t.id) }));
      }

      return enriched as Tween[];
    },
    enabled: !!userId,
  });
}

export function useCreateTween() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ content, mediaUrl, mediaType, pollOptions }: {
      content: string;
      mediaUrl?: string;
      mediaType?: 'image' | 'video';
      pollOptions?: string[];
    }) => {
      if (!user) throw new Error('Non connecté');

      const insertData: any = {
        user_id: user.id,
        content,
      };

      if (mediaUrl) {
        insertData.media_url = mediaUrl;
        insertData.media_type = mediaType;
      }

      if (pollOptions?.length) {
        insertData.has_poll = true;
        insertData.poll_options = pollOptions.map(opt => ({ text: opt, votes: 0 }));
        insertData.poll_ends_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }

      const { data, error } = await supabase
        .from('tweens')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tweens-feed'] });
      queryClient.invalidateQueries({ queryKey: ['tweens-user'] });
      toast.success('Tween publié !');
    },
    onError: () => {
      toast.error('Erreur lors de la publication');
    },
  });
}

export function useToggleTweenLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ tweenId, isLiked }: { tweenId: string; isLiked: boolean }) => {
      if (!user) throw new Error('Non connecté');

      if (isLiked) {
        const { error } = await supabase
          .from('tween_likes')
          .delete()
          .eq('tween_id', tweenId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tween_likes')
          .insert({ tween_id: tweenId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tweens-feed'] });
      queryClient.invalidateQueries({ queryKey: ['tweens-user'] });
    },
  });
}

export function useTweenComments(tweenId: string | undefined) {
  return useQuery({
    queryKey: ['tween-comments', tweenId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tween_comments')
        .select('*')
        .eq('tween_id', tweenId!)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const enriched = await enrichWithProfiles(data || []);
      const comments = enriched as TweenComment[];
      const topLevel = comments.filter(c => !c.parent_comment_id);
      const replies = comments.filter(c => c.parent_comment_id);

      return topLevel.map(c => ({
        ...c,
        replies: replies.filter(r => r.parent_comment_id === c.id),
      }));
    },
    enabled: !!tweenId,
  });
}

export function useCreateTweenComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ tweenId, content, parentCommentId }: {
      tweenId: string;
      content: string;
      parentCommentId?: string;
    }) => {
      if (!user) throw new Error('Non connecté');

      const { data, error } = await supabase
        .from('tween_comments')
        .insert({
          tween_id: tweenId,
          user_id: user.id,
          content,
          parent_comment_id: parentCommentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tween-comments', variables.tweenId] });
      queryClient.invalidateQueries({ queryKey: ['tweens-feed'] });
    },
    onError: () => {
      toast.error('Erreur lors du commentaire');
    },
  });
}

export function useDeleteTween() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tweenId: string) => {
      const { error } = await supabase
        .from('tweens')
        .update({ is_deleted: true })
        .eq('id', tweenId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tweens-feed'] });
      queryClient.invalidateQueries({ queryKey: ['tweens-user'] });
      toast.success('Tween supprimé');
    },
  });
}

export function useVoteTweenPoll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ tweenId, optionIndex }: { tweenId: string; optionIndex: number }) => {
      if (!user) throw new Error('Non connecté');

      const { error } = await supabase
        .from('tween_poll_votes')
        .insert({ tween_id: tweenId, user_id: user.id, option_index: optionIndex });

      if (error) throw error;

      // Update poll_options count
      const { data: tween } = await supabase
        .from('tweens')
        .select('poll_options')
        .eq('id', tweenId)
        .single();

      if (tween?.poll_options && Array.isArray(tween.poll_options)) {
        const options = [...(tween.poll_options as any[])];
        options[optionIndex] = { ...options[optionIndex], votes: (options[optionIndex]?.votes || 0) + 1 };
        await supabase.from('tweens').update({ poll_options: options }).eq('id', tweenId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tweens-feed'] });
    },
  });
}
