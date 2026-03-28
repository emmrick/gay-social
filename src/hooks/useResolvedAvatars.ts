import { useState, useEffect, useRef } from 'react';
import { getSignedAvatarUrl } from '@/hooks/useAvatarUrl';

/**
 * Hook that resolves avatar_url fields in an array of profiles.
 * Returns profiles with avatar_url replaced by signed URLs.
 * Uses batch resolution with caching from useAvatarUrl.
 */
export function useResolvedAvatars<T extends { avatar_url?: string | null }>(
  profiles: T[] | undefined | null
): T[] {
  const [resolved, setResolved] = useState<T[]>([]);
  const lastInputRef = useRef<string>('');

  useEffect(() => {
    if (!profiles || profiles.length === 0) {
      setResolved([]);
      return;
    }

    // Create a stable key to avoid unnecessary re-resolution
    const inputKey = profiles.map(p => p.avatar_url || '').join('|');
    if (inputKey === lastInputRef.current) return;
    lastInputRef.current = inputKey;

    let cancelled = false;

    const resolveAll = async () => {
      const results = await Promise.all(
        profiles.map(async (profile) => {
          if (!profile.avatar_url) return profile;
          const signedUrl = await getSignedAvatarUrl(profile.avatar_url);
          return { ...profile, avatar_url: signedUrl };
        })
      );
      if (!cancelled) {
        setResolved(results as T[]);
      }
    };

    resolveAll();

    return () => {
      cancelled = true;
    };
  }, [profiles]);

  return resolved.length > 0 ? resolved : (profiles || []);
}
