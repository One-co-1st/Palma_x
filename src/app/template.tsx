'use client';

import { motion } from 'motion/react';
import { DURATION, EASE } from '@/lib/motion';

/**
 * Page transition.
 *
 * `template.tsx` remounts on every navigation, which is what makes this a
 * transition rather than a one-off mount animation.
 *
 * It is deliberately quiet — a short rise and settle, no wipes, no curtains,
 * no page-turning. PALMA should feel like it *moved you somewhere*, and the
 * way an institution does that is by being composed, not theatrical. The
 * ceremony is spent on the winner reveal; everything else gets out of the way.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.ceremonial }}
    >
      {children}
    </motion.div>
  );
}
