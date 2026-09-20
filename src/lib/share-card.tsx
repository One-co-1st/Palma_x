import { ImageResponse } from 'next/og';

export const SHARE_CARD_SIZE = { width: 1200, height: 630 };

// Read from the mark's own geometry rather than restated. A share card that
// drifted a shade off the site would be the one version of PALMA most people
// see, because it is the version that travels.
import { CHAMPAGNE, INK, IVORY } from '@/components/brand/geometry';

/**
 * PALMA share cards.
 *
 * Generated from the record itself, so a card cannot misstate an honour: the
 * name, category and season come from the same row the verification page reads.
 */
export function renderShareCard({
  eyebrow,
  name,
  line,
  footer,
}: {
  eyebrow: string;
  name: string;
  line?: string;
  footer?: string;
}) {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: INK,
        color: IVORY,
        padding: '72px 80px',
        position: 'relative',
      }}
    >
      {/* Engraved palm, top right */}
      <svg
        width="420"
        height="520"
        viewBox="0 0 200 260"
        style={{ position: 'absolute', top: -60, right: -60, opacity: 0.07 }}
      >
        <g stroke={IVORY} strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M100 250V40" />
          <path d="M100 58C74 44 48 42 24 53" />
          <path d="M100 58c26-14 52-16 76-5" />
          <path d="M100 100C77 82 53 76 29 82" />
          <path d="M100 100c23-18 47-24 71-18" />
          <path d="M100 142c-21-19-42-28-63-26" />
          <path d="M100 142c21-19 42-28 63-26" />
          <path d="M100 184c-18-19-36-29-54-29" />
          <path d="M100 184c18-19 36-29 54-29" />
        </g>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 30, letterSpacing: 14, fontWeight: 600 }}>PALMA</div>
        <div
          style={{ fontSize: 17, letterSpacing: 5, color: CHAMPAGNE, textTransform: 'uppercase' }}
        >
          {eyebrow}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 940 }}>
        <div style={{ fontSize: name.length > 24 ? 78 : 104, lineHeight: 1, letterSpacing: -2 }}>
          {name}
        </div>
        {line ? (
          <div style={{ fontSize: 30, color: 'rgba(244,240,232,0.72)', letterSpacing: -0.4 }}>
            {line}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: '1px solid rgba(244,240,232,0.2)',
          paddingTop: 26,
        }}
      >
        <div style={{ fontSize: 17, letterSpacing: 5, color: 'rgba(244,240,232,0.6)' }}>
          THE CREATOR HONOURS
        </div>
        {footer ? (
          <div style={{ fontSize: 17, letterSpacing: 3, color: CHAMPAGNE }}>{footer}</div>
        ) : null}
      </div>
    </div>,
    SHARE_CARD_SIZE,
  );
}
