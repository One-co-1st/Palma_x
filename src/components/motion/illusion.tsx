'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useGsapChoreography } from './useGsap';

/**
 * The illusion layer.
 *
 * Two effects, used perhaps three times across the whole site. They exist to
 * make a reader feel they have *discovered* something — not to decorate. Each
 * one is built so that the static state is already correct: if the effect never
 * runs, the page is unchanged in meaning and very nearly unchanged in looks.
 */

/**
 * Type set in outline that fills with ink as the reader passes it.
 *
 * Used on the Roll of Honour, where the idea is the record being written. The
 * unfilled state is deliberately legible — this is a heading, not a puzzle.
 */
export function InkFill({
  children,
  className,
  as: Tag = 'span',
}: {
  children: string;
  className?: string;
  as?: 'span' | 'h1' | 'h2';
}) {
  const scope = React.useRef<HTMLDivElement>(null);

  useGsapChoreography(
    scope,
    ({ gsap }) => {
      gsap.fromTo(
        '[data-ink-fill]',
        { '--palma-fill': '0%' },
        {
          '--palma-fill': '100%',
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top 85%',
            end: 'top 35%',
            scrub: 0.6,
          },
        },
      );
    },
    [],
  );

  return (
    <div ref={scope} className={cn('relative', className)}>
      {/* The outline sits underneath, always, and is a plain span rather than
          a second copy of the heading tag. Hiding a duplicate <h1> from the
          accessibility tree fixes what a screen reader hears and leaves the
          document with two <h1> elements in it, which is still wrong. */}
      <span aria-hidden="true" className="palma-ink-outline block">
        {children}
      </span>
      {/* The ink is painted over it through a clipped gradient. Only this
          layer is read aloud, so the text is announced exactly once. */}
      <Tag data-ink-fill className="palma-ink-fill absolute inset-0 block">
        {children}
      </Tag>
    </div>
  );
}

/**
 * A composition that acquires depth from the pointer.
 *
 * Layers move by different amounts against a tilting parent — enough to read as
 * dimensional, nowhere near enough to read as parallax. It is disabled entirely
 * on coarse pointers, where there is no cursor to respond to and the effect
 * would only cost battery.
 */
export function DepthLayer({
  children,
  className,
  strength = 1,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const scope = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = scope.current;
    if (!node) return;

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.matchMedia('(pointer: coarse)').matches
    ) {
      return;
    }

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;

    const tick = () => {
      frame = requestAnimationFrame(tick);
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      node.style.setProperty('--palma-depth-x', x.toFixed(4));
      node.style.setProperty('--palma-depth-y', y.toFixed(4));
    };

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      targetY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerleave', onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={scope}
      className={cn('palma-depth', className)}
      style={{ '--palma-depth-strength': strength } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/** A child of `DepthLayer`. `depth` of 1 sits at the surface; 3 sits furthest back. */
export function DepthItem({
  depth = 1,
  className,
  children,
}: {
  depth?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn('palma-depth-item', className)}
      style={{ '--palma-depth-level': depth } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
