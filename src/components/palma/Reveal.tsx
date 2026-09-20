'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type RevealProps = React.ComponentProps<'div'> & {
  /** Stagger in milliseconds, applied as an animation delay. */
  delay?: number;
  variant?: 'rise' | 'reveal';
};

/**
 * Editorial reveal on scroll. One IntersectionObserver per element, no library.
 *
 * The hidden state is applied on mount, never in the server output, and that
 * ordering is the whole of what makes this safe to put on every section of the
 * site. It used to render `data-shown="false"` from the server with a CSS rule
 * that took the element to `opacity: 0` — so between HTML arriving and
 * JavaScript hydrating, the content was invisible, and if hydration never
 * happened (a failed chunk, a stale service worker, a browser that gave up on
 * the bundle) it stayed invisible for good. A decoration was holding the text
 * hostage. Now the server sends the content plainly visible and the hiding is
 * something JavaScript does to content it can prove it will bring back.
 *
 * The measurement happens in a layout effect, before the browser paints, so
 * hiding an element below the fold is never seen as a flicker. Anything
 * already on screen when the page loads skips straight to the animation
 * instead of waiting for the observer, which is what makes a page feel like it
 * arrives rather than like it was already there.
 *
 * Under `prefers-reduced-motion` none of this runs at all: the content is
 * simply present, which it already was.
 */
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export function Reveal({
  className,
  delay = 0,
  variant = 'rise',
  children,
  ...props
}: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<'idle' | 'hidden' | 'shown'>('idle');

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Already on screen: animate now rather than waiting to be told.
    if (node.getBoundingClientRect().top < window.innerHeight * 0.9) {
      setState('shown');
      return;
    }

    setState('hidden');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState('shown');
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-shown={state === 'shown' ? 'true' : state === 'hidden' ? 'false' : undefined}
      style={state === 'shown' && delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        'motion-safe:data-[shown=false]:opacity-0',
        state === 'shown' &&
          (variant === 'reveal'
            ? 'motion-safe:animate-(--animate-reveal)'
            : 'motion-safe:animate-(--animate-rise)'),
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
