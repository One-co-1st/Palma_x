import Link from 'next/link';
import { PUBLIC_PHASES, phaseState, type SeasonStage } from '@/domain/season';
import { cn, ordinal } from '@/lib/utils';

/**
 * The season rail.
 *
 * Nominations, shortlist, finalists and winners are the four states of a PALMA
 * season, so they are navigated as states of the season rather than as separate
 * top-level destinations. A state that has not been reached is not a link.
 */
export function SeasonRail({
  year,
  stage,
  current,
  tone = 'dark',
  className,
}: {
  year: number;
  stage: SeasonStage;
  /** Marks the page the reader is on, when they are inside one of the states. */
  current?: 'nominate' | 'shortlist' | 'finalists' | 'winners';
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const dark = tone === 'dark';

  const href: Record<string, string> = {
    nominate: '/nominate',
    shortlist: `/awards/${year}#shortlist`,
    finalists: `/finalists?year=${year}`,
    winners: `/winners?year=${year}`,
  };

  return (
    <nav aria-label={`PALMA ${year} season`} className={className}>
      <ol className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
        {PUBLIC_PHASES.map((phase, index) => {
          const state = phaseState(stage, index);
          const reachable = state !== 'upcoming';
          const isCurrent = current === phase.key;

          const body = (
            <>
              <span
                className={cn(
                  'palma-label',
                  state === 'upcoming'
                    ? dark
                      ? 'text-ivory/35'
                      : 'text-taupe'
                    : dark
                      ? 'text-champagne'
                      : 'text-olive',
                )}
              >
                {ordinal(index)}
              </span>
              <span
                className={cn(
                  'font-display text-2xl leading-none',
                  state === 'upcoming' && (dark ? 'text-ivory/45' : 'text-taupe-deep'),
                )}
              >
                {phase.label}
              </span>
              <span className={cn('text-xs', dark ? 'text-ivory/45' : 'text-taupe-deep')}>
                {state === 'current'
                  ? 'In progress'
                  : state === 'complete'
                    ? 'Announced'
                    : 'To come'}
              </span>
            </>
          );

          const frame = cn(
            'flex flex-col gap-3 border-t-2 pt-5 transition-colors',
            isCurrent
              ? dark
                ? 'border-champagne'
                : 'border-ink'
              : state === 'current'
                ? dark
                  ? 'border-ivory/70'
                  : 'border-olive'
                : state === 'complete'
                  ? dark
                    ? 'border-ivory/35'
                    : 'border-taupe'
                  : dark
                    ? 'border-ivory/15'
                    : 'border-stone-deep',
            reachable && !isCurrent && (dark ? 'hover:border-champagne' : 'hover:border-ink'),
          );

          return (
            <li key={phase.key}>
              {reachable ? (
                <Link
                  href={href[phase.key]!}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={frame}
                >
                  {body}
                </Link>
              ) : (
                <div className={frame} aria-disabled="true">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
