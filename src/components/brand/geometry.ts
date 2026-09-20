/**
 * The PALMA mark, as geometry.
 *
 * One palm, drawn once. Everything that renders the mark reads these paths:
 * the site mark, the seal, the favicon, the home-screen icon, the social card.
 *
 * This file exists because they did not. The mark had drifted into four
 * different palms — eight fronds on the site, four in the favicon, six on the
 * seal and six more on the Apple icon, each with its own spine length and
 * crown position. Nobody had changed the logo; it had simply been redrawn by
 * hand each time it was needed, and no two hands drew it the same. An
 * institution whose whole product is a mark people are supposed to recognise
 * cannot have four of them.
 *
 * Drawn in a 48 × 56 box, spine on the centreline at x = 24. Anything needing
 * another origin translates rather than redraws: the seal is this palm moved
 * to its own centre, not a second palm that resembles it.
 */

/** The viewBox every rendering of the mark is drawn against. */
export const MARK_VIEWBOX = '0 0 48 56';
export const MARK_WIDTH = 48;
export const MARK_HEIGHT = 56;

/**
 * The strokes, crown last.
 *
 * A spine, then four pairs of fronds sweeping upward and outward — longest at
 * the crown, tightening as they descend. The fronds are open strokes rather
 * than closed leaf shapes, which is what keeps the mark reading as an engraving
 * at sixteen pixels instead of collapsing into a blob.
 */
export const MARK_PATHS = [
  // Spine
  'M24 53V9',
  // Fronds
  'M24 13C18.2 9.8 12.6 9.4 7.2 11.8',
  'M24 13c5.8-3.2 11.4-3.6 16.8-1.2',
  'M24 21.5C18.8 17.6 13.5 16.3 8.2 17.6',
  'M24 21.5c5.2-3.9 10.5-5.2 15.8-3.9',
  'M24 30.5c-4.6-4.2-9.3-6-14-5.4',
  'M24 30.5c4.6-4.2 9.3-6 14-5.4',
  'M24 39.5c-3.9-4.2-7.9-6.3-11.9-6.2',
  'M24 39.5c3.9-4.2 7.9-6.3 11.9-6.2',
] as const;

/** The crown: a struck dot above the spine, not a frond. */
export const MARK_CROWN = { cx: 24, cy: 5.4, r: 2.1 } as const;

/** Centre of the mark, for anything that needs to translate it. */
export const MARK_CENTRE = { x: MARK_WIDTH / 2, y: MARK_HEIGHT / 2 } as const;

/** The institution's colours, for the contexts that cannot read CSS: a
 * generated image, an email letterhead, an SVG written to disk. The CSS tokens
 * in `globals.css` carry the same values for everything that can. */
export const INK = '#161719';
export const CHAMPAGNE = '#C9B58A';
export const IVORY = '#F4F0E8';

/**
 * The mark as a raw SVG string.
 *
 * For the places React cannot reach: the favicon route, a generated image, an
 * email letterhead. Takes the stroke colour and weight because those are the
 * only two things that legitimately change between renderings.
 */
export function markSvgPaths(stroke: string, strokeWidth: number): string {
  const paths = MARK_PATHS.map((d) => `<path d="${d}"/>`).join('');
  const crown = `<circle cx="${MARK_CROWN.cx}" cy="${MARK_CROWN.cy}" r="${MARK_CROWN.r}"/>`;
  return `<g stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" fill="none">${paths}${crown}</g>`;
}

/** The complete mark as a standalone SVG document. */
export function markSvg({
  size = MARK_HEIGHT,
  stroke = CHAMPAGNE,
  background,
  strokeWidth = 1.3,
}: {
  size?: number;
  stroke?: string;
  background?: string;
  strokeWidth?: number;
} = {}): string {
  const width = Math.round((size * MARK_WIDTH) / MARK_HEIGHT);
  const ground = background
    ? `<rect width="${MARK_WIDTH}" height="${MARK_HEIGHT}" fill="${background}"/>`
    : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" width="${width}" height="${size}">`,
    ground,
    markSvgPaths(stroke, strokeWidth),
    '</svg>',
  ].join('');
}
