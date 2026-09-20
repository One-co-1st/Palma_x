'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CHAPTERS, PALMA_YEAR, type Chapter, type ChapterKey, type Month } from '@/domain/calendar';
import { DURATION, EASE, VIEWPORT } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * The PALMA year, as a dial.
 *
 * A twelve-month rhythm drawn as a list is a list. Drawn as a ring it is a
 * *year* — you can see at a glance that the season is a third of it, that the
 * ceremony sits at the top, and that the other eight months are not a gap but
 * three chapters of work with names.
 *
 * The ring starts at April rather than January, because the PALMA year does.
 * A calendar year is an accounting convention; the institution's year begins
 * when nominations open and ends when the last winner enters the Roll of
 * Honour. Putting April at twelve o'clock says that without a caption.
 *
 * The dial and the list beneath it are one component rather than two, because
 * they are one object: pointing at either lights the other. That is the whole
 * interaction, and it is enough.
 */

const CENTRE = 200;
const OUTER = 176;
const INNER = 128;
/** A hair of space between arcs, so the ring reads as set rather than filled. */
const KERF = 1.1;

/** April is 0. The PALMA year's own month numbering. */
function palmaIndex(month: Month): number {
  return (month - 4 + 12) % 12;
}

function polar(radius: number, degrees: number): { x: number; y: number } {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return {
    x: CENTRE + radius * Math.cos(radians),
    y: CENTRE + radius * Math.sin(radians),
  };
}

