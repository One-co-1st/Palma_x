import { ImageResponse } from 'next/og';
import { CHAMPAGNE, INK, MARK_CROWN, MARK_PATHS, MARK_VIEWBOX } from '@/components/brand/geometry';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/**
 * The favicon.
 *
 * The institution's own mark, not a redrawing of it. It was a separate,
 * hand-simplified palm with four fronds and a different spine, which meant the
 * thing in a reader's tab was not the thing on the page it pointed at.
 *
 * Squared off, since a tab is square and a 48 by 56 mark letterboxed in one is
 * smaller than it needs to be. The stroke is heavier than the site mark for the
 * same reason a printed stamp is: at sixteen pixels a hairline disappears.
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: INK,
      }}
    >
      <svg width="54" height="63" viewBox={MARK_VIEWBOX} fill="none">
        <g stroke={CHAMPAGNE} strokeWidth={2.6} strokeLinecap="round" fill="none">
          {MARK_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
          <circle cx={MARK_CROWN.cx} cy={MARK_CROWN.cy} r={MARK_CROWN.r} />
        </g>
      </svg>
    </div>,
    { ...size },
  );
}
