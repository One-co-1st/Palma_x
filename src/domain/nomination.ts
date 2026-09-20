/**
 * Audience nomination rules.
 *
 * The governing principle: **the audience nominates, PALMA judges.** A
 * nomination is a signal that someone believes a creator deserves
 * consideration. It is not a vote, it does not accumulate into a result, and
 * nothing in the judging path reads how many there are.
 *
 * The rules here exist to keep one person's signal worth exactly one signal —
 * not to make nominating difficult.
 */

export const MIN_REASON_LENGTH = 20;
export const MAX_REASON_LENGTH = 250;

/**
 * What a reason may be made of.
 *
 * Letters, figures, spaces, and the punctuation English sentences actually
 * need. Apostrophes and hyphens are in because "don't" and "well-known" are
 * ordinary words, not special characters, and a form that rejects them reads
 * as broken rather than as careful.
 *
 * Everything else is out, and the exclusions are the point rather than
 * tidiness: no @ or / or : means a reason cannot carry a handle, a link or a
 * promotional address into the desk's queue. A nomination is an argument about
 * a creator, and PALMA does the investigating from there.
 */
export const REASON_PATTERN = /^[\p{L}\p{N} .,'’-]*$/u;

/** The characters a reason contains that it may not, in the order found. */
export function disallowedReasonCharacters(reason: string): string[] {
  const found = new Set<string>();
  for (const character of reason) {
    if (!REASON_PATTERN.test(character)) found.add(character);
  }
  return [...found];
}

/** Providers whose addresses alias to the same inbox. */
const ALIASING_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

const DOMAIN_ALIASES: Record<string, string> = {
  'googlemail.com': 'gmail.com',
};

/**
 * One person, one identity.
 *
 * `a.b+palma@gmail.com` and `ab@googlemail.com` are the same inbox, and must
 * not become two nominators. Sub-addressing (`+tag`) is folded for every
 * provider; dot-folding only for providers that actually ignore dots.
 */
export function nominatorKey(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0) return trimmed;

  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  domain = DOMAIN_ALIASES[domain] ?? domain;

  const plus = local.indexOf('+');
  if (plus > 0) local = local.slice(0, plus);

  if (ALIASING_DOMAINS.has(domain)) local = local.replace(/\./g, '');

  return `${local}@${domain}`;
}

export type NominationCheckInput = {
  /** The nominator's verified email, normalised or not. */
  nominatorEmail: string;
  /** Email addresses associated with the creator being nominated. */
  creatorAccountEmails: string[];
  /** True if this person has already nominated this creator in this category. */
  alreadyNominated: boolean;
  creatorIsSuspended: boolean;
  categoryIsOpen: boolean;
  seasonAcceptsNominations: boolean;
  nominatorIsBlocked: boolean;
  reasonLength: number;
};

export type NominationCheck =
  { ok: true } | { ok: false; code: NominationRefusal; message: string };

export type NominationRefusal =
  | 'season_closed'
  | 'category_closed'
  | 'creator_unavailable'
  | 'self_nomination'
  | 'already_nominated'
  | 'nominator_blocked'
  | 'reason_too_short'
  | 'reason_too_long';

/**
 * Everything that must be true for a nomination to be accepted. Checked before
 * a code is sent and again before the nomination is counted, because the season
 * can close between the two.
 */
export function checkNomination(input: NominationCheckInput): NominationCheck {
  if (input.nominatorIsBlocked) {
    return {
      ok: false,
      code: 'nominator_blocked',
      message: 'This address cannot submit nominations.',
    };
  }

  if (!input.seasonAcceptsNominations) {
    return {
      ok: false,
      code: 'season_closed',
      message: 'Nominations are closed for this season.',
    };
  }

  if (!input.categoryIsOpen) {
    return {
      ok: false,
      code: 'category_closed',
      message: 'This category is not accepting nominations.',
    };
  }

  if (input.creatorIsSuspended) {
    return {
      ok: false,
      code: 'creator_unavailable',
      message: 'This creator cannot be nominated at present.',
    };
  }

  // A creator cannot nominate themselves, whichever of their addresses they use.
  const key = nominatorKey(input.nominatorEmail);
  if (input.creatorAccountEmails.some((email) => nominatorKey(email) === key)) {
    return {
      ok: false,
      code: 'self_nomination',
      message: 'A creator cannot nominate themselves. Share your nomination link instead.',
    };
  }

  if (input.alreadyNominated) {
    return {
      ok: false,
      code: 'already_nominated',
      message:
        'You have already nominated this creator in this category. You can nominate them in another category, or nominate someone else.',
    };
  }

  if (input.reasonLength < MIN_REASON_LENGTH) {
    return {
      ok: false,
      code: 'reason_too_short',
      message: `Tell us why in at least ${MIN_REASON_LENGTH} characters.`,
    };
  }

  if (input.reasonLength > MAX_REASON_LENGTH) {
    return {
      ok: false,
      code: 'reason_too_long',
      message: `Keep it under ${MAX_REASON_LENGTH} characters, PALMA does the investigating.`,
    };
  }

  return { ok: true };
}

/** A creator's nomination link, shared with their own audience. */
export function referralPath(creatorSlug: string): string {
  return `/nominate/${creatorSlug}`;
}

/**
 * A creator may share their link once their profile is claimed and verified —
 * before that there is no one accountable for where it is pointed.
 */
export function canIssueReferralLink(input: {
  isClaimed: boolean;
  isSuspended: boolean;
  verificationStatus: string;
}): boolean {
  return input.isClaimed && !input.isSuspended && input.verificationStatus === 'verified';
}