/** One donut segment, from one angle to another. */
function segmentPath(from: number, to: number, outer = OUTER, inner = INNER): string {
  const a = polar(outer, from);
  const b = polar(outer, to);
  const c = polar(inner, to);
  const d = polar(inner, from);
  const large = to - from > 180 ? 1 : 0;

  return [
    `M ${a.x.toFixed(2)} ${a.y.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`,
    `L ${c.x.toFixed(2)} ${c.y.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${d.x.toFixed(2)} ${d.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/** Where a chapter sits on the dial, and how much of it it takes. */
function arcOf(chapter: Chapter): { from: number; to: number; mid: number } {
  const index = palmaIndex(chapter.from);
  const span = chapter.to - chapter.from + 1;
  const from = index * 30;
  const to = from + span * 30;
  return { from: from + KERF, to: to - KERF, mid: (from + to) / 2 };
}

const MONTH_INITIAL = ['A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D', 'J', 'F', 'M'];

export function PalmaYear({
  /** Computed on the server, so the dial does not disagree with itself on hydration. */
  today,
  currentChapter,
  className,
}: {
  today: Month;
  currentChapter: ChapterKey;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [pointed, setPointed] = React.useState<ChapterKey | null>(null);
  const active = pointed ?? currentChapter;

  const todayAngle = palmaIndex(today) * 30 + 15;

  return (
    <div className={cn('grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-16', className)}>
      <div className="lg:col-span-5">
        <motion.svg
          viewBox="0 0 400 400"
          role="img"
          aria-label="The PALMA year: four months of season from April, then eight of institution."
          className="mx-auto block w-full max-w-92"
          initial={reduced ? undefined : 'hidden'}
          whileInView={reduced ? undefined : 'visible'}
          viewport={VIEWPORT}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {/* The arcs. Season months carry the institution's champagne; the
              rest are set in olive at decreasing weight, so the year reads as
              one object with a bright quarter rather than two charts. */}
          {CHAPTERS.map((chapter) => {
            const { from, to } = arcOf(chapter);
            const lit = active === chapter.key;

            return (
              <motion.g
                key={chapter.key}
                variants={
                  reduced
                    ? undefined
                    : {
                        hidden: { opacity: 0, scale: 0.94 },
                        visible: {
                          opacity: 1,
                          scale: 1,
                          transition: { duration: DURATION.slow, ease: EASE.ceremonial },
                        },
                      }
                }
                style={{ transformOrigin: `${CENTRE}px ${CENTRE}px` }}
                onMouseEnter={() => setPointed(chapter.key)}
                onMouseLeave={() => setPointed(null)}
                className="cursor-default"
              >
                <motion.path
                  d={segmentPath(from, to)}
                  className={chapter.inSeason ? 'fill-champagne-deep' : 'fill-olive'}
                  // The season carries the institution's champagne and the rest
                  // is olive held back, so the year reads as one object with a
                  // bright quarter. Whichever chapter is pointed at comes
                  // forward; none is permanently louder than its neighbours.
                  animate={{ opacity: lit ? 1 : chapter.inSeason ? 0.85 : 0.32 }}
                  transition={{ duration: DURATION.base, ease: EASE.ceremonial }}
                />
                {/* The lit chapter gets an outer hairline rather than a colour
                    change: the ring must not flicker as the pointer crosses it. */}
                <motion.path
                  d={segmentPath(from, to, OUTER + 9, OUTER + 10)}
                  className="fill-ink"
                  animate={{ opacity: lit ? 1 : 0 }}
                  transition={{ duration: DURATION.quick, ease: EASE.ceremonial }}
                />
              </motion.g>
            );
          })}

          {/* Month initials, set outside the ring. */}
          {MONTH_INITIAL.map((initial, index) => {
            const point = polar(OUTER + 24, index * 30 + 15);
            const isToday = index === palmaIndex(today);
            return (
              <text
                key={`${initial}-${index}`}
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="central"
                className={cn(
                  'text-[13px] tracking-[0.14em]',
                  isToday ? 'fill-ink font-semibold' : 'fill-taupe-deep',
                )}
              >
                {initial}
              </text>
            );
          })}

          {/* Today. A hand rather than a dot, a dial should point. */}
          {reduced ? (
            <line
              x1={polar(INNER - 16, todayAngle).x}
              y1={polar(INNER - 16, todayAngle).y}
              x2={polar(OUTER - 8, todayAngle).x}
              y2={polar(OUTER - 8, todayAngle).y}
              className="stroke-ink"
              strokeWidth={2}
            />
          ) : (
            <motion.g
              initial={{ rotate: -140, opacity: 0 }}
              whileInView={{ rotate: 0, opacity: 1 }}
              viewport={VIEWPORT}
              transition={{ duration: DURATION.rite, ease: EASE.ceremonial, delay: 0.35 }}
              style={{ transformOrigin: `${CENTRE}px ${CENTRE}px` }}
            >
              <line
                x1={polar(INNER - 16, todayAngle).x}
                y1={polar(INNER - 16, todayAngle).y}
                x2={polar(OUTER - 8, todayAngle).x}
                y2={polar(OUTER - 8, todayAngle).y}
                className="stroke-ink"
                strokeWidth={2}
              />
              <circle
                cx={polar(OUTER - 8, todayAngle).x}
                cy={polar(OUTER - 8, todayAngle).y}
                r={3.5}
                className="fill-ink"
              />
            </motion.g>
          )}

          {/* The centre. Whatever chapter is lit, named where the eye already is. */}
          <text
            x={CENTRE}
            y={CENTRE - 14}
            textAnchor="middle"
            className="fill-taupe-deep text-[11px] tracking-[0.2em] uppercase"
          >
            {chapterFor(active).months}
          </text>
          <text
            x={CENTRE}
            y={CENTRE + 16}
            textAnchor="middle"
            className="fill-ink font-display text-[26px]"
          >
            {chapterFor(active).label}
          </text>
          <text
            x={CENTRE}
            y={CENTRE + 42}
            textAnchor="middle"
            className="fill-taupe-deep text-[11px] tracking-[0.16em] uppercase"
          >
            {chapterFor(active).inSeason ? 'In season' : 'Off season'}
          </text>
        </motion.svg>
      </div>

      {/* The same seven chapters as prose. The dial makes the shape legible;
          this says what actually happens in each one. */}
      <ol className="flex flex-col lg:col-span-7">
        {PALMA_YEAR.map((chapter, index) => {
          const lit = active === chapter.key;
          const isNow = currentChapter === chapter.key;

          return (
            <motion.li
              key={chapter.key}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT}
              transition={{
                duration: DURATION.slow,
                ease: EASE.ceremonial,
                delay: index * 0.05,
              }}
              onMouseEnter={() => setPointed(chapter.key)}
              onMouseLeave={() => setPointed(null)}
              onFocus={() => setPointed(chapter.key)}
              onBlur={() => setPointed(null)}
              tabIndex={0}
              className={cn(
                'border-stone-deep relative border-b py-5 pl-6 transition-colors outline-none last:border-none',
                'focus-visible:bg-stone/40',
                lit && 'bg-stone/30',
              )}
            >
              {/* The marker draws down the leading edge when the chapter is
                  pointed at, which is what ties the row to the arc. */}
              <motion.span
                aria-hidden="true"
                className={cn(
                  'absolute top-0 bottom-0 left-0 w-0.5 origin-top',
                  chapter.inSeason ? 'bg-champagne-deep' : 'bg-olive',
                )}
                animate={{ scaleY: lit ? 1 : 0 }}
                initial={false}
                transition={{ duration: DURATION.base, ease: EASE.ceremonial }}
              />

              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="palma-label text-taupe-deep">{chapter.months}</span>
                <span className="font-display text-xl leading-tight">{chapter.label}</span>
                {isNow ? (
                  <span className="palma-label text-champagne-deep border-champagne-deep border px-2 py-0.5">
                    Now
                  </span>
                ) : null}
                {chapter.inSeason ? (
                  <span className="palma-label text-taupe">In season</span>
                ) : null}
              </div>

              <p className="text-taupe-deep mt-2 text-[0.9375rem] leading-relaxed">
                {chapter.line}
              </p>

              {/* The detail is always in the DOM, it is the substance of the
                  page, not a reward for hovering, and simply lifts into full
                  contrast when the chapter is pointed at. */}
              <motion.p
                className="text-taupe-deep mt-2 max-w-140 text-sm leading-relaxed"
                animate={{ opacity: lit ? 1 : 0.82 }}
                initial={false}
                transition={{ duration: DURATION.base, ease: EASE.ceremonial }}
              >
                {chapter.detail}
              </motion.p>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

function chapterFor(key: ChapterKey): Chapter {
  return CHAPTERS.find((entry) => entry.key === key) ?? CHAPTERS[0]!;
}
