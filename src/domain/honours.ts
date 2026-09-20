/**
 * The kinds of honour PALMA confers.
 *
 * One list. It was three: `server/data/types.ts`, `server/services/honours.ts`
 * and an inline union inside `lib/verification.ts`, each written out by hand and
 * each a place the set could be extended without the others noticing. The
 * verification signature binds the kind, so a divergence there is not a typing
 * inconvenience, it is a record that cannot be checked.
 */

export const HONOUR_KINDS = [
  'shortlist',
  'finalist',
  'winner',
  'special_recognition',
  'the_palma',
] as const;

export type HonourKind = (typeof HONOUR_KINDS)[number];

/** How an honour is named in public: on a record, a badge, a citation. */
export const HONOUR_LABEL: Record<HonourKind, string> = {
  winner: 'PALMA Winner',
  finalist: 'PALMA Finalist',
  shortlist: 'PALMA Shortlist',
  special_recognition: 'Special Recognition',
  // No qualifier, and no "winner of". A recipient holds THE PALMA.
  the_palma: 'THE PALMA',
};

/**
 * The one honour that is not held in a category.
 *
 * Anything walking the record has to branch here: a PALMA has no category to
 * name, no candidacy behind it, and it is never listed among the twelve. This
 * is the single predicate for all of that, so a new surface asks one question
 * rather than inventing its own answer.
 */
export function isThePalma(kind: HonourKind): boolean {
  return kind === 'the_palma';
}

/**
 * The slug a PALMA stands under where a category slug is expected.
 *
 * The record is full of places that carry a category slug for an honour: the
 * PaROH, a creator's list of honours, a verification page. THE PALMA has no
 * category, so rather than make every one of those fields nullable and every
 * consumer branch, it stands under its own name and `honourHref` sends it to
 * its own page instead of to a category that does not exist.
 */
export const THE_PALMA_SLUG = 'the-palma';

/** The public name of the thing an honour was conferred in. */
export function honourCategoryName(kind: HonourKind, categoryName: string | null): string {
  return isThePalma(kind) ? HONOUR_LABEL.the_palma : (categoryName ?? '');
}

/** The slug of the thing an honour was conferred in. */
export function honourCategorySlug(kind: HonourKind, categorySlug: string | null): string {
  return isThePalma(kind) ? THE_PALMA_SLUG : (categorySlug ?? '');
}

/**
 * Where an honour points in public.
 *
 * A category honour points at its category in the season it was won. THE PALMA
 * points at its own page, and carries no year parameter because there is one a
 * season and the page says which.
 */
export function honourHref(kind: HonourKind, categorySlug: string, year: number): string {
  if (isThePalma(kind)) return '/the-palma';
  return `/categories/${categorySlug}?year=${year}`;
}

/**
 * The quotable address of a single honour.
 *
 * `/creators/maya-rivers/the-palma-2027` rather than
 * `/creators/maya-rivers?code=PM-2027-0042`. A verification code is provable
 * but not sayable: nobody reads one down a phone, and nobody puts one in a bio
 * without explaining it first. This is the form a creator can put in a link
 * tree, a press kit or an email signature and have it mean something before it
 * is clicked.
 *
 * The code remains the canonical proof and the page carries it. This is a
 * second door onto the same record, not a second record.
 *
 * The shape is `{what}-{year}`: the category it was won in, or `the-palma`
 * where there is no category. Year is part of it because a creator can hold
 * the same category in more than one season, and the address has to say which.
 */
export function achievementSlug(kind: HonourKind, categorySlug: string, year: number): string {
  return `${isThePalma(kind) ? THE_PALMA_SLUG : categorySlug}-${year}`;
}

/**
 * Read one back.
 *
 * Returns null rather than guessing. A trailing four-digit year is the only
 * thing this will accept, so `/creators/maya-rivers/portrait` can never be
 * mistaken for an honour that happens to be missing.
 */
export function parseAchievementSlug(slug: string): { what: string; year: number } | null {
  const match = /^(.+)-(\d{4})$/.exec(slug);
  if (!match) return null;

  const what = match[1];
  const year = Number(match[2]);
  if (!what || !Number.isInteger(year)) return null;

  return { what, year };
}

/** Whether a slug names this honour. */
export function matchesAchievementSlug(
  honour: { kind: HonourKind; categorySlug: string; year: number },
  slug: string,
): boolean {
  return achievementSlug(honour.kind, honour.categorySlug, honour.year) === slug;
}

/**
 * Which honour a shared address should resolve to when more than one matches.
 *
 * A creator can hold both a finalist and a winner honour in one category and
 * season. The address names the contest, so it resolves to the highest thing
 * they hold in it: linking someone to your finalist record when you won is a
 * worse failure than the reverse.
 */
export const HONOUR_STANDING: Record<HonourKind, number> = {
  the_palma: 5,
  winner: 4,
  finalist: 3,
  special_recognition: 2,
  shortlist: 1,
};

/** Whether a kind mints a permanent, citable achievement record. */
export function mintsAchievement(kind: HonourKind): boolean {
  return (
    kind === 'finalist' ||
    kind === 'winner' ||
    kind === 'special_recognition' ||
    kind === 'the_palma'
  );
}

export function isHonourKind(value: string): value is HonourKind {
  return (HONOUR_KINDS as readonly string[]).includes(value);
}
