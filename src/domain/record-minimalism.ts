/**
 * What PALMA may hold about a creator who never asked to be here.
 *
 * PALMA writes records about people before those people agree to anything.
 * That is ordinary for an awards body and lawful under legitimate interests —
 * and it is also the exact point at which an archive can quietly turn into
 * surveillance. So the limit is a rule in code with tests against it, not a
 * paragraph of good intentions in a privacy notice.
 *
 *     PALMA never collects information about an unclaimed creator
 *     merely because it might be useful later.
 *
 * Three reasons this is drawn tightly rather than generously:
 *
 *  1. **Article 21.** An unclaimed record rests on legitimate interests, which
 *     means the person named may object — and the narrower the record, the
 *     easier it is to defend the balance until they do.
 *  2. **Article 9.** Characterising somebody's work can reveal data about their
 *     sex life or sexuality, for which there is no legitimate-interests
 *     condition at all. A record that holds only a name, a country and links
 *     the creator themselves published cannot make that mistake.
 *  3. **Article 14.** Everything here has to be explainable to the person at
 *     first contact. A field nobody can justify in one sentence should not
 *     exist.
 *
 * A claimed record is a different thing entirely: the creator controls it, and
 * the extra fields are theirs, in their words, removable by them at any time.
 */

/** A field on an unclaimed record, with the justification it has to carry. */
export type UnclaimedField = {
  key: string;
  label: string;
  /** Why an awards archive needs it. One sentence, or it does not belong. */
  why: string;
  /** Where it came from, for the Article 14 notice. */
  source: string;
};

/**
 * The complete list. Adding to it is a privacy decision, not a feature
 * decision, and the test suite treats it as one.
 */
export const UNCLAIMED_RECORD_FIELDS: UnclaimedField[] = [
  {
    key: 'displayName',
    label: 'The name they work under',
    why: 'An award cannot name a candidate without it.',
    source: 'The creator’s own public professional presence, or a nomination.',
  },
  {
    key: 'countryCode',
    label: 'Country',
    why: 'Categories and eligibility are organised by country. Nothing finer is needed.',
    source: 'The creator’s own public professional presence, or editorial research.',
  },
  {
    key: 'links',
    label: 'Links to work the creator has published themselves',
    why: 'The record has to be checkable. A link the creator published is also what evidences that the work was made public by them.',
    source: 'Published by the creator on their own platforms.',
  },
  {
    key: 'honours',
    label: 'PALMA honours, once conferred',
    why: 'The institutional record of what PALMA decided. It does not exist until PALMA confers something.',
    source: 'PALMA’s own award decisions.',
  },
];

/** Fields a creator may publish about themselves once they hold the record. */
export const CLAIMED_RECORD_FIELDS = [
  'professional name',
  'pronouns',
  'country',
  'city',
  'headline',
  'biography',
  'portrait',
  'website',
  'links',
] as const;

/**
 * Fields that must never appear on an unclaimed record, whatever their source.
 *
 * `city` is the one people argue about, and it is the clearest case: a country
 * is what an awards archive organises by, and a town is where somebody lives.
 * PALMA has no business publishing the second about a person who has not asked
 * to be listed.
 */
export const FORBIDDEN_ON_UNCLAIMED = [
  'legalName',
  'city',
  'dateOfBirth',
  'age',
  'biography',
  'headline',
  'pronouns',
  'email',
  'phone',
  'address',
  'nominationText',
  'verificationData',
  'internalNotes',
] as const;

export type UnclaimedRecordDraft = {
  displayName?: string | null;
  countryCode?: string | null;
  city?: string | null;
  headline?: string | null;
  biography?: string | null;
  pronouns?: string | null;
  websiteUrl?: string | null;
  portraitUrl?: string | null;
};

/**
 * Strip a draft record down to what an unclaimed record may hold.
 *
 * Used by every route that writes a record nobody has claimed — the importer,
 * the editorial desk, and the record a nomination creates. It is deliberately a
 * *transform* rather than a validation: a route that accidentally supplies a
 * biography should quietly not store one, rather than fail and tempt somebody
 * into working around it.
 */
export function minimiseUnclaimed<T extends UnclaimedRecordDraft>(
  draft: T,
): T & UnclaimedRecordDraft {
  return {
    ...draft,
    city: null,
    headline: null,
    biography: null,
    pronouns: null,
    portraitUrl: null,
  };
}

/**
 * Does this draft carry anything an unclaimed record must not?
 *
 * Returns the offending field names rather than a boolean, so an operator
 * interface can say which field it dropped and why.
 */
export function excessOnUnclaimed(draft: UnclaimedRecordDraft): string[] {
  const excess: string[] = [];
  if (draft.city) excess.push('city');
  if (draft.headline) excess.push('headline');
  if (draft.biography) excess.push('biography');
  if (draft.pronouns) excess.push('pronouns');
  if (draft.portraitUrl) excess.push('portraitUrl');
  return excess;
}

/**
 * A link PALMA may publish on an unclaimed record.
 *
 * Only the creator's own professional presence. Not a fan page, not a
 * directory entry somebody else wrote, not an aggregator — because the reason
 * PALMA may publish the link at all is that it points at something the creator
 * made public themselves.
 */
export function linkIsPublishableUnclaimed(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

  // A link carrying a query string is usually a search, a referral or a
  // tracking parameter rather than a stable professional presence.
  if (parsed.search) return false;

  return true;
}
