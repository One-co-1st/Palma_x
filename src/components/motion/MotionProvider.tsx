'use client';

import { MotionConfig } from 'motion/react';
import { DURATION, EASE } from '@/lib/motion';

/**
 * The house transition, applied to every Motion component that does not state
 * its own — and the single place `prefers-reduced-motion` is honoured for the
 * Motion layer.
 *
 * `reducedMotion="user"` keeps opacity changes (which carry meaning: this is
 * new, this is gone) and drops every transform (which carries only flourish).
 * That is the correct trade: a reader who asks for less motion should still be
 * told what changed.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: DURATION.base, ease: EASE.ceremonial }}
    >
      {children}
    </MotionConfig>
  );
}
