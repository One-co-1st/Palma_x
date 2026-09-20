'use client';

import * as React from 'react';
import type { gsap as GsapNamespace } from 'gsap';
import type { ScrollTrigger as ScrollTriggerPlugin } from 'gsap/ScrollTrigger';

type Gsap = typeof GsapNamespace;
type ScrollTriggerType = typeof ScrollTriggerPlugin;

let registered: Promise<{ gsap: Gsap; ScrollTrigger: ScrollTriggerType }> | null = null;

/**
 * GSAP, loaded on demand.
 *
 * GSAP and ScrollTrigger are ~70kb that only two or three pages need. Loading
 * them from the entry bundle would tax every reader — including the one who
 * came to check a verification code on a phone — for a sequence they will
 * never scroll to. So they are imported when a choreographed section actually
 * mounts, and never at all under `prefers-reduced-motion`.
 */
async function loadGsap() {
  registered ??= (async () => {
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]);
    gsap.registerPlugin(ScrollTrigger);
    return { gsap, ScrollTrigger };
  })();
  return registered;
}

export type GsapContext = { gsap: Gsap; ScrollTrigger: ScrollTriggerType };

/**
 * Runs a GSAP setup function against a scope element, inside `gsap.context()`
 * so every tween and trigger it creates is reverted together on unmount — the
 * one discipline that keeps ScrollTrigger from leaking across client-side
 * navigations.
 */
export function useGsapChoreography(
  scope: React.RefObject<HTMLElement | null>,
  setup: (context: GsapContext) => void,
  deps: React.DependencyList = [],
) {
  React.useEffect(() => {
    const node = scope.current;
    if (!node) return;

    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    let context: { revert: () => void } | undefined;
    let cancelled = false;

    void loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
      context = gsap.context(() => setup({ gsap, ScrollTrigger }), node);
    });

    return () => {
      cancelled = true;
      context?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
