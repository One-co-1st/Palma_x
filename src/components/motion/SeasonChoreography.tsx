'use client';

import * as React from 'react';
import Link from 'next/link';
import { PUBLIC_PHASES, phaseState, type SeasonStage } from '@/domain/season';
import { formatShortDate } from '@/lib/format';
import { cn, ordinal } from '@/lib/utils';
import { useGsapChoreography } from './useGsap';

type Phase = { key: string; label: string; date: string | null; state: string; href: string };

/**
 * The season, told as a scroll.
 *
 * This is the one place on PALMA where scrolling *is* the content. The four
 * beats of a season are stacked vertically; a line draws down through them as
 * the reader descends, each beat resolves as the line reaches it, and the
 * final beat — Winners — arrives at full display scale as an event rather than
 * another row.
 *
 * The rules that keep it from becoming a showreel:
 *
 *   · The section pins for its own height and no longer. The reader is never
 *     held against their will.
 *   · Every beat is fully legible before it animates. Nothing here carries
 *     information that the animation reveals.
 *   · Under `prefers-reduced-motion` GSAP is never loaded and the markup below
 *     stands as a complete, static season rail.
 */
export function SeasonChoreography({
  year,
  stage,
  dates,
  className,
}: {
  year: number;
  stage: SeasonStage;
  dates?: (string | null)[];
  className?: string;
}) {
  const scope = React.useRef<HTMLDivElement>(null);

  const phases: Phase[] = PUBLIC_PHASES.map((phase, index) => ({
    key: phase.key,
    label: phase.label,
    date: dates?.[index] ?? null,
    state: phaseState(stage, index),
    href:
      phase.key === 'nominate'
        ? '/nominate'
        : phase.key === 'shortlist'
          ? `/awards/${year}#shortlist`
          : phase.key === 'finalists'
            ? `/finalists?year=${year}`
            : `/winners?year=${year}`,
  }));

  useGsapChoreography(
    scope,
    ({ gsap }) => {
      const beats = gsap.utils.toArray<HTMLElement>('[data-beat]');

      // The spine draws itself down the section as the reader descends.
      gsap.fromTo(
        '[data-spine]',
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top 70%',
            end: 'bottom 70%',
            scrub: true,
          },
        },
      );

      // Each beat resolves as the spine reaches it.
      beats.forEach((beat, index) => {
        const isLast = index === beats.length - 1;

        gsap
          .timeline({
            scrollTrigger: {
              trigger: beat,
              start: 'top 78%',
              toggleActions: 'play none none reverse',
            },
          })
          .fromTo(
            beat.querySelector('[data-beat-index]'),
            { opacity: 0, x: -10 },
            { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' },
          )
          .fromTo(
            beat.querySelector('[data-beat-label]'),
            { yPercent: 110 },
            { yPercent: 0, duration: 0.8, ease: 'power3.out' },
            '-=0.35',
          )
          .fromTo(
            beat.querySelector('[data-beat-meta]'),
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
            '-=0.45',
          )
          .fromTo(
            beat.querySelector('[data-beat-node]'),
            { scale: 0.2, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2)' },
            '-=0.7',
          );

        // Winners is the arrival. It gets scale as well as entrance — the only
        // beat that does, because it is the only one that is an announcement.
        if (isLast) {
          gsap.fromTo(
            beat.querySelector('[data-beat-label]'),
            { scale: 0.92 },
            {
              scale: 1,
              ease: 'none',
              scrollTrigger: { trigger: beat, start: 'top 85%', end: 'top 45%', scrub: true },
            },
          );
        }
      });
    },
    [],
  );

  return (
    <div ref={scope} className={cn('relative', className)}>
      {/* The spine. Decorative: the beats below are a list with or without it. */}
      <div
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-[7px] w-px bg-current/12 md:left-[9px]"
      >
        <span data-spine className="block h-full w-full origin-top bg-current/45" />
      </div>

      <ol className="flex flex-col">
        {phases.map((phase, index) => {
          const reachable = phase.state !== 'upcoming';
          const isLast = index === phases.length - 1;

          return (
            <li
              key={phase.key}
              data-beat
              aria-current={phase.state === 'current' ? 'step' : undefined}
              className="relative flex gap-6 pb-16 pl-10 last:pb-0 md:gap-8 md:pl-14"
            >
              <span
                data-beat-node
                aria-hidden="true"
                className={cn(
                  'absolute top-2 left-0 size-4 rounded-full border-2 md:size-5',
                  phase.state === 'current'
                    ? 'border-champagne bg-champagne/25'
                    : phase.state === 'complete'
                      ? 'border-current/60 bg-current/40'
                      : 'border-current/20 bg-transparent',
                )}
              />

              <div className="flex flex-col gap-3">
                <span data-beat-index className="palma-label opacity-50">
                  {ordinal(index)}
                </span>

                <span className="block overflow-hidden pb-[0.08em]">
                  {reachable ? (
                    <Link
                      href={phase.href}
                      data-beat-label
                      className={cn(
                        'palma-link font-display block origin-left text-4xl leading-none sm:text-6xl',
                        isLast && 'lg:text-7xl',
                      )}
                    >
                      {phase.label}
                    </Link>
                  ) : (
                    <span
                      data-beat-label
                      className={cn(
                        'font-display block origin-left text-4xl leading-none opacity-45 sm:text-6xl',
                        isLast && 'lg:text-7xl',
                      )}
                    >
                      {phase.label}
                    </span>
                  )}
                </span>

                <span data-beat-meta className="palma-label opacity-55">
                  {phase.state === 'current'
                    ? 'In progress'
                    : phase.state === 'complete'
                      ? 'Announced'
                      : phase.date
                        ? formatShortDate(phase.date)
                        : 'To come'}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
