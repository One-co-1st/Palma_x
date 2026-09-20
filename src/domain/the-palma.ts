/**
 * THE PALMA.
 *
 * Not "The PALMA Creator Legacy Award". Not "the PALMA Award for Outstanding
 * Contribution". THE PALMA — the institution's highest honour, conferred on one
 * creator a year, and the only honour PALMA names after itself.
 *
 * The name is the point. An institution gets one symbol that people say out
 * loud, and it only works if it is short enough to be said: *who is getting THE
 * PALMA this year*, *she won THE PALMA*. Every qualifier added to it makes it
 * a category again. So the rules about the name are in code, and the tests
 * enforce them, because a name erodes by a word at a time in other people's
 * copy long before anybody decides to change it.
 *
 * The second rule matters more than the first. **THE PALMA is not a lifetime
 * achievement award.** A lifetime achievement award is a gold watch: it says
 * the work is behind you. THE PALMA is winnable — is *meant* to be won — by a
 * creator in the middle of an active career whose contribution has already
 * become culturally significant. A twenty-nine-year-old can win it. Someone can
 * win it and then do their best work afterwards.
 */

/** The name, and the only form of it that is correct. */
export const THE_PALMA = 'THE PALMA' as const;

/**
 * Forms of the name that are wrong, and what to say instead.
 *
 * Every one of these is a real thing somebody will write — in a press release,
 * a sponsor deck, an article, an email to a creator. Keeping the list here
 * means the objection has one place to live and `nameIsCorrect` can be run over
 * copy before it goes out.
 */
export const NAME_ERRORS: { wrong: RegExp; why: string }[] = [
  {
    wrong: /\bthe\s+palma\s+(creator\s+)?legacy\s+award\b/i,
    why: 'THE PALMA has no qualifier. It is not a legacy award.',
  },
  {
    wrong: /\blifetime\s+achievement\b/i,
    why: 'THE PALMA is not a lifetime achievement award. It is winnable by an active creator.',
  },
  {
    wrong: /\bpalma\s+award\s+for\b/i,
    why: 'THE PALMA is not awarded "for" a thing. The honour is the whole body of work.',
  },
  {
    wrong: /\bthe\s+palma\s+award\b/i,
    why: 'THE PALMA, not the PALMA Award. The article is part of the name; "award" is not.',
  },
];

/**
 * Does this copy name the honour correctly?
 *
 * Returns the objections rather than a boolean, because an editor needs to know
 * which phrase to change. Empty means the copy is clean.
 */
export function nameObjections(copy: string): string[] {
  return NAME_ERRORS.filter((error) => error.wrong.test(copy)).map((error) => error.why);
}

/** The criterion, in one sentence, exactly as it is put to the panel. */
export const THE_PALMA_CRITERION =
  'Awarded to one creator each year whose overall body of work has made the most significant contribution to adult creator culture during their career.';

/**
 * What the panel weighs.
 *
 * Eight considerations, deliberately unweighted and deliberately unscored.
 * Every other honour at PALMA goes through the scoring rubric in
 * `domain/judging.ts` and comes out as a trimmed mean. THE PALMA does not:
 * there is no arithmetic that turns "influence on other creators" into a number
 * you can average against "longevity", and pretending otherwise would be the
 * kind of false precision this institution exists to avoid.
 *
 * The panel deliberates and names one creator. The considerations are what the
 * deliberation has to be *about*, published in advance so the decision can be
 * argued with afterwards.
 */
export const CONSIDERATIONS = [
  {
    key: 'influence',
    title: 'Creative influence',
    detail: 'Work other creators watched, learned from, and changed their own practice because of.',
  },
  {
    key: 'longevity',
    title: 'Longevity',
    detail: 'A body of work sustained across years, through more than one era of the industry.',
  },
  {
    key: 'originality',
    title: 'Originality',
    detail: 'Something that did not exist in the form it now takes until this creator made it.',
  },
  {
    key: 'cultural_impact',
    title: 'Cultural impact',
    detail: 'Reach beyond an audience and into the culture the audience belongs to.',
  },
  {
    key: 'peer_influence',
    title: 'Influence on other creators',
    detail: 'Careers that exist because this one did. Doors opened, standards raised, paths shown.',
  },
  {
    key: 'community',
    title: 'Audience and community significance',
    detail: 'What the work means to the people it reached, not how many of them there were.',
  },
  {
    key: 'achievement',
    title: 'Career achievement',
    detail: 'The peaks, and the consistency between them.',
  },
  {
    key: 'evolution',
    title: 'Contribution to the evolution of adult creator culture',
    detail:
      'The industry is different because of this creator, in a way that can be named and argued.',
  },
] as const;

