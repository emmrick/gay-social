import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SIGNED_URL_EXPIRY = 3600; // 1 hour
const CACHE_TTL = 50 * 60 * 1000; // 50 minutes (refresh before expiry)

// Global in-memory cache for signed avatar URLs
const avatarCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Extract storage path from a full Supabase URL or raw path
 */
function extractAvatarPath(avatarUrl: string): string | null {
  if (!avatarUrl) return null;

  // Already a signed URL — use as-is
  if (avatarUrl.includes('/storage/v1/object/sign/')) return null;

  // Full public URL: extract path after bucket name
  const publicMatch = avatarUrl.match(/\/storage\/v1\/object\/public\/avatars\/(.+)/);
  if (publicMatch) return publicMatch[1];

  // Raw path (e.g. "uuid/file.jpg")
  if (!avatarUrl.startsWith('http')) return avatarUrl;

  return null;
}

/**
 * Get a signed avatar URL with in-memory caching.
 * Returns the original URL if it can't be resolved.
 */
export async function getSignedAvatarUrl(avatarUrl: string | null | undefined): Promise<string | null> {
  if (!avatarUrl) return null;

  const path = extractAvatarPath(avatarUrl);
  if (!path) return avatarUrl; // Already signed or external URL

  // Check cache
  const cached = avatarCache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(path, SIGNED_URL_EXPIRY);

    if (error || !data?.signedUrl) {
      console.error('Failed to sign avatar URL:', error);
      return null;
    }

    avatarCache.set(path, {
      url: data.signedUrl,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Batch-resolve multiple avatar URLs efficiently
 */
export async function getSignedAvatarUrls(
  avatarUrls: (string | null | undefined)[]
): Promise<(string | null)[]> {
  const results = await Promise.all(avatarUrls.map(getSignedAvatarUrl));
  return results;
}

/**
 * React hook that resolves an avatar_url to a signed URL.
 * Caches results in memory to minimize storage API calls.
 */
export function useAvatarUrl(avatarUrl: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(() => {
    if (!avatarUrl) return null;
    const path = extractAvatarPath(avatarUrl);
    if (!path) return avatarUrl;
    const cached = avatarCache.get(path);
    if (cached && cached.expiresAt > Date.now()) return cached.url;
    return null;
  });
  const urlRef = useRef(avatarUrl);

  useEffect(() => {
    urlRef.current = avatarUrl;
    if (!avatarUrl) {
      setSignedUrl(null);
      return;
    }

    const path = extractAvatarPath(avatarUrl);
    if (!path) {
      setSignedUrl(avatarUrl);
      return;
    }

    // Check cache synchronously
    const cached = avatarCache.get(path);
    if (cached && cached.expiresAt > Date.now()) {
      setSignedUrl(cached.url);
      return;
    }

    // Fetch signed URL
    getSignedAvatarUrl(avatarUrl).then((url) => {
      if (urlRef.current === avatarUrl) {
        setSignedUrl(url);
      }
    });
  }, [avatarUrl]);

  return signedUrl;
}
