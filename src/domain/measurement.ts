/**
 * What PALMA counts, and what it refuses to.
 *
 * PALMA measures its own activity. It does not measure its visitors. That is
 * one sentence and the whole architecture follows from it.
 *
 * A counter here records that *a page was requested*. It does not record who
 * requested it, from where, on what, or whether they had been before. There is
 * no cookie, no IP address, no hash of an IP address, no user-agent string, no
 * device identifier and no session — not stored and not derived, because a
 * value you derive and throw away still had to exist for a moment, and the
 * honest way to be unable to identify somebody is to never hold the thing that
 * would identify them.
 *
 * The consequence is deliberate and is not a gap to be closed later: PALMA
 * **cannot** report unique visitors, returning visitors, or direct versus
 * referred traffic. Every one of those requires telling one person from
 * another, which requires an identifier, which is the line. The dashboard says
 * so where the figures would otherwise sit, rather than leaving a blank that
 * somebody eventually fills in.
 *
 * There is precedent in the record already: a verification record has carried a
 * `viewCount` since the beginning. Nobody has ever been able to say who looked.
 *
 * And as with nomination volume: **nothing in the judging path reads any number
 * in this file.** A page counter that could be inflated changes no outcome,
 * which is also why it does not need defending like a vote.
 */

/**
 * The surfaces worth counting separately.
 *
 * Grouping happens here rather than in a dashboard query, so "what counts as
 * Kulture readership" has one answer that a test can hold.
 */
export const SURFACES = [
  {
    key: 'the_palma',
    label: 'THE PALMA',
    note: 'The highest honour’s own page.',
    match: (path: string) => path === '/the-palma',
  },
  {
    key: 'paroh',
    label: 'PaROH',
    note: 'The Roll of Honour, and each season within it.',
    match: (path: string) => path === '/paroh' || path.startsWith('/paroh/'),
  },
  {
    key: 'winners',
    label: 'Winners',
    note: 'The winners index and each season’s winners.',
    match: (path: string) => path === '/winners',
  },
  {
    key: 'finalists',
    label: 'Finalists',
    note: 'The finalists index.',
    match: (path: string) => path === '/finalists',
  },
  {
    key: 'kulture',
    label: 'Kulture',
    note: 'Editorial readership: the Journal and everything under Kulture.',
    match: (path: string) =>
      path === '/journal' || path.startsWith('/journal/') || path.startsWith('/kulture'),
  },
  {
    key: 'creators',
    label: 'Creator records',
    note: 'Individual records, and the index they are found from.',
    match: (path: string) => path === '/creators' || path.startsWith('/creators/'),
  },
  {
    key: 'awards',
    label: 'Awards and categories',
    note: 'The season pages and the categories contested in them.',
    match: (path: string) =>
      path === '/awards' ||
      path.startsWith('/awards/') ||
      path === '/categories' ||
      path.startsWith('/categories/'),
  },
  {
    key: 'nominate',
    label: 'Nominate',
    note: 'The nomination form. Not the nominations themselves.',
    match: (path: string) => path === '/nominate',
  },
  {
    key: 'verify',
    label: 'Verification',
    note: 'Somebody checking whether an honour is real.',
    match: (path: string) => path === '/verify' || path.startsWith('/verify/'),
  },
  {
    key: 'institution',
    label: 'The institution',
    note: 'About, judging, the panel, partners, press, contact, the register.',
    match: (path: string) =>
      path === '/about' ||
      path.startsWith('/about/') ||
      path === '/press' ||
      path === '/contact' ||
      path === '/legal' ||
      path.startsWith('/legal/'),
  },
  {
    key: 'other',
    label: 'Elsewhere',
    note: 'Everything else that is countable.',
    match: () => true,
  },
] as const;

export type SurfaceKey = (typeof SURFACES)[number]['key'];

/** Which surface a path belongs to. Every countable path belongs to exactly one. */
export function surfaceOf(path: string): SurfaceKey {
  return (SURFACES.find((surface) => surface.match(path)) ?? SURFACES[SURFACES.length - 1]!).key;
}

/**
 * The figures PALMA deliberately cannot produce, and why.
 *
 * Rendered in the dashboard where they would otherwise sit. A metric that is
 * simply absent looks like an oversight and gets built by the next person to
 * notice; a metric that is absent *with its reason next to it* is a decision
 * that survives.
 */
