import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the avatar URL signer BEFORE importing the module under test.
const getSignedAvatarUrl = vi.fn();
vi.mock('@/hooks/useAvatarUrl', () => ({
  getSignedAvatarUrl: (...args: unknown[]) => getSignedAvatarUrl(...args),
}));

// Controllable Image mock. Each instance exposes its src setter so tests
// can decide whether to fire `onload` or `onerror`.
type FakeImg = {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  decoding?: string;
  _src?: string;
};
const created: FakeImg[] = [];
let mode: 'success' | 'fail' | 'flaky' = 'success';
let flakyFailuresRemaining = 0;

class MockImage implements FakeImg {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decoding?: string;
  _src?: string;
  set src(value: string) {
    this._src = value;
    created.push(this);
    queueMicrotask(() => {
      if (mode === 'success') this.onload?.();
      else if (mode === 'fail') this.onerror?.();
      else {
        if (flakyFailuresRemaining > 0) {
          flakyFailuresRemaining -= 1;
          this.onerror?.();
        } else {
          this.onload?.();
        }
      }
    });
  }
  get src() { return this._src ?? ''; }
}

beforeEach(() => {
  vi.stubGlobal('Image', MockImage as unknown as typeof Image);
  vi.useFakeTimers();
  created.length = 0;
  mode = 'success';
  flakyFailuresRemaining = 0;
  getSignedAvatarUrl.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

// Fresh import per test so the in-memory readySet/inFlight is isolated.
async function loadModule() {
  vi.resetModules();
  return await import('./imageCache');
}

async function flushMicrotasks() {
  // Allow queued microtasks (img callbacks) to run.
  await Promise.resolve();
  await Promise.resolve();
}

describe('imageCache', () => {
  it('marks URL ready and dedups parallel preloads', async () => {
    const { preloadImage, isImageReady } = await loadModule();
    mode = 'success';
    const p1 = preloadImage('https://x/a.jpg');
    const p2 = preloadImage('https://x/a.jpg');
    expect(p1).toBe(p2); // shared promise
    await flushMicrotasks();
    await expect(p1).resolves.toBe(true);
    expect(isImageReady('https://x/a.jpg')).toBe(true);
    expect(created.length).toBe(1); // only one Image instance
  });

  it('returns immediately when URL is already ready', async () => {
    const { preloadImage } = await loadModule();
    mode = 'success';
    await preloadImage('https://x/b.jpg').then(async (r) => {
      await flushMicrotasks();
      return r;
    });
    // Trigger pending callback from first preload.
    await flushMicrotasks();
    const before = created.length;
    const result = await preloadImage('https://x/b.jpg');
    expect(result).toBe(true);
    expect(created.length).toBe(before); // no new Image created
  });

  it('retries with exponential backoff then succeeds', async () => {
    const { preloadImage } = await loadModule();
    mode = 'flaky';
    flakyFailuresRemaining = 2; // fail twice, then succeed

    const promise = preloadImage('https://x/c.jpg', { retries: 3, baseDelayMs: 100 });

    await flushMicrotasks(); // first attempt → error
    expect(created.length).toBe(1);

    await vi.advanceTimersByTimeAsync(100); // wait baseDelay, second attempt
    await flushMicrotasks();
    expect(created.length).toBe(2);

    await vi.advanceTimersByTimeAsync(200); // backoff doubled, third attempt succeeds
    await flushMicrotasks();
    expect(created.length).toBe(3);

    await expect(promise).resolves.toBe(true);
  });

  it('gives up after all retries fail', async () => {
    const { preloadImage, isImageReady } = await loadModule();
    mode = 'fail';
    const promise = preloadImage('https://x/d.jpg', { retries: 2, baseDelayMs: 50 });
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(50);
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(100);
    await flushMicrotasks();
    await expect(promise).resolves.toBe(false);
    expect(isImageReady('https://x/d.jpg')).toBe(false);
  });

  it('notifies subscribers when a URL becomes ready', async () => {
    const { preloadImage, onImageReady } = await loadModule();
    mode = 'success';
    const cb = vi.fn();
    const unsub = onImageReady('https://x/e.jpg', cb);
    preloadImage('https://x/e.jpg');
    await flushMicrotasks();
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('evicts oldest entries with FIFO when exceeding max', async () => {
    const { markImageReady, isImageReady, trimReadyCache } = await loadModule();
    // Insert 502 entries (max is 500).
    for (let i = 0; i < 502; i++) markImageReady(`https://x/img-${i}.jpg`);
    trimReadyCache();
    expect(isImageReady('https://x/img-0.jpg')).toBe(false);
    expect(isImageReady('https://x/img-1.jpg')).toBe(false);
    expect(isImageReady('https://x/img-2.jpg')).toBe(true);
    expect(isImageReady('https://x/img-501.jpg')).toBe(true);
  });

  it('preloadAvatar re-signs the URL when the first attempt fails', async () => {
    const { preloadAvatar } = await loadModule();
    getSignedAvatarUrl
      .mockResolvedValueOnce('https://signed/first.jpg')
      .mockResolvedValueOnce('https://signed/second.jpg');

    // First signed URL fails twice (retries: 2 → 1 retry), second succeeds.
    let callCount = 0;
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        decoding?: string;
        set src(value: string) {
          created.push({ onload: this.onload, onerror: this.onerror, _src: value });
          callCount += 1;
          queueMicrotask(() => {
            if (value.includes('first')) this.onerror?.();
            else this.onload?.();
          });
        }
      } as unknown as typeof Image
    );

    const promise = preloadAvatar('raw/path.jpg');
    // Drain the failing attempts + their backoff delays.
    for (let i = 0; i < 6; i++) {
      await flushMicrotasks();
      await vi.advanceTimersByTimeAsync(2000);
    }
    const result = await promise;
    expect(result).toBe('https://signed/second.jpg');
    expect(getSignedAvatarUrl).toHaveBeenCalledTimes(2);
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('preloadAvatar returns null when no signed URL is available', async () => {
    const { preloadAvatar } = await loadModule();
    getSignedAvatarUrl.mockResolvedValueOnce(null);
    const result = await preloadAvatar('raw/missing.jpg');
    expect(result).toBeNull();
  });
});
