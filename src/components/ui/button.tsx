import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * PALMA buttons.
 *
 * A button here is a stamped thing, not a rectangle with a fill. Three moves
 * happen at once on approach and none of them is a colour change:
 *
 *   ink    — sweeps across from the leading edge, behind the label
 *   frame  — a thin plate mark draws itself inside the edge
 *   lift   — the whole thing rises off the page, and settles on the press
 *
 * The mechanics live in `.palma-btn` in globals.css, because a pseudo-element
 * that sits *behind* the label cannot be expressed in utility classes. What
 * each variant supplies is the pair that matters: the colour it rests in, and
 * `--palma-btn-ink`, the colour that sweeps over it.
 */
const buttonVariants = cva(
  [
    'palma-btn group/button relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
    'motion-safe:hover:-translate-y-1 motion-safe:focus-visible:-translate-y-1',
    'motion-safe:active:translate-y-px motion-safe:active:duration-100',
    'disabled:pointer-events-none disabled:opacity-45 motion-safe:disabled:translate-y-0',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        // Ink already; the sweep is champagne, so approaching it warms.
        primary: 'bg-ink text-ivory [--palma-btn-ink:var(--color-champagne-deep)] hover:text-ink',
        // The signature move: an outline that fills with ink and inverts.
        outline:
          'border border-ink/25 text-ink [--palma-btn-ink:var(--color-ink)] hover:border-ink hover:text-ivory',
        ceremonial:
          'border border-champagne-deep/60 bg-champagne/15 text-ink [--palma-btn-ink:var(--color-champagne)] hover:border-champagne-deep',
        // For ink grounds: ivory rests, champagne sweeps.
        ivory: 'bg-ivory text-ink [--palma-btn-ink:var(--color-champagne)]',
        quiet:
          'border border-ivory/25 text-ivory [--palma-btn-ink:var(--color-ivory)] hover:border-ivory hover:text-ink',
        danger:
          'border border-red-900/30 text-red-900 [--palma-btn-ink:var(--color-red-900)] hover:text-ivory hover:border-red-900',
        // No ink, no frame: for the third action in a row, which should not
        // compete with the two that matter.
        ghost: 'palma-btn-plain text-ink hover:bg-ink/[0.05]',
        link: 'palma-btn-plain palma-link text-ink hover:-translate-y-0!',
      },
      size: {
        sm: 'palma-label h-9 px-4',
        md: 'palma-label h-11 px-6',
        lg: 'palma-label h-13 px-8 text-xs',
        icon: 'size-10 after:inset-1.5',
        /** The seal: circular, for a ceremonial act rather than a routine one. */
        seal: 'palma-seal-btn palma-label size-28 rounded-full text-[0.625rem] leading-tight after:rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
