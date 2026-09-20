import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { CHAMPAGNE, engraving, INK, RULE, seal, TAUPE } from './shapes.mjs';

const DIR = new URL('.', import.meta.url).pathname;

/**
 * THE PALMA, at size, with the decisions called out.
 *
 * Same `seal()` the elevation sheet uses. Two sheets drawing one object from
 * two copies of the code is how they end up disagreeing about what the object
 * is, which this project has already done once with its own logo.
 */

const W = 1680;
const H = 1180;
const SPEC = { outer: 340, band: 30, palmScale: 0.86, standWidth: 128, crown: true };
const S = 2.0;
const R = SPEC.outer / 2;
const CX = 760;
const GROUND = 980;
const drop = Math.sqrt(R * R - (SPEC.standWidth / 2) ** 2);
const TOP = GROUND - (R + drop) * S;

function callout({ x1, y1, x2, y2, title, lines, anchor = 'start' }) {
  const tx = anchor === 'end' ? x2 - 12 : x2 + 12;
  return `
    <circle cx="${x1}" cy="${y1}" r="3" fill="${CHAMPAGNE}"/>
    <path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${CHAMPAGNE}" stroke-width="0.9" opacity="0.5" fill="none"/>
    <text x="${tx}" y="${y2 - 4}" fill="${CHAMPAGNE}" font-size="13" text-anchor="${anchor}" font-family="Georgia, serif" letter-spacing="2.6">${title}</text>
    ${lines.map((l, i) => `<text x="${tx}" y="${y2 + 15 + i * 16}" fill="${TAUPE}" font-size="12" text-anchor="${anchor}" font-family="Georgia, serif">${l}</text>`).join('')}
  `;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="pool" cx="50%" cy="46%" r="52%">
      <stop offset="0%" stop-color="${CHAMPAGNE}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${CHAMPAGNE}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${INK}"/>
  <ellipse cx="${CX}" cy="520" rx="600" ry="460" fill="url(#pool)"/>
  <rect x="38" y="38" width="${W - 76}" height="${H - 76}" fill="none" stroke="${RULE}" stroke-width="1"/>

  <text x="74" y="106" fill="${CHAMPAGNE}" font-size="31" font-family="Georgia, serif" letter-spacing="10">THE PALMA</text>
  <text x="74" y="133" fill="${TAUPE}" font-size="11.5" font-family="Georgia, serif" letter-spacing="4.5">THE HIGHEST HONOUR · ONE A YEAR · Ø340 × 12 mm · 4.2 kg</text>
  <line x1="74" y1="156" x2="${W - 74}" y2="156" stroke="${RULE}" stroke-width="1"/>

  <line x1="330" y1="${GROUND}" x2="1180" y2="${GROUND}" stroke="${RULE}" stroke-width="1.4"/>

  <g transform="translate(${CX - R * S} ${TOP}) scale(${S})">
    ${seal(SPEC)}
    ${engraving({ outer: SPEC.outer, band: SPEC.band, text: 'THE PALMA · 2027 · AMA OKONKWO', size: 11 })}
  </g>

  ${callout({
    x1: CX,
    y1: TOP + 4,
    x2: 1180,
    y2: 250,
    title: 'THE BAND',
    lines: [
      '30 mm wide, 12 mm thick. A circle is as',
      'abstract as a silhouette gets, and the palm',
      'inside reads as an emblem because it is',
      'framed. Nothing grows in a ring.',
    ],
  })}

  ${callout({
    x1: CX + 2,
    y1: TOP + (R - (R - SPEC.band) * 0.86 * 0.97) * S,
    x2: 1180,
    y2: 430,
    title: 'THE CROWN',
    lines: [
      'A 16 mm sphere on a tapered needle, clear',
      'of the spine. Only THE PALMA carries it;',
      'the category seal ends where this begins.',
    ],
  })}

  ${callout({
    x1: CX - R * S * 0.55,
    y1: GROUND - 210,
    x2: 392,
    y2: 470,
    anchor: 'end',
    title: 'ONE JOINT, CAST',
    lines: [
      'The spine runs down into the band and merges',
      'with it. Nothing is fixed, pinned or glued, and',
      'inside a frame the spine reads as a mounting',
      'stem rather than as something rooted.',
    ],
  })}

  ${callout({
    x1: CX - R * S * 0.62,
    y1: GROUND - 84,
    x2: 392,
    y2: 720,
    anchor: 'end',
    title: 'NO BASE. NO PLINTH.',
    lines: [
      'A 128 mm flat is machined across the bottom',
      'of the band and the object stands on it. One',
      'casting, floor to top: nothing to come loose,',
      'nothing to lose, nothing to design twice.',
    ],
  })}

  ${callout({
    x1: CX,
    y1: GROUND - 26,
    x2: 1180,
    y2: 700,
    title: 'THE NAME, IN THE BAND',
    lines: [
      'Cut into the bronze itself and oxide-filled.',
      'No plate, nothing screwed on, nothing that',
      'can be prised off and nothing to wear loose.',
    ],
  })}

  ${callout({
    x1: CX + R * S * 0.72,
    y1: GROUND - 300,
    x2: 1180,
    y2: 900,
    title: 'ON THE REVERSE',
    lines: [
      'PM-2027-XXXXXX and the verify URL, struck',
      'into the back of the band. It is proof, not',
      'decoration: it should be found by turning',
      'the thing over.',
    ],
  })}

  <text x="74" y="${H - 74}" fill="${TAUPE}" font-size="12" font-family="Georgia, serif">Sand-cast silicon bronze. Faces bead-blasted dark, the inner and outer arrises polished bright, waxed not lacquered so it darkens with handling.</text>
  <text x="${W - 74}" y="${H - 74}" fill="${TAUPE}" font-size="11" text-anchor="end" font-family="ui-monospace, Menlo, monospace" letter-spacing="1">MILLIMETRES</text>
</svg>`;

writeFileSync(`${DIR}/the-palma-detail.svg`, svg);
await sharp(Buffer.from(svg), { density: 200 }).png().toFile(`${DIR}/the-palma-detail.png`);
console.log('detail ok');
