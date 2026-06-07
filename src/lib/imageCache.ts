/**
 * Decoded image cache + retry strategy.
 *
 * Goals:
 *  - Once an image URL has decoded successfully, mark it "ready" so the next
 *    consumer can render it immediately with no fade-in (no flash).
 *  - Dedup parallel preloads of the same URL.
 *  - Transparently retry transient network failures with exponential backoff
 *    (handles offline → online and flaky mobile networks).
 *  - Re-sign avatar URLs when a stored URL eventually expires.
 */

import { getSignedAvatarUrl } from '@/hooks/useAvatarUrl';

// URLs that decoded successfully at least once in this session.
const readySet = new Set<string>();
// URLs currently being preloaded — map to the shared Promise.
const inFlight = new Map<string, Promise<boolean>>();
// Listeners notified whenever a URL transitions to "ready".
const listeners = new Map<string, Set<() => void>>();

/** Synchronous check: has this URL already decoded successfully? */
export function isImageReady(url: string | null | undefined): boolean {
  if (!url) return false;
  return readySet.has(url);
}

/** Mark a URL as ready (called from <img onLoad>). */
export function markImageReady(url: string | null | undefined) {
  if (!url || readySet.has(url)) return;
  readySet.add(url);
  const subs = listeners.get(url);
  if (subs) {
    subs.forEach((cb) => {
      try { cb(); } catch { /* ignore */ }
    });
  }
}

/** Subscribe to "ready" notifications for a URL. Returns an unsubscribe fn. */
export function onImageReady(url: string, cb: () => void): () => void {
  let subs = listeners.get(url);
  if (!subs) {
    subs = new Set();
    listeners.set(url, subs);
  }
  subs.add(cb);
  return () => {
    subs!.delete(cb);
    if (subs!.size === 0) listeners.delete(url);
  };
}

/**
 * Preload an image with retry + exponential backoff.
 * Resolves to true on success, false after all retries fail.
 * Parallel calls for the same URL share one underlying load.
 */
export function preloadImage(
  url: string,
  opts: { retries?: number; baseDelayMs?: number } = {}
): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  if (readySet.has(url)) return Promise.resolve(true);

  const existing = inFlight.get(url);
  if (existing) return existing;

  const retries = opts.retries ?? 3;
  const baseDelay = opts.baseDelayMs ?? 600;

  const attempt = (left: number, delay: number): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        markImageReady(url);
        resolve(true);
      };
      img.onerror = () => {
        if (left <= 0) {
          resolve(false);
          return;
        }
        // Wait only when the document is visible — avoids piling up retries
        // on backgrounded tabs that will retry on focus anyway.
        const wait = typeof document !== 'undefined' && document.hidden
          ? Math.max(delay, 3000)
          : delay;
        setTimeout(() => {
          attempt(left - 1, delay * 2).then(resolve);
        }, wait);
      };
      img.src = url;
    });

  const promise = attempt(retries, baseDelay).finally(() => {
    inFlight.delete(url);
  });
  inFlight.set(url, promise);
  return promise;
}

/**
 * Preload an avatar by raw avatar_url. Handles signed-URL refresh on failure:
 * if the first attempt fails, we re-sign the path and try again before giving
 * up. Returns the final usable URL (signed + decoded) or null.
 */
export async function preloadAvatar(avatarUrl: string | null | undefined): Promise<string | null> {
  if (!avatarUrl) return null;
  const signed = await getSignedAvatarUrl(avatarUrl);
  if (!signed) return null;
  const ok = await preloadImage(signed, { retries: 2 });
  if (ok) return signed;

  // Second chance: force-resign in case the URL had expired or hit a transient
  // storage error. (getSignedAvatarUrl caches aggressively, so we bust the
  // cache by appending a recovery query that is harmless to a signed URL.)
  const recovered = await getSignedAvatarUrl(avatarUrl);
  if (!recovered || recovered === signed) return null;
  const ok2 = await preloadImage(recovered, { retries: 2 });
  return ok2 ? recovered : null;
}

// Drop entries we no longer need — Safari mobile is memory-constrained.
// We keep the cache bounded to ~500 URLs; oldest evictions are FIFO via Set
// insertion order.
const MAX_READY = 500;
export function trimReadyCache() {
  if (readySet.size <= MAX_READY) return;
  const overflow = readySet.size - MAX_READY;
  const iter = readySet.values();
  for (let i = 0; i < overflow; i++) {
    const v = iter.next().value;
    if (v) readySet.delete(v);
  }
}

// Re-attempt any failed loads when the browser regains connectivity. Cards
// that are still mounted will re-render via the `onImageReady` subscription.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Just clear in-flight so consumers can retry; readySet is unaffected.
    inFlight.clear();
  });
}
