import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { CHAMPAGNE, engraving, INK, RULE, seal, TAUPE } from './shapes.mjs';

const DIR = new URL('.', import.meta.url).pathname;

function dimV({ x, y1, y2, label }) {
  const mid = (y1 + y2) / 2;
  return `
    <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${TAUPE}" stroke-width="0.8" opacity="0.8"/>
    <line x1="${x - 5}" y1="${y1}" x2="${x + 5}" y2="${y1}" stroke="${TAUPE}" stroke-width="0.8"/>
    <line x1="${x - 5}" y1="${y2}" x2="${x + 5}" y2="${y2}" stroke="${TAUPE}" stroke-width="0.8"/>
    <text x="${x - 11}" y="${mid}" fill="${TAUPE}" font-size="12.5" text-anchor="end" dominant-baseline="middle"
      font-family="ui-monospace, Menlo, monospace" letter-spacing="1">${label}</text>
  `;
}

function label({ x, y, title, lines }) {
  return `
    <text x="${x}" y="${y}" fill="${CHAMPAGNE}" font-size="14" font-family="Georgia, serif" letter-spacing="3.4">${title}</text>
    <line x1="${x}" y1="${y + 11}" x2="${x + 210}" y2="${y + 11}" stroke="${RULE}" stroke-width="1"/>
    ${lines.map((l, i) => `<text x="${x}" y="${y + 33 + i * 17}" fill="${TAUPE}" font-size="12.5" font-family="Georgia, serif">${l}</text>`).join('')}
  `;
}

const W = 1680;
const H = 1120;
const S = 1.38;
const GROUND = 800;

const A = { outer: 340, band: 30, palmScale: 0.86, standWidth: 128, crown: true };
const B = { outer: 232, band: 22, palmScale: 0.86, standWidth: 92, crown: false };

function place(spec, cx, lines) {
  const R = spec.outer / 2;
  const drop = Math.sqrt(R * R - (spec.standWidth / 2) ** 2);
  const height = (R + drop) * S;
  const top = GROUND - height;
  return {
    top,
    height: R + drop,
    svg:
      `<g transform="translate(${cx - R * S} ${top}) scale(${S})">` +
      seal(spec) +
      engraving({ outer: spec.outer, band: spec.band, text: lines, size: spec.crown ? 11 : 8 }) +
      `</g>`,
  };
}

const a = place(A, 420, 'THE PALMA · 2027 · AMA OKONKWO');
const b = place(B, 900, 'SHORT FORM · 2027 · JORDAN SMITH');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="pool" cx="50%" cy="46%" r="52%">
      <stop offset="0%" stop-color="${CHAMPAGNE}" stop-opacity="0.075"/>
      <stop offset="100%" stop-color="${CHAMPAGNE}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${INK}"/>
  <ellipse cx="640" cy="480" rx="620" ry="420" fill="url(#pool)"/>
  <rect x="38" y="38" width="${W - 76}" height="${H - 76}" fill="none" stroke="${RULE}" stroke-width="1"/>

  <text x="74" y="106" fill="${CHAMPAGNE}" font-size="31" font-family="Georgia, serif" letter-spacing="10">PALMA</text>
  <text x="74" y="133" fill="${TAUPE}" font-size="11.5" font-family="Georgia, serif" letter-spacing="4.5">THE TROPHIES · ONE CASTING · THE SEAL, STANDING</text>
  <line x1="74" y1="156" x2="${W - 74}" y2="156" stroke="${RULE}" stroke-width="1"/>

  <line x1="200" y1="${GROUND}" x2="1180" y2="${GROUND}" stroke="${RULE}" stroke-width="1.4"/>

  ${a.svg}${b.svg}

  ${dimV({ x: 420 - (A.outer * S) / 2 - 42, y1: a.top, y2: GROUND, label: '332' })}
  ${dimV({ x: 900 - (B.outer * S) / 2 - 42, y1: b.top, y2: GROUND, label: '227' })}

  ${label({
    x: 420 - (A.outer * S) / 2 - 42,
    y: GROUND + 62,
    title: 'THE PALMA',
    lines: [
      'One a year. A standing bronze ring with',
      'the palm held inside it, crown included.',
      'Ø340 × 12 mm. 4.2 kg.',
    ],
  })}
  ${label({
    x: 900 - (B.outer * S) / 2 - 42,
    y: GROUND + 62,
    title: 'CATEGORY PALMA',
    lines: ['The same seal, no crown.', 'Ø232 × 10 mm. 1.6 kg.'],
  })}

  <g transform="translate(1250 250)">
    <text x="0" y="0" fill="${CHAMPAGNE}" font-size="14" font-family="Georgia, serif" letter-spacing="3.4">WHAT CHANGED</text>
    <line x1="0" y1="11" x2="300" y2="11" stroke="${RULE}" stroke-width="1"/>
    ${[
      'The silhouette is a circle, which is as',
      'abstract as a form gets, and the palm',
      'inside reads as an emblem rather than a',
      'plant because it is framed. Nothing',
      'grows in a ring.',
      '',
      'The spine runs down into the band and',
      'merges with it. That is the only joint,',
      'it is cast rather than fixed, and inside',
      'a frame it reads as a mounting stem',
      'rather than as something rooted.',
      '',
      'There is no base. A flat is machined',
      'across the bottom of the ring and it',
      'stands on that. One casting, floor to',
      'top, nothing to come loose.',
      '',
      'The name is cut into the band itself.',
      'No plate, nothing screwed on.',
      '',
      'A seal is what PALMA already talks in:',
      'every honour carries a signed record.',
      'This is that seal at 340 mm.',
    ]
      .map(
        (l, i) =>
          `<text x="0" y="${38 + i * 19}" fill="${TAUPE}" font-size="12.5" font-family="Georgia, serif">${l}</text>`,
      )
      .join('')}
  </g>

  <text x="74" y="${H - 74}" fill="${TAUPE}" font-size="12" font-family="Georgia, serif">The palm cantilevers from the base of the ring and the fronds float free in the opening: one joint, cast, not fixed.</text>
  <text x="${W - 74}" y="${H - 74}" fill="${TAUPE}" font-size="11" text-anchor="end" font-family="ui-monospace, Menlo, monospace" letter-spacing="1">MILLIMETRES</text>
</svg>`;

writeFileSync(`${DIR}/palma-trophies.svg`, svg);
await sharp(Buffer.from(svg), { density: 200 }).png().toFile(`${DIR}/palma-trophies.png`);
console.log('elevation ok');
