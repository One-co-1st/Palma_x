'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Charts.
 *
 * Built as inline SVG rather than pulled from a charting library, for the same
 * reason the rest of PALMA is: a dependency that ships 90kB and its own visual
 * opinions would fight the institution's typography and lose the point of it.
 *
 * Three rules, taken from the data-visualisation standard and not negotiable
 * per-chart:
 *
 *   — colour encodes identity, never rank, and never more than the validated
 *     series count. Beyond that, facet;
 *   — every chart with two or more series carries a legend *and* a table view,
 *     so identity is never colour alone;
 *   — one axis. Two measures of different scale are two charts.
 */

export type Series = { label: string; value: number };

const SERIES_COLOUR = ['var(--palma-chart-1)', 'var(--palma-chart-2)', 'var(--palma-chart-3)'];
const RAMP = [
  'var(--palma-ramp-4)',
  'var(--palma-ramp-3)',
  'var(--palma-ramp-2)',
  'var(--palma-ramp-1)',
];

function format(value: number): string {
  return new Intl.NumberFormat('en-GB').format(value);
}

/**
 * The frame every chart sits in: a title, an optional legend, and a toggle to
 * read the same figures as a table. The table is not a fallback — it is how
 * somebody checks a number they intend to quote.
 */
export function ChartFrame({
  title,
  note,
  legend,
  rows,
  columns = ['', 'Value'],
  children,
  className,
}: {
  title: string;
  note?: string;
  legend?: { label: string; colour: string }[];
  /** The same numbers, for the table view. */
  rows: (string | number)[][];
  columns?: string[];
  children: React.ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = React.useState(false);
  const id = React.useId();

  return (
    <figure className={cn('border-stone-deep flex min-w-0 flex-col border p-6', className)}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="palma-label text-taupe-deep">{title}</h3>
        <button
          type="button"
          onClick={() => setAsTable((current) => !current)}
          aria-expanded={asTable}
          aria-controls={id}
          className="palma-label text-taupe hover:text-ink transition-colors"
        >
          {asTable ? 'Chart' : 'Table'}
        </button>
      </figcaption>

      {note ? <p className="text-taupe mt-2 text-xs leading-relaxed">{note}</p> : null}

      {legend && legend.length > 1 ? (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {legend.map((entry) => (
            <li key={entry.label} className="text-taupe-deep flex items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className="inline-block size-2.5 rounded-full"
                style={{ background: entry.colour }}
              />
              {entry.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div id={id} className="mt-5 min-w-0">
        {asTable ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-stone-deep border-b">
                <tr>
                  {columns.map((column) => (
                    <th key={column} scope="col" className="palma-label text-taupe-deep py-2 pr-4">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-stone-deep/50 border-b last:border-none">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={cn('text-ink/85 py-2 pr-4', cellIndex > 0 && 'tabular-nums')}
                      >
                        {typeof cell === 'number' ? format(cell) : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </figure>
  );
}

/**
 * Horizontal bars.
 *
 * Horizontal because the labels are words — category names, countries — and a
 * vertical bar chart turns those into rotated text nobody reads. One hue,
 * because the bar length already encodes the value: spending the identity
 * channel on re-encoding it would say nothing.
 */
export function BarSeries({
  data,
  colour = 'var(--palma-chart-1)',
  max,
}: {
  data: Series[];
  colour?: string;
  max?: number;
}) {
  const ceiling = max ?? Math.max(1, ...data.map((entry) => entry.value));

  return (
    <ul className="flex flex-col gap-3">
      {data.map((entry) => {
        const width = Math.max(entry.value > 0 ? 1.5 : 0, (entry.value / ceiling) * 100);

        return (
          <li key={entry.label} className="group/bar flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-taupe-deep min-w-0 truncate text-sm">{entry.label}</span>
              <span className="text-ink shrink-0 text-sm tabular-nums">{format(entry.value)}</span>
            </div>
            <div className="bg-stone/50 h-2 w-full">
              <div
                className="h-2 rounded-r-[2px] transition-[width] duration-500 ease-(--ease-ceremonial)"
                style={{ width: `${width}%`, background: colour }}
                role="presentation"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Two series over time, drawn as lines with a shared crosshair.
 *
 * One axis, always: if a second measure does not share this scale it gets its
 * own chart rather than a second y-axis.
 */
export function TimeSeries({
  points,
  series,
  height = 180,
}: {
  /** Ordered oldest first. */
  points: { label: string; values: number[] }[];
  series: string[];
  height?: number;
}) {
  const [active, setActive] = React.useState<number | null>(null);

  if (points.length === 0) {
    return <p className="text-taupe py-8 text-center text-sm">No activity in this period.</p>;
  }

  const width = 640;
  const padding = { top: 12, right: 12, bottom: 24, left: 12 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const ceiling = Math.max(1, ...points.flatMap((point) => point.values));
  const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  const x = (index: number) => padding.left + index * step;
  const y = (value: number) => padding.top + plotHeight - (value / ceiling) * plotHeight;

  return (
    <div className="min-w-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${series.join(' and ')} over ${points.length} periods`}
        onMouseLeave={() => setActive(null)}
      >
        {/* Recessive grid: three lines, no labels competing with the data. */}
        {[0, 0.5, 1].map((fraction) => (
          <line
            key={fraction}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + plotHeight * fraction}
            y2={padding.top + plotHeight * fraction}
            stroke="var(--palma-grid)"
            strokeWidth={1}
          />
        ))}

        {series.map((name, seriesIndex) => {
          const path = points
            .map(
              (point, index) =>
                `${index === 0 ? 'M' : 'L'}${x(index)},${y(point.values[seriesIndex] ?? 0)}`,
            )
            .join(' ');

          return (
            <path
              key={name}
              d={path}
              fill="none"
              stroke={SERIES_COLOUR[seriesIndex] ?? SERIES_COLOUR[0]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {active !== null ? (
          <>
            <line
              x1={x(active)}
              x2={x(active)}
              y1={padding.top}
              y2={padding.top + plotHeight}
              stroke="var(--palma-axis)"
              strokeWidth={1}
            />
            {series.map((name, seriesIndex) => (
              <circle
                key={name}
                cx={x(active)}
                cy={y(points[active]?.values[seriesIndex] ?? 0)}
                r={4}
                fill={SERIES_COLOUR[seriesIndex] ?? SERIES_COLOUR[0]}
                stroke="var(--color-ivory)"
                strokeWidth={2}
              />
            ))}
          </>
        ) : null}

        {/* Hit targets wider than the marks. */}
        {points.map((point, index) => (
          <rect
            key={point.label}
            x={x(index) - step / 2}
            y={0}
            width={Math.max(step, 8)}
            height={height}
            fill="transparent"
            onMouseEnter={() => setActive(index)}
          />
        ))}
      </svg>

      <div className="text-taupe mt-1 flex items-baseline justify-between text-xs">
        <span>{points[0]?.label}</span>
        {active !== null ? (
          <span className="text-ink">
            {points[active]?.label} ·{' '}
            {series
              .map((name, index) => `${name} ${format(points[active]?.values[index] ?? 0)}`)
              .join(' · ')}
          </span>
        ) : null}
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/**
 * A funnel. Ordinal, so it takes one hue in monotone steps — the reader should
 * see the order in the colour, not have to infer it from position.
 */
export function Funnel({ stages }: { stages: { label: string; value: number }[] }) {
  const ceiling = Math.max(1, ...stages.map((stage) => stage.value));

  return (
    <ol className="flex flex-col gap-3">
      {stages.map((stage, index) => {
        const width = Math.max(stage.value > 0 ? 2 : 0, (stage.value / ceiling) * 100);
        const previous = stages[index - 1]?.value;
        const rate =
          previous && previous > 0 ? `${Math.round((stage.value / previous) * 100)}%` : null;

        return (
          <li key={stage.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-taupe-deep text-sm">{stage.label}</span>
              <span className="flex shrink-0 items-baseline gap-3">
                {rate ? <span className="text-taupe text-xs tabular-nums">{rate}</span> : null}
                <span className="text-ink text-sm tabular-nums">{format(stage.value)}</span>
              </span>
            </div>
            <div className="bg-stone/50 h-2.5 w-full">
              <div
                className="h-2.5 rounded-r-[2px]"
                style={{ width: `${width}%`, background: RAMP[index % RAMP.length] }}
                role="presentation"
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * A composition bar: two or three parts of one whole, in one row.
 * Segments are separated by a 2px surface gap so adjacent fills never merge.
 */
export function Composition({ parts }: { parts: { label: string; value: number }[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);

  if (total === 0) {
    return <p className="text-taupe py-6 text-center text-sm">Nothing recorded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-3 w-full gap-0.5">
        {parts.map((part, index) => (
          <span
            key={part.label}
            className="h-3 first:rounded-l-[2px] last:rounded-r-[2px]"
            style={{
              width: `${(part.value / total) * 100}%`,
              background: SERIES_COLOUR[index] ?? 'var(--palma-ramp-2)',
            }}
            role="presentation"
          />
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {parts.map((part, index) => (
          <li key={part.label} className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-taupe-deep flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ background: SERIES_COLOUR[index] ?? 'var(--palma-ramp-2)' }}
              />
              <span className="truncate">{part.label}</span>
            </span>
            <span className="text-ink shrink-0 tabular-nums">
              {format(part.value)}
              <span className="text-taupe ml-2 text-xs">
                {Math.round((part.value / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const CHART_COLOURS = SERIES_COLOUR;
