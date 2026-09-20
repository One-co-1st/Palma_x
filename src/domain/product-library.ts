/**
 * The PALMA Product Library.
 *
 * A short, curated list of products genuinely relevant to adult creators, each
 * with a PALMA verdict and an honest account of what it is and is not good for.
 * It sits inside Kulture, it is not a shop, and it is deliberately small.
 *
 * **The rule everything here exists to enforce: sponsor money cannot alter a
 * PALMA verdict.** Not "should not". The verdict, the strengths, the
 * limitations and the recommendation are editorial fields, and a sponsor
 * relationship is recorded separately and never reaches them. `sponsorInfluence`
 * below is the list of fields a sponsorship may not touch, and a test asserts
 * that the sponsor-facing shape and the verdict-bearing shape share no field at
 * all. That is the same firewall as sponsors and judging, applied to a smaller
 * room.
 *
 * **No affiliate anything.** No affiliate links, no commission, no tracking
 * parameters appended to an outbound URL, no revenue that moves when a reader
 * clicks. The commercial model is sponsorship, disclosed on the entry's face,
 * and a sponsored entry is labelled whether or not the verdict is favourable.
 * An affiliate link is a financial interest in a reader's purchase, and PALMA
 * reviewing a product it earns a cut of is the whole problem this avoids.
 *
 * Two other things the library must never become. It is not the website: it has
 * its own corner of Kulture and does not appear in the primary navigation above
 * the awards. And it is not a catalogue: twenty or thirty entries that were
 * actually looked at is the product; six hundred scraped from a distributor is
 * a different and much worse thing.
 */

/** The verdict, out of ten, to one decimal place. */
export const MIN_VERDICT = 0;
export const MAX_VERDICT = 10;

/** A verdict below this is published as a warning rather than a recommendation. */
export const CAUTION_BELOW = 5;

/**
 * What a sponsorship may never touch.
 *
 * Every editorial field on an entry. A sponsor buys the disclosure line and
 * nothing above it.
 */
export const EDITORIAL_FIELDS = [
  'verdict',
  'strengths',
  'limitations',
  'bestFor',
  'review',
  'isPublished',
] as const;

/**
 * What a sponsorship actually records.
 *
 * Disjoint from the editorial fields by construction, and a test holds that. If
 * these two lists ever share a name, a sponsor has been given a way to move a
 * verdict, and the whole library stops being worth reading.
 */
export const SPONSOR_FIELDS = ['sponsorId', 'sponsorDisclosure', 'sponsoredAt'] as const;

export type EditorialField = (typeof EDITORIAL_FIELDS)[number];
export type SponsorField = (typeof SPONSOR_FIELDS)[number];

/** Where an entry sits. Deliberately few: this is a library, not a catalogue. */
export const PRODUCT_CATEGORIES = [
  { key: 'production', label: 'Production', note: 'Cameras, lighting, sound, capture.' },
  { key: 'studio', label: 'Studio and set', note: 'The room the work is made in.' },
  { key: 'wardrobe', label: 'Wardrobe and presentation', note: 'What is worn and how it reads.' },
  { key: 'toys', label: 'Devices', note: 'Products creators use in the work itself.' },
  { key: 'software', label: 'Software and tools', note: 'Editing, scheduling, accounting, admin.' },
  { key: 'business', label: 'Business and wellbeing', note: 'Insurance, contracts, health, rest.' },
] as const;

export type ProductCategoryKey = (typeof PRODUCT_CATEGORIES)[number]['key'];

export function productCategory(key: string) {
  return PRODUCT_CATEGORIES.find((entry) => entry.key === key) ?? null;
}

/**
 * The disclosure line, composed rather than typed.
 *
 * An editor cannot soften it, because they do not write it. A sponsored entry
 * says so in the same words every time, and an unsponsored one says nothing,
 * because a disclosure on an entry with nothing to disclose trains readers to
 * ignore the ones that matter.
 */
export function disclosureFor(sponsorName: string | null): string | null {
  if (!sponsorName) return null;
  return `${sponsorName} is a PALMA partner. Partnership paid for this entry's place in the Library. It did not affect the verdict, the strengths or the limitations, which are written by PALMA's editors and are not shown to partners before publication.`;
}

export type EntryDraft = {
  name: string;
  brand: string;
  category: string;
  verdict: number | null;
  bestFor: string;
  strengths: string[];
  limitations: string[];
  review: string;
  externalUrl: string | null;
  sponsorId: string | null;
};

/**
 * Why an entry cannot be published.
 *
 * Every objection at once rather than the first, so an editor sees the whole
 * thing in one pass. Empty means it is publishable, not that it should be
 * published, which is a person's decision.
 */
export function publishObjections(draft: EntryDraft): string[] {
  const objections: string[] = [];

  if (!draft.name.trim()) objections.push('An entry needs a product name.');
  if (!draft.brand.trim()) objections.push('An entry needs a brand.');
  if (!productCategory(draft.category)) objections.push('Choose a category the Library has.');

  if (draft.verdict === null) {
    objections.push(
      'An entry without a verdict is a listing. The Library does not publish listings.',
    );
  } else if (
    !Number.isFinite(draft.verdict) ||
    draft.verdict < MIN_VERDICT ||
    draft.verdict > MAX_VERDICT
  ) {
    objections.push(`A verdict is a number from ${MIN_VERDICT} to ${MAX_VERDICT}.`);
  }

  if (!draft.bestFor.trim()) {
    objections.push('“Best for” is the line most readers act on. It is required.');
  }

  if (draft.strengths.filter((entry) => entry.trim()).length === 0) {
    objections.push('Name at least one strength.');
  }

  // The asymmetry is the point. An entry with strengths and no limitations is
  // an advertisement, and the Library's whole claim is that it is not one.
  if (draft.limitations.filter((entry) => entry.trim()).length === 0) {
    objections.push(
      'Name at least one limitation. An entry with no limitations is an advertisement.',
    );
  }

  if (draft.review.trim().length < 200) {
    objections.push(
      'The review needs at least 200 characters. A verdict without reasoning is a rating.',
    );
  }

  if (draft.externalUrl && !isPlainHttpsUrl(draft.externalUrl)) {
    objections.push(
      'The link must be a plain https address with no query string. PALMA publishes no affiliate or tracking links.',
    );
  }

  return objections;
}

/**
 * An outbound link PALMA will publish.
 *
 * https only, and **no query string at all**. That single rule is what makes an
 * affiliate link impossible to add by accident or by hand: every affiliate and
 * tracking scheme in use works by appending parameters, so a URL that cannot
 * carry parameters cannot carry a commission. An editor who needs a query
 * string for something innocent can say so, and the answer is still no.
 */
export function isPlainHttpsUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') return false;
  if (url.search !== '' || url.hash !== '') return false;
  if (url.username !== '' || url.password !== '') return false;

  return true;
}

/** How a verdict is read aloud, so the number is never alone. */
export function verdictReading(verdict: number): string {
  if (verdict >= 9) return 'Exceptional. PALMA would use this.';
  if (verdict >= 8) return 'Strong. Recommended with the limitations noted.';
  if (verdict >= 6.5) return 'Good, with real caveats.';
  if (verdict >= CAUTION_BELOW) return 'Workable, but there are better options.';
  return 'Not recommended. Published so the reasons are on the record.';
}
