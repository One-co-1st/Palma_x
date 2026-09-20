import { cn } from '@/lib/utils';
import { MARK_CENTRE, MARK_CROWN, MARK_PATHS } from './geometry';

type PalmaSealProps = {
  className?: string;
  /** Rendered around the seal's upper arc, e.g. "PALMA 2027". */
  legend?: string;
  /** Rendered around the lower arc. */
  sublegend?: string;
  /** Set at the centre beneath the mark, e.g. "WINNER". */
  centre?: string;
  animated?: boolean;
};

/**
 * The institutional seal. Used on winner pages, certificates, badges,
 * verification and share cards — the one place the ceremonial register is
 * allowed to be explicit.
 */
export function PalmaSeal({
  className,
  legend = 'PALMA',
  sublegend = 'THE CREATOR HONOURS',
  centre,
  animated = false,
}: PalmaSealProps) {
  return (
    <svg
      viewBox="0 0 220 220"
      className={cn(
        'palma-seal-live h-40 w-40',
        animated && 'motion-safe:animate-(--animate-seal)',
        className,
      )}
      role="img"
      aria-label={[legend, sublegend, centre].filter(Boolean).join(', ')}
    >
      <defs>
        <path id="palma-seal-upper" d="M110 110 m-84 0 a84 84 0 0 1 168 0" fill="none" />
        {/* The lower arc sweeps left to right beneath the centre, so the
            sublegend reads upright rather than inverted. */}
        <path id="palma-seal-lower" d="M26 110 A84 84 0 0 0 194 110" fill="none" />
      </defs>

      <circle
        cx="110"
        cy="110"
        r="105"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.55"
      />
      <circle
        cx="110"
        cy="110"
        r="97"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.35"
      />
      <circle
        cx="110"
        cy="110"
        r="70"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.25"
      />

      <text
        fill="currentColor"
        fontSize="12"
        letterSpacing="6"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <textPath href="#palma-seal-upper" startOffset="50%" textAnchor="middle">
          {legend}
        </textPath>
      </text>

      <text fill="currentColor" fontSize="8.5" letterSpacing="4.4" opacity="0.8" dy="-7">
        <textPath href="#palma-seal-lower" startOffset="50%" textAnchor="middle">
          {sublegend}
        </textPath>
      </text>

      {/* The same palm as the site mark, moved to the seal's centre rather
          than redrawn at a smaller number of fronds. */}
      <g
        transform={`translate(110 104) scale(1.5) translate(${-MARK_CENTRE.x} ${-MARK_CENTRE.y})`}
        stroke="currentColor"
        strokeWidth="0.62"
        strokeLinecap="round"
        fill="none"
      >
        {MARK_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
        <circle cx={MARK_CROWN.cx} cy={MARK_CROWN.cy} r={MARK_CROWN.r} />
      </g>

      {centre ? (
        <text
          x="110"
          y="152"
          textAnchor="middle"
          fill="currentColor"
          fontSize="10"
          letterSpacing="3.4"
          style={{ fontFamily: 'var(--font-sans)', textTransform: 'uppercase' }}
        >
          {centre}
        </text>
      ) : null}
    </svg>
  );
}
