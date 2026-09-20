import { ImageResponse } from 'next/og';
import { CHAMPAGNE, INK, MARK_CROWN, MARK_PATHS, MARK_VIEWBOX } from '@/components/brand/geometry';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * The PALMA mark on ink, for a home-screen shortcut.
 *
 * The same palm as everywhere else. It used to be its own six-frond drawing.
 */
export default function AppleIcon() {
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
      <svg width="104" height="122" viewBox={MARK_VIEWBOX} fill="none">
        <g stroke={CHAMPAGNE} strokeWidth={1.9} strokeLinecap="round" fill="none">
          {MARK_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
          <circle cx={MARK_CROWN.cx} cy={MARK_CROWN.cy} r={MARK_CROWN.r} />
        </g>
      </svg>
    </div>,
    size,
  );
}
