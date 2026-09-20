import { describe, expect, it } from 'vitest';
import {
  aggregate,
  asPoints,
  contribution,
  formatPoints,
  MAX_SCORE,
  MAX_TOTAL,
  rank,
  SCORING_CRITERIA,
  SHARP_DISAGREEMENT,
  TOTAL_WEIGHT,
  RATIONALE_MAX_WORDS,
  RATIONALE_MIN_WORDS,
  countWords,
  validateRationale,
  totalScore,
  validateScoreCard,
  type ScoreCard,
} from '@/domain/judging';

/** A card with the same mark against every criterion. */
function flat(score: number): ScoreCard {
  return Object.fromEntries(SCORING_CRITERIA.map((c) => [c.key, score])) as ScoreCard;
}

describe('the weighting', () => {
  it('sums to exactly 100 per cent', () => {
    // A scorecard whose weights total 95 produces totals that look right and
    // are not. This is the invariant the whole model rests on.
    expect(TOTAL_WEIGHT).toBe(100);
  });

  it('is the six criteria PALMA publishes, in weight order', () => {
    expect(SCORING_CRITERIA.map((c) => [c.key, c.weight])).toEqual([
      ['achievement', 25],
      ['quality', 20],
      ['impact', 20],
      ['consistency', 15],
      ['audience', 10],
      ['fit', 10],
    ]);
  });

  it('gives every criterion a weight above zero', () => {
    // A criterion worth nothing is a criterion that should not be asked for.
    expect(SCORING_CRITERIA.every((c) => c.weight > 0)).toBe(true);
  });

  it('warns judges off follower counts in the audience criterion', () => {
    // The criterion most easily misread as "how many". PALMA's whole position
    // is that it is not, so the guidance has to say so in terms.
    const audience = SCORING_CRITERIA.find((c) => c.key === 'audience')!;
    expect(audience.guidance).toMatch(/Follower counts/);
    expect(audience.guidance).toMatch(/disregarded/);
  });
});

describe('weighted totals', () => {
  it('scores a perfect card at 100.0', () => {
    expect(totalScore(flat(MAX_SCORE))).toBe(MAX_TOTAL);
    expect(asPoints(MAX_TOTAL)).toBe(100);
    expect(formatPoints(MAX_TOTAL)).toBe('100.0');
  });

  it('scores an empty card at nothing', () => {
    expect(totalScore(flat(0))).toBe(0);
  });

  it('is a whole number for every whole card', () => {
    // Integer throughout: whole marks times whole percentages. An award
    // decided by a number must not depend on how a language rounds.
    for (let score = 0; score <= MAX_SCORE; score += 1) {
      expect(Number.isInteger(totalScore(flat(score)))).toBe(true);
    }
  });

  it('weights a criterion by its published share', () => {
    // Ten on achievement alone is a quarter of the available marks.
    const card = { ...flat(0), achievement: MAX_SCORE };
    expect(asPoints(totalScore(card))).toBe(25);

    // Ten on category fit alone is a tenth.
    const fit = { ...flat(0), fit: MAX_SCORE };
    expect(asPoints(totalScore(fit))).toBe(10);
  });

  it('ranks a strong achievement above a strong category fit', () => {
    // The point of weighting: the same mark is worth more where PALMA says it is.
    const strongAchievement = { ...flat(5), achievement: 10, fit: 0 };
    const strongFit = { ...flat(5), achievement: 0, fit: 10 };
    expect(totalScore(strongAchievement)).toBeGreaterThan(totalScore(strongFit));
  });

  it('shows its working, criterion by criterion', () => {
    const total = SCORING_CRITERIA.reduce((sum, c) => sum + contribution(c, 7), 0);
    expect(total).toBe(totalScore(flat(7)));
  });

  it('reads a total as a mark out of 100 to one decimal', () => {
    expect(asPoints(873)).toBe(87.3);
    expect(formatPoints(873)).toBe('87.3');
    expect(formatPoints(900)).toBe('90.0');
  });
});

