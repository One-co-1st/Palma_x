import { CROWN, FRONDS, SPINE } from './geometry.mjs';

/**
 * The palette and the object, shared by both sheets.
 *
 * Two sheets drawing the same trophy from two copies of the same code is how
 * they end up disagreeing about what the trophy is, which is the mistake this
 * project already made once with the logo.
 */

export const INK = '#141517';
export const VOID_ = '#0B0C0D';
export const CHAMPAGNE = '#C9B58A';
export const CHAMPAGNE_HI = '#EFE4C9';
export const BRONZE_DARK = '#4C4130';
export const BRONZE_MID = '#6E5F45';
export const BRONZE_EDGE = '#8A7757';
export const TAUPE = '#8C8478';
export const RULE = '#2E3136';

// The mark's own extents, in its 48 x 56 drawing box.
const MARK_TOP = CROWN.cy - CROWN.r;
const MARK_BOTTOM = 53;

/**
 * The seal.
 *
 * A standing bronze ring with the palm held inside it.
 *
 * The silhouette is a circle, which is as abstract as a form gets, and the
 * palm inside reads as an emblem rather than a plant because it is *framed*.
 * Nothing grows in a ring. The spine is cut short below the lowest fronds too,
 * so there is no stalk and nothing is rooted: what is left is four chevron
 * pairs, a short axis and the crown.
 *
 * A seal is also the object PALMA already talks in. Every honour carries a
 * signed verification record; the trophy is that seal at 340 mm.
 *
 * **There is no base, and there is no plinth.** A flat is machined across the
 * bottom of the ring and the object stands on it. One casting, floor to top,
 * nothing to come loose and nothing to lose.
 *
 * The first attempt at abstraction was a tapered slab with an arched top,
 * which is a headstone. This is the correction.
 */
export function seal({ outer, band, palmScale, crown, standWidth }) {
  const R = outer / 2;
  const r = R - band;
  const cx = R;
  const cy = R;

  // The flat it stands on: a chord across the bottom of the ring.
  const halfStand = standWidth / 2;
  const drop = Math.sqrt(R * R - halfStand * halfStand);

  const ringOuter =
    `M ${cx - halfStand} ${cy + drop}` + ` A ${R} ${R} 0 1 1 ${cx + halfStand} ${cy + drop}` + ` Z`;

  // Map the mark into the opening, hung from the bottom of the inner circle.
  const k = (r * 2 * palmScale) / (MARK_BOTTOM - MARK_TOP);
  const baseY = cy + r - 2;
  const toRing = `translate(${cx} ${baseY}) scale(${k}) translate(-24 -${MARK_BOTTOM})`;

  /** A rod of solid bronze, lit along its upper edge. */
  const rod = (d, { base, tip, from = 0 }) => {
    const out = [];
    const steps = 28;
    const draw = (colour, w, dx, dy) => {
      for (let i = 0; i < steps; i += 1) {
        const t = i / (steps - 1);
        const width = w.tip + (w.base - w.tip) * t;
        const len = 100 - t * 100;
        if (len < from) continue;
        const dash = `${(len - from).toFixed(2)} 100`;
        out.push(
          `<path d="${d}" pathLength="100" stroke-dasharray="${dash}" stroke-dashoffset="${-from}"` +
            ` stroke="${colour}" stroke-width="${width.toFixed(3)}"` +
            (dx || dy ? ` transform="translate(${dx} ${dy})"` : '') +
            `/>`,
        );
      }
    };
    draw(BRONZE_DARK, { base: base * 1.12, tip: tip * 1.2 }, 0, 0.3);
    draw(BRONZE_EDGE, { base, tip }, 0, 0);
    draw(CHAMPAGNE, { base: base * 0.28, tip: tip * 0.3 }, 0, -0.3);
    return out.join('');
  };

  // The spine runs to the bottom of the opening and merges into the band. That
  // is the only joint in the object, it is cast rather than fixed, and inside a
  // frame it reads as a mounting stem rather than as something rooted.
  const parts = [
    rod(SPINE, { base: 3.1, tip: 0.7 }),
    ...FRONDS.flatMap(([a, b]) => [
      rod(a, { base: 1.7, tip: 0.18 }),
      rod(b, { base: 1.7, tip: 0.18 }),
    ]),
  ];

  if (crown) {
    parts.push(
      `<circle cx="${CROWN.cx}" cy="${CROWN.cy}" r="${CROWN.r}" fill="${BRONZE_DARK}"/>`,
      `<circle cx="${CROWN.cx - 0.16}" cy="${CROWN.cy - 0.18}" r="${CROWN.r * 0.86}" fill="${BRONZE_EDGE}"/>`,
      `<circle cx="${CROWN.cx - 0.58}" cy="${CROWN.cy - 0.66}" r="${CROWN.r * 0.32}" fill="${CHAMPAGNE_HI}"/>`,
    );
  }

  return `
    <path d="${ringOuter}" fill="${BRONZE_MID}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${VOID_}"/>
    <path d="${ringOuter}" fill="none" stroke="${BRONZE_EDGE}" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${BRONZE_DARK}" stroke-width="2"/>
    <path d="M ${cx - R * 0.72} ${cy - R * 0.68} A ${R} ${R} 0 0 1 ${cx + R * 0.34} ${cy - R * 0.94}"
      fill="none" stroke="${CHAMPAGNE}" stroke-width="3.2" opacity="0.8" stroke-linecap="round"/>
    <path d="M ${cx - r * 0.6} ${cy - r * 0.78} A ${r} ${r} 0 0 1 ${cx + r * 0.3} ${cy - r * 0.96}"
      fill="none" stroke="${CHAMPAGNE}" stroke-width="1.6" opacity="0.5" stroke-linecap="round"/>
    <path d="M ${cx - k * 5.4} ${cy + r + 1} Q ${cx} ${cy + r - k * 4.4} ${cx + k * 5.4} ${cy + r + 1} Z" fill="${BRONZE_EDGE}"/>
    <g transform="${toRing}" fill="none" stroke-linecap="round">${parts.join('')}</g>
  `;
}

/**
 * The name, cut into the band itself. No plate, nothing screwed on.
 *
 * Each character is placed and rotated on the arc by hand rather than run
 * along a `textPath`, because the renderer this sheet is produced with drops
 * `textPath` silently: the band came out blank twice before anybody noticed
 * the text was simply not there.
 */
export function engraving({ outer, band, text, size }) {
  const R = outer / 2;
  const radius = R - band / 2;
  const chars = [...text];
  // Spread across the bottom of the band, centred on six o'clock.
  const spread = Math.min(150, chars.length * (size * 0.95));
  const step = spread / Math.max(1, chars.length - 1);
  const start = 90 + spread / 2;

  return chars
    .map((ch, i) => {
      const a = start - i * step;
      const rad = (a * Math.PI) / 180;
      const x = R + radius * Math.cos(rad);
      const y = R + radius * Math.sin(rad);
      return (
        `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" fill="${CHAMPAGNE}" opacity="0.92"` +
        ` font-size="${size}" font-family="Georgia, serif" text-anchor="middle"` +
        ` dominant-baseline="central"` +
        ` transform="rotate(${(a - 90).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})">${ch === ' ' ? '' : ch}</text>`
      );
    })
    .join('');
}
