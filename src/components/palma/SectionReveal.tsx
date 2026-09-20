'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The section band, as the thing that arrives.
 *
 * This is the same observer as `Reveal`, applied to the `<section>` element
 * itself rather than to a wrapper inside it. That distinction matters more
 * than it sounds: several pages style their bands with `section > *` rules and
 * rely on the Container being a direct child, so an extra div inside every
 * section would have quietly rearranged the site.
 *
 * Bands are large, so they move less than a card does. `--animate-band` is a
 * short rise and a fade over the house curve, which at the scale of a whole
 * screen reads as the page settling rather than as an element performing.
 *
 * The hidden state is applied on mount and never server-rendered, for the
 * reason set out at length in `Reveal`: content must not depend on JavaScript
 * to become visible.
 */
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export function SectionReveal({ className, children, ...props }: React.ComponentProps<'section'>) {
  const ref = React.useRef<HTMLElement>(null);
  const [state, setState] = React.useState<'idle' | 'hidden' | 'shown'>('idle');

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // A band already on screen animates immediately; the first one on a page
    // is usually half the viewport, and waiting for an observer to notice
    // something that is plainly visible looks like a stutter.
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
      // A band is tall, so a percentage threshold would wait until it was
      // half-read. A fixed margin brings it in as its top edge approaches.
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      data-shown={state === 'shown' ? 'true' : state === 'hidden' ? 'false' : undefined}
      className={cn(
        'motion-safe:data-[shown=false]:opacity-0',
        state === 'shown' && 'motion-safe:animate-(--animate-band)',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
