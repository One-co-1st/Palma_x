import * as React from 'react';
import { Container } from './layout';
import { PalmMark } from '@/components/brand/PalmMark';
import { MaskedLines } from '@/components/motion/primitives';
import { pigmentStyle } from '@/lib/category-identity';
import { cn } from '@/lib/utils';

/**
 * The masthead.
 *
 * A page header on PALMA is not a coloured rectangle with a heading in it. It
 * is the top of a printed page: crop marks at the corners, an eyebrow with the
 * section mark, the title set in display, a folio rule, a divided meta rail,
 * and — where the page has one — a plate in the right-hand column carrying the
 * year, a figure or the seal.
 *
 * The plate matters more than it looks. Without it every header on the site had
 * a large empty right-hand column, which is what made them read as generic.
 */

export type MastheadProps = {
  /** Small type above the title. A section mark, a season, a breadcrumb. */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** Split across lines for the masked reveal. Falls back to `title`. */
  titleLines?: string[];
  standfirst?: React.ReactNode;
  /**
   * One quiet line directly under the title — a sponsor attribution, a status.
   * Beneath the headline and above the standfirst, so it reads as a note about
   * the thing rather than part of its name.
   */
  belowTitle?: React.ReactNode;
  /** Divided items beneath the folio rule. */
  meta?: React.ReactNode[];
  /** The right-hand column: a figure, a seal, a badge stack. */
  plate?: React.ReactNode;
  /** A very large, very quiet numeral behind the plate — usually the year. */
  figure?: string | number;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /** Ties the masthead to a category's pigment. */
  categorySlug?: string;
  tone?: 'ink' | 'ivory';
  /** `tall` for landing pages, `compact` for records and utility pages. */
  size?: 'tall' | 'compact';
};

