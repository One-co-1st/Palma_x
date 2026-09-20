'use client';

import * as React from 'react';
import { PalmaSeal } from '@/components/brand/PalmaSeal';
import { cn } from '@/lib/utils';
import type { TrophyHandle } from '@/lib/three/trophy';

/**
 * The PALMA trophy, rendered.
 *
 * The most expensive thing on the site, so it is gated four ways:
 *
 *   · Three.js is imported only when this component is on screen — never in
 *     the entry bundle, never on a page that does not confer an honour.
 *   · Under `prefers-reduced-motion` it never loads at all; the engraved seal
 *     stands in its place, which is the same mark in two dimensions.
 *   · It stops rendering when scrolled away or when the tab is hidden.
 *   · If WebGL is unavailable or the import fails, the seal stands in silently.
 *
 * The seal fallback is not a degraded experience. It is the printed form of
 * the same object, and a winner page built only from it would still be right.
 */
export function PalmaTrophy({
  className,
  legend,
  centre = 'Winner',
}: {
  className?: string;
  legend: string;
  centre?: string;
}) {
  const container = React.useRef<HTMLDivElement>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const handle = React.useRef<TrophyHandle | null>(null);
  const [live, setLive] = React.useState(false);

  React.useEffect(() => {
    const node = container.current;
    const surface = canvas.current;
    if (!node || !surface) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let disposed = false;
    let started = false;

    const start = async () => {
      if (started || disposed) return;
      started = true;

      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      try {
        const { createTrophy } = await import('@/lib/three/trophy');
        if (disposed) return;

        handle.current = await createTrophy(surface, {
          width: rect.width,
          height: rect.height,
          dpr: window.devicePixelRatio,
        });
        if (disposed) {
          handle.current.dispose();
          handle.current = null;
          return;
        }
        setLive(true);
      } catch {
        // No WebGL, or the chunk could not be fetched. The seal remains.
      }
    };

    // Only pay for the trophy once it is actually approaching the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) void start();
          handle.current?.setRunning(entry.isIntersecting);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);

    const onVisibility = () => handle.current?.setRunning(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);

    const onPointer = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      handle.current?.lookToward(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * 2 - 1,
      );
    };
    node.addEventListener('pointermove', onPointer);
    node.addEventListener('pointerleave', () => handle.current?.lookToward(0, 0));

    const resize = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) handle.current?.resize(width, height);
    });
    resize.observe(node);

    return () => {
      disposed = true;
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      node.removeEventListener('pointermove', onPointer);
      handle.current?.dispose();
      handle.current = null;
    };
  }, []);

  return (
    <div
      ref={container}
      className={cn('relative aspect-square w-full overflow-hidden', className)}
      role="img"
      aria-label={`The PALMA trophy, ${legend}`}
    >
      <canvas
        ref={canvas}
        aria-hidden="true"
        className={cn(
          'absolute inset-0 h-full w-full transition-opacity duration-1000 ease-(--ease-ceremonial)',
          live ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* The printed form of the same object. Always rendered; it simply yields
          once the dimensional one is ready. */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-(--ease-ceremonial)',
          live ? 'opacity-0' : 'opacity-100',
        )}
      >
        <PalmaSeal
          legend={legend}
          sublegend="THE CREATOR HONOURS"
          centre={centre}
          className="text-champagne/85 h-3/4 w-3/4"
        />
      </div>
    </div>
  );
}