export type Consideration = (typeof CONSIDERATIONS)[number];
export type ConsiderationKey = Consideration['key'];

/**
 * What THE PALMA is explicitly not measured on.
 *
 * Published, not merely observed, because the difference between an award with
 * authority and an award without one is whether it can be predicted from a
 * public number. If the panel's answer were derivable from a follower count,
 * nobody would need the panel.
 */
export const NOT_MEASURED = [
  { term: 'Popularity', why: 'A measure of reach, which PALMA can already see and does not rank.' },
  { term: 'Follower count', why: 'A number owned by a platform, not an achievement.' },
  { term: 'Earnings', why: 'A measure of a business. THE PALMA is a measure of a contribution.' },
  { term: 'Nomination volume', why: 'Nominations open the conversation. They do not decide it.' },
] as const;

/**
 * THE PALMA is not open to nomination in the way a category is.
 *
 * Audience nominations name creators for categories. THE PALMA is drawn from
 * the whole record — every creator PALMA holds, honoured or not, claimed or
 * not — and the panel is not limited to that season's finalists. A creator does
 * not have to be nominated in a single category to receive it.
 *
 * This is why it carries no `candidacyId`: there is no candidacy behind it.
 */
export const NOMINABLE = false;

/** Exactly one a year. There is no runner-up and no shared PALMA. */
export const PER_SEASON = 1;

/**
 * May the same creator receive it twice?
 *
 * No — and this is a real decision rather than an oversight. An honour that can
 * be given to the same person repeatedly becomes a ranking of the already
 * honoured, and THE PALMA's whole value is that receiving it once is terminal:
 * there is nothing above it and nothing after it.
 */
export const REPEATABLE = false;

/**
 * Why a proposed PALMA cannot be conferred.
 *
 * Returns every reason rather than the first, so an administrator sees the
 * whole objection in one pass instead of fixing one thing and being told about
 * the next. An empty array means the conferral is sound — not that it should
 * happen, which is a decision for two administrators and not for this file.
 */
export function conferralObjections(input: {
  /** PALMAs already conferred for this season, in any state. */
  existingThisSeason: number;
  /** Seasons in which this creator has already received THE PALMA. */
  creatorHeldIn: number[];
  /** Whether the creator's record is verified. PALMA confers on verified creators. */
  creatorIsVerified: boolean;
  /** Whether the record is live. A revoked or withdrawn record cannot receive it. */
  creatorIsPublished: boolean;
  /** The panel's written citation. THE PALMA is never conferred without one. */
  citation: string | null;
}): string[] {
  const objections: string[] = [];

  if (input.existingThisSeason >= PER_SEASON) {
    objections.push(
      `THE PALMA has already been conferred this season. There is one a year, and it is not shared.`,
    );
  }

  if (!REPEATABLE && input.creatorHeldIn.length > 0) {
    objections.push(
      `This creator received THE PALMA in ${input.creatorHeldIn.join(', ')}. It is conferred once.`,
    );
  }

  if (!input.creatorIsVerified) {
    objections.push('The creator is not verified. PALMA confers no honour without assurance.');
  }

  if (!input.creatorIsPublished) {
    objections.push('The creator record is not published, so there is nothing to confer upon.');
  }

  // A citation is not decoration. THE PALMA is a claim about a career, and a
  // claim nobody wrote down is one the institution cannot defend later.
  const citation = input.citation?.trim() ?? '';
  if (citation.length < 120) {
    objections.push(
      'THE PALMA requires a written citation of at least 120 characters. The panel says why.',
    );
  }

  return objections;
}