describe('the disagreement threshold', () => {
  it('is calibrated to the scale rather than left as a bare number', () => {
    // It was 20 when the scale was 0-50. Moving to a weighted 0-1000 would
    // have left a threshold that fires on every candidacy while looking
    // deliberate, which is the kind of bug nobody finds.
    expect(SHARP_DISAGREEMENT).toBe(400);
    expect(SHARP_DISAGREEMENT).toBeLessThan(MAX_TOTAL);
    expect(SHARP_DISAGREEMENT).toBeGreaterThan(MAX_TOTAL / 10);
  });
});

describe('score cards', () => {
  it('requires every criterion', () => {
    const result = validateScoreCard({ achievement: 8 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toContain('consistency');
  });

  it('rejects scores outside 0–10 and non-integers', () => {
    expect(validateScoreCard({ ...flat(5), impact: 11 } as never).ok).toBe(false);
    expect(validateScoreCard({ ...flat(5), impact: -1 } as never).ok).toBe(false);
    expect(validateScoreCard({ ...flat(5), impact: 7.5 } as never).ok).toBe(false);
  });

  it('totals a full card', () => {
    const validated = validateScoreCard(flat(10));
    expect(validated.ok).toBe(true);
    if (validated.ok) expect(totalScore(validated.card)).toBe(MAX_TOTAL);
  });
});

describe('aggregation', () => {
  it('uses the plain mean below four judges', () => {
    const result = aggregate({ candidacyId: 'n1', totals: [30, 40, 50] });
    expect(result.judgeCount).toBe(3);
    expect(result.mean).toBe(40);
    expect(result.trimmedMean).toBe(40);
  });

  it('trims the highest and lowest once four judges have scored', () => {
    // A hostile 0 and an enthusiastic 50 should not decide this candidacy.
    const result = aggregate({ candidacyId: 'n1', totals: [0, 40, 42, 50] });
    expect(result.mean).toBe(33);
    expect(result.trimmedMean).toBe(41);
    expect(result.spread).toBe(50);
  });

  it('handles an unscored candidacy without dividing by zero', () => {
    const result = aggregate({ candidacyId: 'n1', totals: [] });
    expect(result.mean).toBe(0);
    expect(result.trimmedMean).toBe(0);
    expect(result.judgeCount).toBe(0);
  });

  it('ranks by trimmed mean, then judge count, then id', () => {
    const ranked = rank([
      { candidacyId: 'b', totals: [40, 40, 40] },
      { candidacyId: 'a', totals: [45, 45, 45] },
      { candidacyId: 'c', totals: [40, 40] },
    ]);
    expect(ranked.map((entry) => entry.candidacyId)).toEqual(['a', 'b', 'c']);
  });
});

describe('the rationale', () => {
  it('counts words, not characters', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('one')).toBe(1);
    expect(countWords('one  two\nthree\tfour')).toBe(4);
  });

  it('refuses a rationale that is really just an opinion', () => {
    const result = validateRationale('Excellent work, clearly the strongest in the category.');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(String(RATIONALE_MIN_WORDS));
  });

  it('accepts a rationale inside the range', () => {
    const words = Array.from({ length: RATIONALE_MIN_WORDS }, (_, i) => `word${i}`).join(' ');
    expect(validateRationale(words).ok).toBe(true);
  });

  it('refuses an essay', () => {
    const words = Array.from({ length: RATIONALE_MAX_WORDS + 1 }, (_, i) => `word${i}`).join(' ');
    const result = validateRationale(words);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('capped');
  });
});

describe('scoring criteria', () => {
  it('gives every criterion guidance a judge can act on', () => {
    for (const criterion of SCORING_CRITERIA) {
      expect(criterion.guidance.length).toBeGreaterThan(40);
    }
  });

  it('never lets audience size in as something to reward', () => {
    // The rule survived the move to a weighted card even though the old
    // wording did not: the criterion that could most easily be read as "how
    // many" now says in terms that it is not, and no criterion invites reach
    // as evidence.
    const guidance = SCORING_CRITERIA.map((criterion) => criterion.guidance).join(' ');
    expect(guidance).toMatch(/Follower counts, subscriber numbers and view counts/);
    expect(guidance).toMatch(/must be disregarded/);
    expect(guidance).toMatch(/Reach is not impact/);
  });
});
