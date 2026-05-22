import { useEffect, useRef, useState } from 'react';

interface Options {
  /** Margin around root used to trigger early — e.g. "300px" pre-loads off-screen */
  rootMargin?: string;
  /** Once visible, stop observing (default: true — typical for lazy loading) */
  once?: boolean;
  /** Skip observation and consider the element in view immediately */
  skip?: boolean;
}

/**
 * Lightweight IntersectionObserver hook used to gate expensive work
 * (image loading, signed URL requests, animations) until the target is
 * near the viewport. Returns a ref to attach + a boolean.
 */
export function useInView<T extends Element = HTMLDivElement>({
  rootMargin = '300px',
  once = true,
  skip = false,
}: Options = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(skip);

  useEffect(() => {
    if (skip) {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, once, skip]);

  return { ref, inView };
}
