import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  visibility: string;
  region_code: string | null;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  signedUrl?: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  view_count?: number;
  has_viewed?: boolean;
}

export interface StoryGroup {
  user_id: string;
  username: string;
  avatar_url: string | null;
  stories: Story[];
  hasUnviewed: boolean;
}

export const useStories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const storiesQuery = useQuery({
    queryKey: ['stories', user?.id],
    queryFn: async (): Promise<StoryGroup[]> => {
      if (!user) return [];

      const { data: stories, error } = await supabase
        .from('stories')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!stories || stories.length === 0) return [];

      const userIds = [...new Set(stories.map(s => s.user_id))];
      const storyIds = stories.map(s => s.id);

      // Parallel fetches
      const [profilesRes, viewsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds),
        supabase.from('story_views').select('story_id').eq('viewer_user_id', user.id).in('story_id', storyIds),
      ]);

      const viewedSet = new Set(viewsRes.data?.map(v => v.story_id) || []);
      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);

      // Batch signed URLs (up to 100 at a time)
      const mediaPaths = stories.map(s => s.media_url);
      const { data: signedUrls } = await supabase.storage
        .from('stories')
        .createSignedUrls(mediaPaths, 3600);

      const urlMap = new Map(signedUrls?.map(s => [s.path, s.signedUrl]) || []);

      const storiesWithUrls = stories.map((story) => ({
        ...story,
        signedUrl: urlMap.get(story.media_url) || '',
        profile: profileMap.get(story.user_id),
        has_viewed: viewedSet.has(story.id),
      }));

      // Group by user
      const groupMap = new Map<string, StoryGroup>();
      for (const story of storiesWithUrls) {
        const profile = profileMap.get(story.user_id);
        if (!groupMap.has(story.user_id)) {
          groupMap.set(story.user_id, {
            user_id: story.user_id,
            username: profile?.username || 'Utilisateur',
            avatar_url: profile?.avatar_url || null,
            stories: [],
            hasUnviewed: false,
          });
        }
        const group = groupMap.get(story.user_id)!;
        group.stories.push(story);
        if (!story.has_viewed && story.user_id !== user.id) {
          group.hasUnviewed = true;
        }
      }

      const groups = Array.from(groupMap.values());
      groups.sort((a, b) => {
        if (a.user_id === user.id) return -1;
        if (b.user_id === user.id) return 1;
        if (a.hasUnviewed && !b.hasUnviewed) return -1;
        if (!a.hasUnviewed && b.hasUnviewed) return 1;
        return 0;
      });

      return groups;
    },
    enabled: !!user,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const createStory = useMutation({
    mutationFn: async ({
      file,
      mediaType,
      caption,
      visibility,
      regionCode,
    }: {
      file: File;
      mediaType: 'image' | 'video';
      caption?: string;
      visibility: 'public' | 'regional' | 'private';
      regionCode?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop() || (mediaType === 'image' ? 'webp' : 'mp4');
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: filePath,
          media_type: mediaType,
          caption: caption || null,
          visibility,
          region_code: visibility === 'regional' ? regionCode : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story publiée !');

      if (data && user) {
        void (async () => {
          try {
            const { data: myProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', user.id)
              .single();

            const username = myProfile?.username || 'Un membre';

            const { data: fans } = await supabase
              .from('user_favorites')
              .select('user_id')
              .eq('favorite_user_id', user.id);

            if (fans && fans.length > 0) {
              const notifications = fans.map(f => ({
                user_id: f.user_id,
                type: 'new_story',
                title: '📸 Nouvelle story',
                message: `${username} a publié une nouvelle story`,
                action_url: '/',
              }));
              await supabase.from('notifications').insert(notifications);
            }
          } catch (err) {
            console.error('[stories] notification error:', err);
          }
        })();
      }
    },
    onError: () => {
      toast.error('Erreur lors de la publication');
    },
  });

  const viewStory = useMutation({
    mutationFn: async (storyId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('story_views')
        .upsert(
          { story_id: storyId, viewer_user_id: user.id },
          { onConflict: 'story_id,viewer_user_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });

  const reportScreenshot = useMutation({
    mutationFn: async (storyId: string) => {
      if (!user) throw new Error('Not authenticated');
      await supabase
        .from('story_views')
        .update({ screenshot_detected: true })
        .eq('story_id', storyId)
        .eq('viewer_user_id', user.id);

      const { data: story } = await supabase
        .from('stories')
        .select('user_id')
        .eq('id', storyId)
        .single();

      if (story) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();
        const { notifyEphemeralScreenshot } = await import('@/services/pushNotificationService');
        await notifyEphemeralScreenshot(story.user_id, profile?.username || 'Un membre');
      }
    },
  });

  const deleteStory = useMutation({
    mutationFn: async (storyId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { data: story } = await supabase
        .from('stories')
        .select('media_url')
        .eq('id', storyId)
        .single();
      if (story) {
        await supabase.storage.from('stories').remove([story.media_url]);
      }
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story supprimée');
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('stories-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        queryClient.invalidateQueries({ queryKey: ['stories'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return {
    storyGroups: storiesQuery.data || [],
    isLoading: storiesQuery.isLoading,
    createStory,
    viewStory,
    reportScreenshot,
    deleteStory,
  };
};