export function Masthead({
  eyebrow,
  title,
  titleLines,
  standfirst,
  belowTitle,
  meta,
  plate,
  figure,
  actions,
  children,
  categorySlug,
  tone = 'ink',
  size = 'tall',
}: MastheadProps) {
  const dark = tone === 'ink';
  const lines = titleLines ?? (typeof title === 'string' ? [title] : null);

  return (
    <header
      style={categorySlug ? pigmentStyle(categorySlug) : undefined}
      className={cn(
        'relative isolate overflow-hidden border-b',
        dark ? 'on-ink border-ink bg-ink text-ivory' : 'border-stone-deep bg-ivory text-ink',
      )}
    >
      {/* The engraving, scaled right down on a phone so it never competes with
          the title it sits behind. */}
      <PalmMark
        className={cn(
          'pointer-events-none absolute -z-10 opacity-[0.05]',
          '-top-4 -right-16 h-56 sm:top-0 sm:-right-10 sm:h-[26rem] lg:h-[32rem]',
        )}
      />

      {/* Crop marks. Print apparatus, and the detail that most makes this read
          as a masthead rather than a banner. */}
      <span
        className="palma-crop top-5 left-5 hidden sm:block"
        data-corner="tl"
        aria-hidden="true"
      />
      <span
        className="palma-crop top-5 right-5 hidden sm:block"
        data-corner="tr"
        aria-hidden="true"
      />
      <span
        className="palma-crop bottom-5 left-5 hidden sm:block"
        data-corner="bl"
        aria-hidden="true"
      />
      <span
        className="palma-crop right-5 bottom-5 hidden sm:block"
        data-corner="br"
        aria-hidden="true"
      />

      <Container
        className={cn(
          'relative',
          size === 'tall' ? 'py-14 sm:py-18 lg:py-22' : 'py-10 sm:py-12 lg:py-14',
        )}
      >
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="flex flex-col gap-6 lg:col-span-8">
            {eyebrow ? (
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'palma-pigment-rule inline-block h-2 w-2 shrink-0 rounded-full',
                    !categorySlug && (dark ? 'bg-champagne' : 'bg-olive'),
                  )}
                />
                <span className={cn('palma-label', dark ? 'text-champagne' : 'palma-pigment-text')}>
                  {eyebrow}
                </span>
              </span>
            ) : null}

            {lines ? (
              <MaskedLines
                as="h1"
                trigger="mount"
                lines={lines}
                className={cn(
                  'text-balance-display font-display',
                  size === 'tall'
                    ? 'text-[2.5rem] leading-[0.98] sm:text-6xl lg:text-7xl'
                    : 'text-4xl leading-[1.02] sm:text-5xl lg:text-6xl',
                )}
              />
            ) : (
              <h1
                className={cn(
                  'text-balance-display',
                  size === 'tall'
                    ? 'text-[2.5rem] leading-[0.98] sm:text-6xl lg:text-7xl'
                    : 'text-4xl leading-[1.02] sm:text-5xl lg:text-6xl',
                )}
              >
                {title}
              </h1>
            )}

            {/* The folio rule. */}
            <span
              aria-hidden="true"
              className={cn('block h-px w-full max-w-md', dark ? 'bg-ivory/25' : 'bg-stone-deep')}
            />

            {belowTitle ? <div className="-mt-1">{belowTitle}</div> : null}

            {standfirst ? (
              <p
                className={cn(
                  'max-w-160 text-base leading-relaxed text-pretty sm:text-lg',
                  dark ? 'text-ivory/70' : 'text-taupe-deep',
                )}
              >
                {standfirst}
              </p>
            ) : null}

            {actions ? <div className="flex flex-wrap gap-3 pt-2">{actions}</div> : null}
            {children}
          </div>

          {plate || figure ? (
            <div className="relative flex items-start justify-start lg:col-span-4 lg:justify-end">
              {figure ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'palma-figure pointer-events-none absolute -top-4 right-0 select-none',
                    'text-[5rem] sm:text-[8rem] lg:text-[11rem]',
                    dark ? 'text-ivory/[0.07]' : 'text-ink/[0.06]',
                  )}
                >
                  {figure}
                </span>
              ) : null}
              {plate ? <div className="relative w-full max-w-72">{plate}</div> : null}
            </div>
          ) : null}
        </div>

        {meta && meta.length > 0 ? (
          <div
            className={cn(
              'mt-10 border-t pt-5 sm:mt-12',
              dark ? 'border-ivory/15' : 'border-stone-deep',
            )}
          >
            <div
              className={cn(
                'palma-rail palma-label gap-y-3 leading-[1.5]',
                dark ? 'text-ivory/55' : 'text-taupe-deep',
              )}
            >
              {meta.map((item, index) => (
                <span key={index}>{item}</span>
              ))}
            </div>
          </div>
        ) : null}
      </Container>

      {/* The bottom edge carries the page's colour: a category pigment where
          there is one, the ceremonial accent where there is not. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 bottom-0 h-0.5',
          categorySlug ? 'palma-pigment-crest' : dark ? 'bg-champagne/40' : 'bg-olive/30',
        )}
      />
    </header>
  );
}

/**
 * The plate that sits in a masthead's right-hand column. Bordered, quiet, and
 * sized to hold three or four facts without becoming a card.
 */
export function MastheadPlate({
  label,
  children,
  tone = 'ink',
  className,
}: {
  label?: string;
  children: React.ReactNode;
  tone?: 'ink' | 'ivory';
  className?: string;
}) {
  const dark = tone === 'ink';
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border p-6 backdrop-blur-[2px]',
        dark ? 'border-ivory/20 bg-ivory/[0.04]' : 'border-stone-deep bg-ivory-bright/70',
        className,
      )}
    >
      {label ? (
        <span
          className={cn('palma-label leading-[1.5]', dark ? 'text-champagne' : 'text-taupe-deep')}
        >
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}

/** A single fact inside a plate. */
export function PlateFact({
  term,
  children,
  tone = 'ink',
}: {
  term: string;
  children: React.ReactNode;
  tone?: 'ink' | 'ivory';
}) {
  const dark = tone === 'ink';
  return (
    <div className="flex flex-col gap-1">
      <dt
        className={cn(
          'palma-label text-[0.625rem] leading-[1.5]',
          dark ? 'text-ivory/45' : 'text-taupe',
        )}
      >
        {term}
      </dt>
      <dd className="font-display text-[1.0625rem] leading-snug text-pretty">{children}</dd>
    </div>
  );
}
