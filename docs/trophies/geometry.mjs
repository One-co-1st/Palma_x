import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * The palm, read from the one place it is drawn.
 *
 * These scripts used to carry their own copy of the paths, which is precisely
 * how this institution ended up with four different palms once already: nobody
 * changes the logo, they just redraw it wherever they need it. So the source of
 * truth is parsed out of `src/components/brand/geometry.ts` at run time, and if
 * that file's shape changes this throws instead of silently drawing something
 * that is no longer the mark.
 */
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '../../src/components/brand/geometry.ts'), 'utf8');

function block(name) {
  const match = source.match(new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) throw new Error(`Could not find ${name} in geometry.ts. Has the mark moved?`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/** Spine first, then the eight fronds, exactly as the mark declares them. */
const ALL = block('MARK_PATHS');
if (ALL.length !== 9) {
  throw new Error(`Expected a spine and eight fronds, found ${ALL.length} paths.`);
}

export const SPINE = ALL[0];

/** Regrouped into the four opposed pairs, crown pair first. */
export const FRONDS = [
  [ALL[1], ALL[2]],
  [ALL[3], ALL[4]],
  [ALL[5], ALL[6]],
  [ALL[7], ALL[8]],
];

const crown = source.match(
  /MARK_CROWN\s*=\s*\{\s*cx:\s*([\d.]+),\s*cy:\s*([\d.]+),\s*r:\s*([\d.]+)/,
);
if (!crown) throw new Error('Could not find MARK_CROWN in geometry.ts.');

export const CROWN = { cx: Number(crown[1]), cy: Number(crown[2]), r: Number(crown[3]) };

/** Spine base to the top of the crown, in mark units. */
export const PALM_UNITS = 53 - (CROWN.cy - CROWN.r);
