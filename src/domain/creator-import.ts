/**
 * Reading a list of creators.
 *
 * Pure: no database, no I/O. Given pasted text it produces rows, errors and a
 * verdict, so the preview an operator sees and the rows the importer writes
 * come from the same function rather than two that agree until they don't.
 *
 * The format is deliberately the one people already have. A list of creators
 * arrives as a spreadsheet column or a CSV export, not as JSON, and an
 * importer that demands a shape nobody holds is an importer nobody uses.
 */

export const IMPORT_COLUMNS = ['name', 'country', 'city', 'headline', 'links'] as const;
export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const MAX_IMPORT_ROWS = 500;

export type ImportRow = {
  /** 1-indexed line in the pasted text, so an error can name it. */
  line: number;
  displayName: string;
  countryCode: string;
  city: string | null;
  headline: string | null;
  links: { label: string; url: string }[];
};

export type ImportProblem = { line: number; detail: string };

export type ImportPlan = {
  rows: ImportRow[];
  problems: ImportProblem[];
  /** Names that appear more than once in the paste itself. */
  duplicatesWithin: string[];
};

/**
 * Split one line.
 *
 * Tab first, because that is what a spreadsheet paste produces and it never
 * collides with a comma in a headline. Comma only when there is no tab at all,
 * with the usual quoted-field handling, since a headline with a comma in it is
 * the first thing anybody will paste.
 */
export function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((cell) => cell.trim());

  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      // A doubled quote inside a quoted field is a literal quote.
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function looksLikeHeader(cells: string[]): boolean {
  const first = (cells[0] ?? '').toLowerCase();
  return first === 'name' || first === 'display name' || first === 'creator';
}

export function parseCreatorImport(
  text: string,
  options: { isValidCountry: (code: string) => boolean; defaultCountry?: string },
): ImportPlan {
  const rows: ImportRow[] = [];
  const problems: ImportProblem[] = [];
  const seen = new Map<string, number>();
  const defaultCountry = options.defaultCountry ?? 'GB';

  const lines = text.split(/\r?\n/);

  lines.forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();

    // Blank lines and comments are how people annotate a list they are pasting.
    if (!trimmed || trimmed.startsWith('#')) return;

    const cells = splitLine(trimmed);
    if (index === 0 && looksLikeHeader(cells)) return;

    const displayName = cells[0] ?? '';
    if (displayName.length < 2) {
      problems.push({ line, detail: 'No name in the first column.' });
      return;
    }
    if (displayName.length > 120) {
      problems.push({ line, detail: 'That name is longer than 120 characters.' });
      return;
    }

    const rawCountry = (cells[1] ?? '').trim();
    const countryCode = (rawCountry || defaultCountry).toUpperCase();
    if (countryCode.length !== 2 || !options.isValidCountry(countryCode)) {
      problems.push({
        line,
        detail: `"${rawCountry}" is not a two-letter country code.`,
      });
      return;
    }

    const city = (cells[2] ?? '').trim();
    const headline = (cells[3] ?? '').trim();

    if (headline.length > 160) {
      problems.push({ line, detail: 'The headline is longer than 160 characters.' });
      return;
    }

    // Links are space- or pipe-separated in the last column. Anything that is
    // not a URL is reported rather than silently dropped: a record PALMA
    // cannot check is the thing this importer exists to avoid creating.
    const linkCell = (cells[4] ?? '').trim();
    const links: { label: string; url: string }[] = [];

    if (linkCell) {
      for (const candidate of linkCell.split(/[|\s]+/).filter(Boolean)) {
        let url: URL;
        try {
          url = new URL(candidate);
        } catch {
          problems.push({ line, detail: `"${candidate}" is not a valid link.` });
          return;
        }
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          problems.push({ line, detail: `"${candidate}" is not a web link.` });
          return;
        }
        if (links.length >= 6) break;
        links.push({ label: labelFor(url), url: url.toString() });
      }
    }

    const key = displayName.toLowerCase();
    const first = seen.get(key);
    if (first !== undefined) {
      problems.push({ line, detail: `"${displayName}" also appears on line ${first}.` });
      return;
    }
    seen.set(key, line);

    rows.push({
      line,
      displayName,
      countryCode,
      city: city || null,
      headline: headline || null,
      links,
    });
  });

  if (rows.length > MAX_IMPORT_ROWS) {
    problems.push({
      line: 0,
      detail: `${rows.length} rows is more than the ${MAX_IMPORT_ROWS} this importer will take at once. Split the list.`,
    });
  }

  return {
    rows,
    problems,
    duplicatesWithin: [...seen.entries()].filter(([, line]) => line === -1).map(([name]) => name),
  };
}

/** "youtube.com" → "YouTube". A label the desk can read at a glance. */
export function labelFor(url: URL): string {
  const host = url.hostname.replace(/^www\./, '');
  const known: Record<string, string> = {
    'youtube.com': 'YouTube',
    'youtu.be': 'YouTube',
    'instagram.com': 'Instagram',
    'tiktok.com': 'TikTok',
    'twitch.tv': 'Twitch',
    'x.com': 'X',
    'twitter.com': 'X',
    'substack.com': 'Substack',
    'patreon.com': 'Patreon',
    'soundcloud.com': 'SoundCloud',
    'spotify.com': 'Spotify',
    'open.spotify.com': 'Spotify',
  };
  return known[host] ?? host;
}
