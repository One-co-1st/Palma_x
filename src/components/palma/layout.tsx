import * as React from 'react';
import { cn } from '@/lib/utils';
import { SectionReveal } from './SectionReveal';

export function Container({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & { size?: 'default' | 'wide' | 'narrow' }) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-5 sm:px-8',
        size === 'wide' ? 'max-w-360' : size === 'narrow' ? 'max-w-180' : 'max-w-300',
        className,
      )}
      {...props}
    />
  );
}

/**
 * A full-width editorial band.
 *
 * It reveals as it comes into view, because it is the unit the public site is
 * built out of and putting the movement here is what makes the site feel
 * moved by one hand rather than decorated in three places. Before this, the
 * reveal existed and was applied to five elements on a seven-screen home page
 * and to nothing at all on THE PALMA, Kulture and About, which is a motion
 * system nobody can see.
 *
 * `reveal={false}` for a band that must be present the instant it renders —
 * anything holding an error, a form the reader was sent to, or content that
 * is itself already animated.
 */
export function Section({
  className,
  tone = 'ivory',
  reveal = true,
  ...props
}: React.ComponentProps<'section'> & {
  tone?: 'ivory' | 'ink' | 'stone' | 'olive';
  reveal?: boolean;
}) {
  const tones = {
    ivory: 'bg-ivory text-ink',
    stone: 'bg-stone/35 text-ink',
    ink: 'on-ink bg-ink text-ivory',
    olive: 'on-ink bg-olive text-ivory',
  } as const;

  const classes = cn('py-20 sm:py-28', tones[tone], className);

  if (!reveal) return <section className={classes} {...props} />;
  return <SectionReveal className={classes} {...props} />;
}

/**
 * The standing section header: an institutional label, a display title, and an
 * optional standfirst. Used everywhere so the page rhythm stays consistent.
 */
export function SectionHeading({
  label,
  title,
  standfirst,
  action,
  align = 'start',
  className,
}: {
  label?: string;
  title: React.ReactNode;
  standfirst?: React.ReactNode;
  action?: React.ReactNode;
  align?: 'start' | 'centre';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between',
        align === 'centre' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn('flex max-w-180 flex-col gap-4', align === 'centre' && 'items-center')}>
        {label ? <span className="palma-label text-taupe-deep">{label}</span> : null}
        <h2 className="text-3xl leading-[1.08] sm:text-4xl lg:text-[2.75rem]">{title}</h2>
        {standfirst ? (
          <p className="text-taupe-deep max-w-150 text-[1.0625rem] leading-relaxed">{standfirst}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
