import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CustomGroup {
  id: string;
  custom_name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  memberCount?: number;
}

interface GroupMember {
  user_id: string;
  role: string;
  joined_at: string;
  username?: string;
  avatar_url?: string | null;
}

export const useCustomGroups = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch custom groups the user is a member of
  const { data: customGroups, isLoading } = useQuery({
    queryKey: ['custom-groups', user?.id],
    queryFn: async (): Promise<CustomGroup[]> => {
      if (!user?.id) return [];

      // Get group IDs where user is a member
      const { data: memberships } = await supabase
        .from('chat_room_members')
        .select('chat_room_id')
        .eq('user_id', user.id);

      if (!memberships?.length) return [];

      const roomIds = memberships.map(m => m.chat_room_id);

      // Get custom groups
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('is_custom', true)
        .in('id', roomIds);

      if (!rooms) return [];

      // Get member counts
      const { data: counts } = await supabase
        .from('chat_room_members')
        .select('chat_room_id')
        .in('chat_room_id', roomIds);

      const countMap = new Map<string, number>();
      counts?.forEach(c => {
        countMap.set(c.chat_room_id, (countMap.get(c.chat_room_id) || 0) + 1);
      });

      return rooms.map(r => ({
        id: r.id,
        custom_name: r.custom_name || 'Groupe sans nom',
        description: r.description,
        avatar_url: r.avatar_url,
        created_by: r.created_by || '',
        created_at: r.created_at,
        memberCount: countMap.get(r.id) || 0,
      }));
    },
    enabled: !!user?.id,
  });

  // Create a custom group
  const createGroup = useMutation({
    mutationFn: async ({ name, description, memberIds }: { name: string; description?: string; memberIds: string[] }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Create the chat room
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          region_code: `GRP-${Date.now()}`,
          region_name: name,
          is_custom: true,
          created_by: user.id,
          custom_name: name,
          description: description || null,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as admin
      const members = [
        { chat_room_id: room.id, user_id: user.id, role: 'admin' },
        ...memberIds.map(id => ({ chat_room_id: room.id, user_id: id, role: 'member' as string })),
      ];

      const { error: memberError } = await supabase
        .from('chat_room_members')
        .insert(members);

      if (memberError) throw memberError;

      return room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-groups'] });
      toast.success('Groupe créé avec succès !');
    },
    onError: (error) => {
      console.error('Error creating group:', error);
      toast.error('Erreur lors de la création du groupe');
    },
  });

  // Get members of a specific group
  const useGroupMembers = (groupId: string | null) => {
    return useQuery({
      queryKey: ['group-members', groupId],
      queryFn: async (): Promise<GroupMember[]> => {
        if (!groupId) return [];

        const { data: members } = await supabase
          .from('chat_room_members')
          .select('user_id, role, joined_at')
          .eq('chat_room_id', groupId);

        if (!members?.length) return [];

        const userIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        return members.map(m => ({
          ...m,
          username: profileMap.get(m.user_id)?.username,
          avatar_url: profileMap.get(m.user_id)?.avatar_url,
        }));
      },
      enabled: !!groupId,
    });
  };

  // Leave a custom group
  const leaveGroup = useMutation({
    mutationFn: async (groupId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      await supabase
        .from('chat_room_members')
        .delete()
        .eq('chat_room_id', groupId)
        .eq('user_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-groups'] });
      toast.success('Tu as quitté le groupe');
    },
  });

  // Add member to group
  const addMember = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      await supabase
        .from('chat_room_members')
        .insert({ chat_room_id: groupId, user_id: userId, role: 'member' });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', vars.groupId] });
      queryClient.invalidateQueries({ queryKey: ['custom-groups'] });
      toast.success('Membre ajouté !');
    },
  });

  return {
    customGroups: customGroups || [],
    isLoading,
    createGroup,
    leaveGroup,
    addMember,
    useGroupMembers,
  };
};
