/**
 * The scorecard.
 *
 * PALMA's position in one line: **the audience discovers, PALMA evaluates,
 * judges decide.** Nomination volume is a discovery signal — evidence that
 * somebody is worth investigating — and nothing in this file reads it. A
 * creator with ten thousand nominations does not beat a creator with two
 * thousand, because the two numbers are not what is being compared.
 *
 * Six criteria, weighted. The weights are published — they are on
 * /about/judging, in the competition rules and in the press pack — while the
 * scores themselves never are. That combination is the whole design: anybody
 * can check what PALMA claims to value and argue with it, and nobody can work
 * out how an individual judge voted.
 *
 * **On the arithmetic.** Each criterion is scored 0–10 as a whole number, and
 * every weight is a whole number of percent. So a weighted total is
 * `Σ(score × weight)` — an integer from 0 to 1000, with no floating point
 * anywhere in the path and no rounding to argue about later. Read it as a mark
 * out of 100 to one decimal place: 873 is 87.3. `asPoints` does that, and it is
 * the only place the division happens.
 */

export const SCORING_CRITERIA = [
  {
    key: 'achievement',
    label: 'Achievement and performance',
    weight: 25,
    description: 'What was actually accomplished in the eligibility window.',
    guidance:
      'The work itself, at its own level of ambition. A modest project executed completely scores above an ambitious one that did not land. Judge what was made, not what was announced.',
  },
  {
    key: 'quality',
    label: 'Creative quality and originality',
    weight: 20,
    description: 'Craft, and distinctiveness of the ideas behind it.',
    guidance:
      'Would this be recognisable as theirs with the name removed? Score the ideas and the form they take, not how unusual the subject happens to be this year, and not production budget.',
  },
  {
    key: 'impact',
    label: 'Impact and influence',
    weight: 20,
    description: 'What changed because this work exists.',
    guidance:
      'Practice other creators picked up, a subject taken seriously, a standard raised. Reach is not impact: a piece seen by a hundred thousand people that changed nothing scores below one seen by five thousand that changed how a form is made.',
  },
  {
    key: 'consistency',
    label: 'Consistency and body of work',
    weight: 15,
    description: 'Sustained quality and output across the window.',
    guidance:
      'One exceptional piece is not a body of work. Look for quality held across the season, and do not penalise a deliberately small output that is uniformly strong.',
  },
  {
    key: 'audience',
    label: 'Audience and community significance',
    weight: 10,
    description: 'What the work means to the people it reached.',
    guidance:
      'Not how many. This is the criterion most easily misread, so it is put plainly: score what the work means to the community around it: whether it gave people something they did not have, whether it is defended and passed on. Follower counts, subscriber numbers and view counts are not evidence for this criterion and must be disregarded.',
  },
  {
    key: 'fit',
    label: 'Category fit',
    weight: 10,
    description: 'How squarely the work sits in the category it was entered in.',
    guidance:
      'Excellent work in the wrong category is still in the wrong category. This is not a penalty for range. It asks whether this category is where the work should be judged, and it is the criterion that keeps a strong creator from sweeping every category they are named in.',
  },
] as const;

export type Criterion = (typeof SCORING_CRITERIA)[number];
export type CriterionKey = Criterion['key'];

export const MIN_SCORE = 0;
export const MAX_SCORE = 10;

/**
 * The weights must total 100.
 *
 * Computed rather than written down, so the constant cannot drift from the
 * table above — and asserted in a test, because a scorecard whose weights sum
 * to 95 produces totals that look right and are not.
 */
export const TOTAL_WEIGHT = SCORING_CRITERIA.reduce((sum, criterion) => sum + criterion.weight, 0);

/** A perfect card: 10 across, weighted, in tenths of a point out of 100. */
export const MAX_TOTAL = MAX_SCORE * TOTAL_WEIGHT;

/** A weighted total as a mark out of 100, to one decimal place. */
export function asPoints(total: number): number {
  return Math.round(total) / 10;
}

/** The same, formatted, for anywhere a figure is shown to a person. */
export function formatPoints(total: number): string {
  return asPoints(total).toFixed(1);
}

export type ScoreCard = Record<CriterionKey, number>;

/**
 * The rationale.
 *
 * A score without reasoning is an opinion PALMA cannot defend. Judges write a
 * short argument — not an essay, and not a sentence — that a stranger reading
 * the case file afterwards could follow.
 */
