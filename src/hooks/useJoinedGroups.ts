import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const MAX_GROUPS = 3;
const STORAGE_KEY = 'joined_groups';

interface JoinedGroup {
  regionCode: string;
  regionName: string;
  joinedAt: string;
}

export const useJoinedGroups = () => {
  const { user } = useAuth();
  const [joinedGroups, setJoinedGroups] = useState<JoinedGroup[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      if (stored) {
        try {
          setJoinedGroups(JSON.parse(stored));
        } catch {
          setJoinedGroups([]);
        }
      }
    }
  }, [user?.id]);

  // Save to localStorage when groups change
  const saveGroups = (groups: JoinedGroup[]) => {
    if (user?.id) {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(groups));
      setJoinedGroups(groups);
    }
  };

  const joinGroup = (regionCode: string, regionName: string): boolean => {
    if (joinedGroups.length >= MAX_GROUPS) {
      return false;
    }

    if (joinedGroups.some(g => g.regionCode === regionCode)) {
      return true; // Already joined
    }

    const newGroup: JoinedGroup = {
      regionCode,
      regionName,
      joinedAt: new Date().toISOString(),
    };

    saveGroups([...joinedGroups, newGroup]);
    return true;
  };

  const leaveGroup = (regionCode: string) => {
    saveGroups(joinedGroups.filter(g => g.regionCode !== regionCode));
  };

  const isJoined = (regionCode: string) => {
    return joinedGroups.some(g => g.regionCode === regionCode);
  };

  const canJoinMore = joinedGroups.length < MAX_GROUPS;

  return {
    joinedGroups,
    joinGroup,
    leaveGroup,
    isJoined,
    canJoinMore,
    maxGroups: MAX_GROUPS,
    remainingSlots: MAX_GROUPS - joinedGroups.length,
  };
};
