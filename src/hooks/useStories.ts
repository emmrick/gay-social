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

  // Fetch all visible stories grouped by user
  const storiesQuery = useQuery({
    queryKey: ['stories', user?.id],
    queryFn: async (): Promise<StoryGroup[]> => {
      if (!user) return [];

      // Fetch active stories (not expired)
      const { data: stories, error } = await supabase
        .from('stories')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!stories || stories.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(stories.map(s => s.user_id))];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      // Fetch views for current user
      const storyIds = stories.map(s => s.id);
      const { data: views } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_user_id', user.id)
        .in('story_id', storyIds);

      const viewedSet = new Set(views?.map(v => v.story_id) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Get signed URLs for all stories
      const storiesWithUrls = await Promise.all(
        stories.map(async (story) => {
          const { data: signedUrlData } = await supabase.storage
            .from('stories')
            .createSignedUrl(story.media_url, 3600);

          return {
            ...story,
            signedUrl: signedUrlData?.signedUrl || '',
            profile: profileMap.get(story.user_id),
            has_viewed: viewedSet.has(story.id),
          };
        })
      );

      // Group by user - own stories first
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

      // Sort: own stories first, then unviewed, then viewed
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
    refetchInterval: 60000, // Refresh every minute
  });

  // Create a new story
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

      // Upload to stories bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Create story record
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
      
      // Send notification to relevant users (fire-and-forget)
      if (data && user) {
        void (async () => {
          try {
            const { data: myProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', user.id)
              .single();
            
            const username = myProfile?.username || 'Un membre';
            
            // Create in-app notification for followers/favorites
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

  // Mark story as viewed
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

  // Report screenshot on story
  const reportScreenshot = useMutation({
    mutationFn: async (storyId: string) => {
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('story_views')
        .update({ screenshot_detected: true })
        .eq('story_id', storyId)
        .eq('viewer_user_id', user.id);

      // Get story owner to notify
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

        // Import dynamically to avoid circular deps
        const { notifyEphemeralScreenshot } = await import('@/services/pushNotificationService');
        await notifyEphemeralScreenshot(story.user_id, profile?.username || 'Un membre');
      }
    },
  });

  // Delete own story
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

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('stories-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stories' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stories'] });
        }
      )
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