export const RATIONALE_MIN_WORDS = 50;
export const RATIONALE_MAX_WORDS = 500;

export function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

export function validateRationale(value: string): { ok: true } | { ok: false; message: string } {
  const words = countWords(value);
  if (words < RATIONALE_MIN_WORDS) {
    return {
      ok: false,
      message: `A rationale needs at least ${RATIONALE_MIN_WORDS} words. You have written ${words}.`,
    };
  }
  if (words > RATIONALE_MAX_WORDS) {
    return {
      ok: false,
      message: `A rationale is capped at ${RATIONALE_MAX_WORDS} words. You have written ${words}.`,
    };
  }
  return { ok: true };
}

export function isValidScore(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_SCORE && value <= MAX_SCORE;
}

export function validateScoreCard(card: Partial<ScoreCard>):
  | { ok: true; card: ScoreCard }
  | {
      ok: false;
      errors: Partial<Record<CriterionKey, string>>;
    } {
  const errors: Partial<Record<CriterionKey, string>> = {};
  const result = {} as ScoreCard;

  for (const criterion of SCORING_CRITERIA) {
    const value = card[criterion.key];
    if (value === undefined || Number.isNaN(value)) {
      errors[criterion.key] = `${criterion.label} is required.`;
      continue;
    }
    if (!isValidScore(value)) {
      errors[criterion.key] = `${criterion.label} must be a whole number from 0 to 10.`;
      continue;
    }
    result[criterion.key] = value;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, card: result };
}

/**
 * The weighted total, in tenths of a point out of 100.
 *
 * Integer throughout: whole scores times whole percentages. An award decided by
 * a number should not depend on how a language rounds.
 */
export function totalScore(card: ScoreCard): number {
  return SCORING_CRITERIA.reduce(
    (sum, criterion) => sum + card[criterion.key] * criterion.weight,
    0,
  );
}

/** What a single criterion contributed, for showing the working. */
export function contribution(criterion: Criterion, score: number): number {
  return score * criterion.weight;
}

export type CandidacyScores = { candidacyId: string; totals: number[] };

export type AggregatedScore = {
  candidacyId: string;
  judgeCount: number;
  total: number;
  mean: number;
  /** Mean with the single highest and lowest judge removed, once a panel is large enough. */
  trimmedMean: number;
  spread: number;
};

/**
 * The point at which a panel is disagreeing rather than merely differing.
 *
 * Expressed against the scale rather than as a bare number, because it was one
 * before: when the scale was 0–50 this was `20`, and moving to a weighted 0–1000
 * would have left a threshold that fires on every candidacy while looking
 * deliberate. Anything calibrated to the scale belongs to the scale.
 */
export const SHARP_DISAGREEMENT = Math.round(MAX_TOTAL * 0.4);

/**
 * Panels disagree, and a single outlier should not decide a PALMA. Once four or
 * more judges have scored, the highest and lowest are trimmed before ranking.
 *
 * Nothing here reads how many nominations a candidacy received: popularity
 * brings a creator to PALMA's attention, and stops there.
 */
export function aggregate(input: CandidacyScores): AggregatedScore {
  const totals = [...input.totals].sort((a, b) => a - b);
  const judgeCount = totals.length;
  const sum = totals.reduce((a, b) => a + b, 0);
  const mean = judgeCount === 0 ? 0 : sum / judgeCount;

  let trimmedMean = mean;
  if (judgeCount >= 4) {
    const trimmed = totals.slice(1, -1);
    trimmedMean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  }

  const spread = judgeCount === 0 ? 0 : (totals[judgeCount - 1] ?? 0) - (totals[0] ?? 0);

  return {
    candidacyId: input.candidacyId,
    judgeCount,
    total: sum,
    mean: round(mean),
    trimmedMean: round(trimmedMean),
    spread,
  };
}

export function rank(entries: CandidacyScores[]): AggregatedScore[] {
  return entries
    .map(aggregate)
    .sort((a, b) =>
      b.trimmedMean !== a.trimmedMean
        ? b.trimmedMean - a.trimmedMean
        : b.judgeCount !== a.judgeCount
          ? b.judgeCount - a.judgeCount
          : a.candidacyId.localeCompare(b.candidacyId),
    );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