export const REFUSED = [
  {
    term: 'Unique visitors',
    why: 'Requires telling one person from another across a day. That needs an identifier, such as a cookie, an IP, or a hash of one, and PALMA holds none of them.',
  },
  {
    term: 'Returning visitors',
    why: 'Requires recognising a device on a later day, which is the definition of tracking. The cookies notice says PALMA does not do it, and PALMA does not do it.',
  },
  {
    term: 'Direct traffic',
    why: 'Requires attributing a visit to a source, which means holding something per visit. Counters hold nothing per visit.',
  },
  {
    term: 'Social mentions',
    why: 'Lives on other companies’ platforms and needs their APIs and their terms. PALMA measures PALMA.',
  },
  {
    term: 'Press mentions',
    why: 'Not discoverable from our own system. A person finds these and, if they matter, writes them up in the Journal.',
  },
  {
    term: 'Search volume for “PALMA”',
    why: 'A figure only a search engine holds. Reading it means taking their tooling and their tracking with it.',
  },
  {
    term: 'Shares',
    why: 'A share happens in somebody else’s app. PALMA would only ever see a button being pressed, which is not the same thing and would be reported as if it were.',
  },
] as const;

/** The line, in one sentence, for the top of the dashboard. */
export const MEASUREMENT_STATEMENT =
  'Aggregate counters only. PALMA does not identify or track individual visitors.';

/**
 * Paths PALMA will count.
 *
 * The counting endpoint is unauthenticated by necessity — it is called by a
 * public page — so it must not be a way to write arbitrary rows into PALMA's
 * database. Anything not matching one of these shapes is discarded rather than
 * stored, which bounds the table to the pages that actually exist.
 */
const COUNTABLE: RegExp[] = [
  /^\/$/,
  /^\/the-palma$/,
  /^\/paroh(\/\d{4})?$/,
  /^\/winners$/,
  /^\/finalists$/,
  /^\/awards(\/\d{4})?$/,
  /^\/categories(\/[a-z0-9-]{1,80})?$/,
  /^\/creators(\/[a-z0-9-]{1,80})?$/,
  /^\/journal(\/[a-z0-9-]{1,120})?$/,
  /^\/kulture(\/[a-z0-9-]{1,120}){0,2}$/,
  /^\/nominate$/,
  /^\/verify(\/[A-Z0-9-]{1,40})?$/,
  /^\/about(\/[a-z-]{1,40})?$/,
  /^\/press$/,
  /^\/contact$/,
  /^\/legal(\/[a-z-]{1,60})?$/,
  /^\/lists\/[a-z_]{1,40}$/,
];

/** Is this a path PALMA counts? Used by the endpoint before it writes anything. */
export function isCountable(path: string): boolean {
  if (path.length > 200) return false;
  return COUNTABLE.some((pattern) => pattern.test(path));
}

/**
 * Normalise a path before it is counted or stored.
 *
 * A query string can carry anything — including something personal a visitor
 * pasted, or a token from an email — so it never reaches the counter. The
 * trailing slash is collapsed so `/paroh` and `/paroh/` are one row and not two.
 */
export function normalisePath(raw: string): string | null {
  if (typeof raw !== 'string' || raw === '') return null;

  let path = raw.split('?')[0]!.split('#')[0]!;
  if (!path.startsWith('/')) return null;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

  return path === '' ? '/' : path;
}

/**
 * What PALMA keeps of a search.
 *
 * The term and nothing else. Searches are the one place a visitor types free
 * text, so the term is trimmed, lower-cased, collapsed and capped — a long
 * paste is the shape an accidental disclosure takes, and a hundred characters
 * is more than any real search of an awards archive needs.
 */
export const MAX_TERM_LENGTH = 100;

export function normaliseTerm(raw: string): string | null {
  if (typeof raw !== 'string') return null;

  const term = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (term === '' || term.length > MAX_TERM_LENGTH) return null;

  // An email address or anything with an @ in it is somebody's identifier
  // rather than a search of the archive, and is not kept even in aggregate.
  if (term.includes('@')) return null;

  return term;
}

/** The UTC day a count belongs to. Days, not timestamps: a timestamp is a trail. */
export function dayOf(at: Date = new Date()): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}
