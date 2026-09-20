/**
 * PALMA motion tokens.
 *
 * One source of truth for every moving thing on the site — Motion components,
 * GSAP timelines and raw CSS all read from here. The point is not to make
 * animation configurable; it is to make it *consistent*, so the whole site
 * feels like it was moved by one hand.
 *
 * The governing rule: motion in PALMA is ceremonial and editorial. It gives
 * weight to what matters and gets out of the way of everything else. If a
 * movement exists only because it looks good, it does not belong here.
 */

/** Seconds, because both Motion and GSAP think in seconds. */
export const DURATION = {
  /** Tactile feedback — a press, a toggle. Felt, not seen. */
  instant: 0.12,
  /** Hover and focus states. Fast enough to feel attached to the cursor. */
  quick: 0.22,
  /** The default for anything entering or leaving in place. */
  base: 0.38,
  /** Editorial reveals: a card, a row, an image. */
  slow: 0.64,
  /** Page-level transitions and section entrances. */
  ceremonial: 0.9,
  /** Reserved for the winner reveal and the seal. Used twice on the whole site. */
  rite: 1.4,
} as const;

/**
 * One easing family.
 *
 * `ceremonial` is the house curve — a firm start that settles rather than
 * bounces, which is what makes the institution feel composed instead of
 * springy. Everything else is a deliberate exception with a stated reason.
 */
export const EASE = {
  /** The house curve. Use this unless there is a reason not to. */
  ceremonial: [0.16, 1, 0.3, 1],
  /** Slightly faster settle, for text and small editorial moves. */
  editorial: [0.22, 1, 0.36, 1],
  /** Leaving. Accelerates away — exits should not linger. */
  exit: [0.4, 0, 1, 1],
  /** Physical overshoot. Only for press and tactile feedback. */
  tactile: [0.34, 1.4, 0.64, 1],
  /** Linear, for scroll-linked progress that must track the scrollbar exactly. */
  scrub: 'none',
} as const;

/** CSS-side equivalents, for the places where a transition is simpler. */
export const CSS_EASE = {
  ceremonial: 'cubic-bezier(0.16, 1, 0.3, 1)',
  editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  tactile: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
} as const;

/**
 * Movement distances, in pixels.
 *
 * PALMA moves things a *little*. Large travel reads as a web page performing;
 * small travel reads as a printed page being set.
 */
export const TRAVEL = {
  /** Border and underline reveals. */
  hairline: 2,
  /** Hover lift on a card or a button. */
  near: 4,
  /** An icon sliding into place. */
  step: 8,
  /** The standard rise-in for content entering the viewport. */
  rise: 18,
  /** Section-level entrances. */
  enter: 36,
} as const;

/** Stagger delays, in seconds. */
export const STAGGER = {
  /** Table rows, list items, filter chips. */
  tight: 0.04,
  /** Editorial grids — creator cards, finalists. */
  editorial: 0.08,
  /** The winner sequence. Deliberately slow enough to feel announced. */
  ceremonial: 0.14,
} as const;

/**
 * How far into the viewport an element must be before it reveals.
 *
 * Negative bottom margin means "a little *after* it enters", so content is
 * already settled by the time the reader's eye reaches it — nothing should
 * animate under the reader's nose.
 */
export const VIEWPORT = { once: true, margin: '0px 0px -12% 0px', amount: 0.15 } as const;

export type Duration = keyof typeof DURATION;
export type Ease = keyof typeof EASE;
