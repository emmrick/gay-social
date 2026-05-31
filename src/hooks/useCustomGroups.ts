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

      // Add creator as admin first
      const { error: creatorError } = await supabase
        .from('chat_room_members')
        .insert({ chat_room_id: room.id, user_id: user.id, role: 'admin' });

      if (creatorError) throw creatorError;

      // Then add other members
      if (memberIds.length > 0) {
        const otherMembers = memberIds.map(id => ({ 
          chat_room_id: room.id, 
          user_id: id, 
          role: 'member' as string 
        }));

        const { error: memberError } = await supabase
          .from('chat_room_members')
          .insert(otherMembers);

        if (memberError) throw memberError;

        // Send notifications to all invited members
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();

        const creatorName = creatorProfile?.username || 'Quelqu\'un';

        // Create in-app notifications for each invited member
        await Promise.allSettled(memberIds.map(memberId =>
          supabase.rpc('create_user_notification', {
            _user_id: memberId,
            _type: 'group_invite',
            _title: '👥 Invitation au groupe',
            _message: `${creatorName} t'a ajouté au groupe "${name}"`,
            _action_url: '/?tab=messages',
          })
        ));

        // Send push notifications
        const { sendPushNotification } = await import('@/services/pushNotificationService');
        await Promise.allSettled(
          memberIds.map(memberId =>
            sendPushNotification({
              userId: memberId,
              title: '👥 Invitation au groupe',
              body: `${creatorName} t'a ajouté au groupe "${name}"`,
              url: '/?tab=messages',
              tag: `group-invite-${room.id}`,
              notificationType: 'group_message',
            })
          )
        );
      }

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

  // Remove member from group (admin only)
  const removeMember = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_room_members')
        .delete()
        .eq('chat_room_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', vars.groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members-list', vars.groupId] });
      queryClient.invalidateQueries({ queryKey: ['custom-groups'] });
      toast.success('Membre expulsé du groupe');
    },
    onError: (error) => {
      console.error('Error removing member:', error);
      toast.error("Erreur lors de l'expulsion du membre");
    },
  });

  // Update member role (admin only)
  const updateMemberRole = useMutation({
    mutationFn: async ({ groupId, userId, role }: { groupId: string; userId: string; role: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_room_members')
        .update({ role })
        .eq('chat_room_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['group-members', vars.groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members-list', vars.groupId] });
      queryClient.invalidateQueries({ queryKey: ['is-group-admin'] });
      toast.success('Rôle mis à jour !');
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast.error('Erreur lors de la mise à jour du rôle');
    },
  });

  return {
    customGroups: customGroups || [],
    isLoading,
    createGroup,
    leaveGroup,
    addMember,
    removeMember,
    updateMemberRole,
    useGroupMembers,
  };
};
