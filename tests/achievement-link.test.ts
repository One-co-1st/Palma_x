import { describe, expect, it } from 'vitest';
import {
  achievementSlug,
  HONOUR_KINDS,
  HONOUR_STANDING,
  matchesAchievementSlug,
  parseAchievementSlug,
  THE_PALMA_SLUG,
} from '@/domain/honours';

/**
 * The quotable address.
 *
 * `/creators/maya-rivers/the-palma-2027` is what a creator puts in a link
 * tree, a press kit or an email signature. It is the answer to "prove it", so
 * the rules about what it resolves to are worth holding down: a link printed in
 * somebody's media pack has to keep meaning the same thing for years.
 */
describe('an achievement address', () => {
  it('names the contest and the season', () => {
    expect(achievementSlug('winner', 'clip-creator-of-the-year', 2026)).toBe(
      'clip-creator-of-the-year-2026',
    );
    // Year is part of it because a creator can hold the same category twice.
    expect(achievementSlug('winner', 'clip-creator-of-the-year', 2027)).not.toBe(
      achievementSlug('winner', 'clip-creator-of-the-year', 2026),
    );
  });

  it('gives THE PALMA its own name rather than a category it does not have', () => {
    expect(achievementSlug('the_palma', '', 2027)).toBe(`${THE_PALMA_SLUG}-2027`);
    expect(achievementSlug('the_palma', 'ignored', 2027)).toBe('the-palma-2027');
  });

  it('reads an address back, and refuses anything that is not one', () => {
    expect(parseAchievementSlug('the-palma-2027')).toEqual({ what: 'the-palma', year: 2027 });
    expect(parseAchievementSlug('clip-creator-of-the-year-2026')).toEqual({
      what: 'clip-creator-of-the-year',
      year: 2026,
    });

    // The sibling routes under /creators/[slug] must never look like honours.
    expect(parseAchievementSlug('portrait')).toBeNull();
    expect(parseAchievementSlug('object')).toBeNull();
    expect(parseAchievementSlug('')).toBeNull();
    expect(parseAchievementSlug('2027')).toBeNull();
    expect(parseAchievementSlug('the-palma-27')).toBeNull();
  });

  it('round-trips every kind of honour', () => {
    for (const kind of HONOUR_KINDS) {
      const slug = achievementSlug(kind, 'trans-creator-of-the-year', 2026);
      expect(parseAchievementSlug(slug)?.year).toBe(2026);
      expect(
        matchesAchievementSlug(
          { kind, categorySlug: 'trans-creator-of-the-year', year: 2026 },
          slug,
        ),
      ).toBe(true);
    }
  });

  it('does not match a different season or a different contest', () => {
    const honour = {
      kind: 'winner' as const,
      categorySlug: 'live-creator-of-the-year',
      year: 2026,
    };
    expect(matchesAchievementSlug(honour, 'live-creator-of-the-year-2026')).toBe(true);
    expect(matchesAchievementSlug(honour, 'live-creator-of-the-year-2027')).toBe(false);
    expect(matchesAchievementSlug(honour, 'clip-creator-of-the-year-2026')).toBe(false);
  });
});

describe('when one address matches more than one honour', () => {
  it('ranks every kind, with THE PALMA above a win', () => {
    for (const kind of HONOUR_KINDS) {
      expect(HONOUR_STANDING[kind], kind).toBeGreaterThan(0);
    }
    expect(HONOUR_STANDING.the_palma).toBeGreaterThan(HONOUR_STANDING.winner);
    expect(HONOUR_STANDING.winner).toBeGreaterThan(HONOUR_STANDING.finalist);
    expect(HONOUR_STANDING.finalist).toBeGreaterThan(HONOUR_STANDING.shortlist);
  });

  it('gives every kind a distinct standing, so the sort is never arbitrary', () => {
    const values = HONOUR_KINDS.map((kind) => HONOUR_STANDING[kind]);
    expect(new Set(values).size).toBe(values.length);
  });
});
