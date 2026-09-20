import { cn } from '@/lib/utils';
import { MARK_CROWN, MARK_PATHS, MARK_VIEWBOX } from './geometry';

type PalmMarkProps = {
  className?: string;
  /** `line` for engraved outlines, `solid` for a compact app/badge mark. */
  variant?: 'line' | 'solid';
  title?: string;
  /**
   * Draw the mark on, stroke by stroke, as though it were being engraved.
   *
   * Sets `pathLength` to 100 on every stroke so one CSS rule can dash all of
   * them regardless of their real length, and marks the crown so it can be
   * struck last. The animation itself lives in `globals.css` under
   * `.palma-engrave`, guarded by `prefers-reduced-motion`.
   *
   * This exists so the one place that wants the effect does not have to inline
   * its own copy of the geometry to get a handle on the paths.
   */
  draw?: boolean;
};

/**
 * The PALMA mark.
 *
 * A palm reduced to an engraved spine and open fronds that sweep upward: the
 * geometry of victory and honour rather than a picture of a tree. The fronds
 * are single open strokes, never closed leaf shapes, so the mark reads as a
 * ceremonial engraving at any size.
 *
 * The paths live in `geometry.ts` and are shared with the favicon, the seal and
 * every generated image, so the mark cannot be redrawn by hand in one place and
 * quietly stop matching itself in the others.
 */
export function PalmMark({ className, variant = 'line', title, draw = false }: PalmMarkProps) {
  const decorative = !title;

  return (
    <svg
      viewBox={MARK_VIEWBOX}
      fill="none"
      className={cn('h-6 w-auto', draw && 'palma-engrave', className)}
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <g
        stroke="currentColor"
        strokeWidth={variant === 'solid' ? 2.4 : 1.3}
        strokeLinecap="round"
        fill="none"
      >
        {MARK_PATHS.map((d) => (
          <path key={d} d={d} pathLength={draw ? 100 : undefined} />
        ))}
        <circle cx={MARK_CROWN.cx} cy={MARK_CROWN.cy} r={MARK_CROWN.r} data-crown="" />
      </g>
    </svg>
  );
}
