import type { Transition, Variants } from 'motion/react';
import { DURATION, EASE, STAGGER, TRAVEL } from './tokens';

/**
 * The shared vocabulary of movement.
 *
 * Components reach for a named variant rather than inventing their own
 * numbers — that is what keeps a card, a row and a section feeling related.
 */

export const transition = {
  quick: { duration: DURATION.quick, ease: EASE.ceremonial },
  base: { duration: DURATION.base, ease: EASE.ceremonial },
  slow: { duration: DURATION.slow, ease: EASE.ceremonial },
  ceremonial: { duration: DURATION.ceremonial, ease: EASE.ceremonial },
  editorial: { duration: DURATION.base, ease: EASE.editorial },
  exit: { duration: DURATION.quick, ease: EASE.exit },
  tactile: { duration: DURATION.instant, ease: EASE.tactile },
} satisfies Record<string, Transition>;

/** Content arriving in the viewport: up and in, never sideways. */
export const rise: Variants = {
  hidden: { opacity: 0, y: TRAVEL.rise },
  visible: { opacity: 1, y: 0, transition: transition.slow },
};

/** For section headings and display type — a touch further, a touch slower. */
export const enter: Variants = {
  hidden: { opacity: 0, y: TRAVEL.enter },
  visible: { opacity: 1, y: 0, transition: transition.ceremonial },
};

/**
 * The editorial reveal: type emerges from behind its own baseline, the way a
 * line of print appears as a page is turned. Requires a clipping parent.
 */
export const unmask: Variants = {
  hidden: { y: '110%' },
  visible: { y: '0%', transition: { duration: DURATION.ceremonial, ease: EASE.editorial } },
};

/** Fade only. For anything where movement would be noise. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.base },
};

/** Parent for staggered groups. Children use `rise` or `unmask`. */
export function group(stagger: number = STAGGER.editorial, delay = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
}

/**
 * Hover and press for anything tactile.
 *
 * `near` is 4px. It reads as the object being lifted rather than the page
 * rearranging itself, which is the difference between a considered interface
 * and a bouncy one.
 */
export const tactile = {
  rest: { y: 0 },
  hover: { y: -TRAVEL.near, transition: transition.quick },
  press: { y: 1, transition: transition.tactile },
} as const;

/** An icon that slides in on hover, from nothing. */
export const iconEnter = {
  rest: { opacity: 0, x: -TRAVEL.step },
  hover: { opacity: 1, x: 0, transition: transition.quick },
} as const;

/** An arrow that advances on hover. */
export const iconAdvance = {
  rest: { x: 0 },
  hover: { x: TRAVEL.step, transition: transition.quick },
} as const;

/** A rule that draws itself from the leading edge. */
export const ruleDraw = {
  rest: { scaleX: 0, transformOrigin: 'left' },
  hover: { scaleX: 1, transformOrigin: 'left', transition: transition.base },
} as const;

/** Secondary information that surfaces on hover, without shifting layout. */
export const surface = {
  rest: { opacity: 0, y: TRAVEL.near },
  hover: { opacity: 1, y: 0, transition: transition.base },
} as const;

/** Editorial image: a slow, almost imperceptible push in. */
export const imagePush = {
  rest: { scale: 1 },
  hover: { scale: 1.03, transition: { duration: DURATION.slow, ease: EASE.ceremonial } },
} as const;

/** Page-level transition. Deliberately quiet: PALMA moves you, it does not spin. */
export const page: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transition.base },
  leaving: { opacity: 0, y: -4, transition: transition.exit },
};
