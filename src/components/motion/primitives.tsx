'use client';

import * as React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';
import { enter, fade, group, rise, unmask, VIEWPORT } from '@/lib/motion';

/**
 * The reveal primitives.
 *
 * Every entrance on the public site goes through one of these, so the timing,
 * distance and threshold are identical everywhere. A component that wants to
 * animate differently has to say why.
 */

type RevealProps = Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'whileInView'> & {
  /** `rise` for content, `enter` for section-level headings, `fade` for the rest. */
  variant?: 'rise' | 'enter' | 'fade';
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
};

const VARIANTS = { rise, enter, fade } as const;

export function Reveal({
  variant = 'rise',
  delay = 0,
  as = 'div',
  className,
  children,
  ...props
}: RevealProps) {
  // Motion types each element separately, so a polymorphic `as` produces a union
  // of incompatible event handlers. The props we accept are div-compatible by
  // construction, so the tag is narrowed to one of them.
  const Component = motion[as] as typeof motion.div;

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={VARIANTS[variant]}
      transition={delay ? { delay } : undefined}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}

/** Parent of a staggered set. Children must be `RevealItem`. */
export function RevealGroup({
  stagger,
  delay,
  className,
  children,
  as = 'div',
  ...props
}: Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'whileInView'> & {
  stagger?: number;
  delay?: number;
  as?: 'div' | 'ul' | 'ol' | 'section';
}) {
  // Motion types each element separately, so a polymorphic `as` produces a union
  // of incompatible event handlers. The props we accept are div-compatible by
  // construction, so the tag is narrowed to one of them.
  const Component = motion[as] as typeof motion.div;

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={group(stagger, delay)}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}

export function RevealItem({
  className,
  children,
  as = 'div',
  ...props
}: Omit<HTMLMotionProps<'div'>, 'variants'> & { as?: 'div' | 'li' | 'article' }) {
  // Motion types each element separately, so a polymorphic `as` produces a union
  // of incompatible event handlers. The props we accept are div-compatible by
  // construction, so the tag is narrowed to one of them.
  const Component = motion[as] as typeof motion.div;
  return (
    <Component variants={rise} className={className} {...props}>
      {children}
    </Component>
  );
}

/**
 * Type that rises from behind its own baseline.
 *
 * Each line gets its own clipping mask, which is what makes it read as
 * typesetting rather than a fade. Under reduced motion the mask is removed
 * entirely — a clipped element that never animates would be invisible.
 */
export function MaskedLines({
  lines,
  className,
  lineClassName,
  stagger = 0.08,
  delay = 0,
  as: Tag = 'span',
  trigger = 'inView',
}: {
  lines: string[];
  className?: string;
  lineClassName?: string;
  stagger?: number;
  delay?: number;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
  /**
   * `inView` for type further down a page; `mount` for anything above the
   * fold. A masthead title is on screen before any observer can report it, so
   * waiting for an intersection leaves the heading clipped at its own
   * baseline — invisible, and the page missing its title.
   */
  trigger?: 'inView' | 'mount';
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <Tag className={className}>
        {lines.map((line, index) => (
          <span key={index} className={cn('block', lineClassName)}>
            {line}
          </span>
        ))}
      </Tag>
    );
  }

  const play =
    trigger === 'mount'
      ? ({ animate: 'visible' } as const)
      : ({ whileInView: 'visible', viewport: VIEWPORT } as const);

  return (
    <Tag className={className}>
      {lines.map((line, index) => (
        <span key={index} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className={cn('block', lineClassName)}
            initial="hidden"
            variants={unmask}
            transition={{ delay: delay + index * stagger }}
            {...play}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * A rule that draws itself as it enters — the smallest editorial gesture in the
 * system, and the one used most often.
 */
export function DrawnRule({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn('block h-px w-full origin-left bg-current/25', className)}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
    />
  );
}

/** Re-exported so components do not each import from `motion/react` directly. */
export { useReducedMotion };
