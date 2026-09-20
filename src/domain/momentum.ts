/**
 * Category momentum.
 *
 * What are people actually interested in? Not what PALMA hoped they would be
 * interested in when it wrote the categories in October.
 *
 * **This is an internal instrument and must stay one.** Nomination counts are
 * never published, never ranked in public, and decide no outcome — nothing in
 * the judging path reads any number in this file. What momentum is *for* is
 * category design: which categories to keep, which to split, which to retire,
 * and which turned out to be the one everybody actually came for. That is a
 * decision made once a year by people, with this in front of them.
 *
 * The reason it is not a public leaderboard is not squeamishness. A visible
 * count is a target, and a target is farmed: the moment a creator can see they
 * are forty behind, the nomination form stops measuring interest and starts
 * measuring who is best organised. The count is only honest while nobody can
 * see it.
 *
 * Everything here is a pure function of counts so it can be tested against
 * cases that would take a season to produce for real.
 */

/** Below this much traffic, a percentage change is noise dressed as a signal. */
export const MEANINGFUL_VOLUME = 12;

export type Direction = 'surging' | 'rising' | 'steady' | 'cooling' | 'quiet';

export const DIRECTION_LABEL: Record<Direction, string> = {
  surging: 'Surging',
  rising: 'Rising',
  steady: 'Steady',
  cooling: 'Cooling',
  quiet: 'Quiet',
};

export type CategorySignal = {
  categoryId: string;
  name: string;
  slug: string;
  /** Counted nominations in the window being looked at. */
  current: number;
  /** Counted nominations in the immediately preceding window of equal length. */
  previous: number;
  /** Distinct verified nominators in the current window. */
  nominators: number;
  /** Nominations per candidacy in the category, in any order. */
  spread: number[];
};

export type CategoryMomentum = CategorySignal & {
  change: number;
  /** Relative change against the previous window. 0.5 is "half again". */
  trend: number;
  direction: Direction;
  candidacies: number;
  /** The largest candidacy's share of the category, 0–1. */
  topShare: number;
  /**
   * How many candidacies the category *effectively* has — the inverse
   * Herfindahl. Eighteen creators where one holds 90% of the nominations is
   * effectively one creator, and this says so.
   */
  effective: number;
  /** `effective / candidacies`, 0–1. High means broad interest. */
  breadth: number;
  /** How many people nominated, per nomination. Low means a few keen people. */
  reach: number;
  /** One honest sentence about what this category is doing. */
  reading: string;
};

/**
 * Concentration within a category.
 *
 * A category with six hundred nominations that all point at one creator is not
 * a popular category; it is one creator with a mailing list. The inverse
 * Herfindahl index is the standard way to say that in a number, and it has the
 * useful property of being readable out loud: "effectively three of eighteen".
 */
export function concentration(spread: number[]): {
  candidacies: number;
  topShare: number;
  effective: number;
  breadth: number;
} {
  const counts = spread.filter((count) => count > 0);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const candidacies = counts.length;

  if (total === 0 || candidacies === 0) {
    return { candidacies, topShare: 0, effective: 0, breadth: 0 };
  }

  const shares = counts.map((count) => count / total);
  const herfindahl = shares.reduce((sum, share) => sum + share * share, 0);
  const effective = 1 / herfindahl;

  return {
    candidacies,
    topShare: Math.max(...shares),
    effective,
    // A single candidacy is perfectly concentrated by definition rather than by
    // behaviour, so it reports no breadth rather than full breadth.
    breadth: candidacies > 1 ? effective / candidacies : 0,
  };
}

/**
 * Relative change against the previous window.
 *
 * A category that went from nothing to something has no meaningful percentage,
 * so it reports 1 — "all of it is new" — rather than infinity.
 */
export function trendOf(current: number, previous: number): number {
  if (previous > 0) return (current - previous) / previous;
  return current > 0 ? 1 : 0;
}

export function directionOf(current: number, previous: number): Direction {
  // The volume gate comes first. Two nominations becoming six is a 200% rise
  // and means nothing at all, and a dashboard that shouts about it trains
  // whoever reads it to ignore the ones that matter.
  if (current + previous < MEANINGFUL_VOLUME) return 'quiet';

  const trend = trendOf(current, previous);
  if (trend >= 0.5) return 'surging';
  if (trend >= 0.15) return 'rising';
  if (trend <= -0.35) return 'cooling';
  return 'steady';
}

/**
 * The sentence an operator actually reads.
 *
 * Momentum on its own is misleading in both directions — a surging category
 * held by one creator is not a healthy category, and a flat category spread
 * across thirty is not a dying one. The reading says which of those is
 * happening, because the number alone will be misread and the sentence will not.
 */
export function readingFor(input: {
  direction: Direction;
  candidacies: number;
  topShare: number;
  effective: number;
  breadth: number;
  current: number;
  nominators: number;
}): string {
  const { direction, candidacies, topShare, effective, breadth, current, nominators } = input;

  if (candidacies === 0) return 'No candidacies. Nobody has nominated in this category at all.';
  if (direction === 'quiet' && current === 0) {
    return 'Nothing this window. If a second season does this, the category is not wanted.';
  }

  const effectively = `effectively ${effective.toFixed(1)} of ${candidacies}`;

  // One creator holding most of a category is the finding that matters most,
  // and it outranks the trend — it is true whether the category is rising or
  // falling, and it is the one that should change what PALMA does next.
  //
  // It is gated on volume like everything else here. Three nominations against
  // two is a 60% share of nothing, and announcing that somebody "holds the
  // category" on five nominations is exactly the over-reading this instrument
  // exists to avoid.
  if (current >= MEANINGFUL_VOLUME && topShare >= 0.6 && candidacies > 1) {
    return `One creator holds ${Math.round(topShare * 100)}% of this category, ${effectively}. This is a creator with an audience, not a category with interest.`;
  }

  if (candidacies === 1) {
    return 'A single candidacy. There is no contest here yet, whatever the volume says.';
  }

  // Broad means two things at once: the field is genuinely in play *and* no
  // single creator dominates it. Breadth alone calls a category with a 50%
  // leader "spread wide", which is not what anybody reading that phrase would
  // understand by it.
  const broad = breadth >= 0.5 && topShare < 0.4;

  switch (direction) {
    case 'surging':
      return broad
        ? `Rising fast and spread wide, ${effectively}. This is real interest, and probably a category to protect.`
        : `Rising fast but narrow, ${effectively}. Check whether one campaign is doing the work before reading it as interest.`;
    case 'rising':
      return broad
        ? `Building steadily across the field, ${effectively}.`
        : `Building, but concentrated, ${effectively}.`;
    case 'cooling':
      return `Down on the previous window, ${effectively}. Worth asking whether it was ever a category or a moment.`;
    case 'steady':
      return broad
        ? `Holding, with interest spread across the field, ${effectively}.`
        : `Holding, but the interest sits with a few, ${effectively}.`;
    case 'quiet':
      return nominators <= 3
        ? `Almost nobody: ${nominators} nominator${nominators === 1 ? '' : 's'} this window. Too little to read.`
        : 'Too little traffic this window to read a trend from.';
  }
}

/** Turn raw counts into the thing a person can act on. */
export function momentumFor(signal: CategorySignal): CategoryMomentum {
  const { candidacies, topShare, effective, breadth } = concentration(signal.spread);
  const direction = directionOf(signal.current, signal.previous);

  return {
    ...signal,
    change: signal.current - signal.previous,
    trend: trendOf(signal.current, signal.previous),
    direction,
    candidacies,
    topShare,
    effective,
    breadth,
    reach: signal.current > 0 ? signal.nominators / signal.current : 0,
    reading: readingFor({
      direction,
      candidacies,
      topShare,
      effective,
      breadth,
      current: signal.current,
      nominators: signal.nominators,
    }),
  };
}

/**
 * Order for reading, which is not order by size.
 *
 * The categories an operator needs to look at are the ones that changed, in
 * either direction. A large category that did exactly what it did last month
 * is the least interesting row on the page and belongs at the bottom, however
 * big it is.
 */
export function byUrgency(rows: CategoryMomentum[]): CategoryMomentum[] {
  const weight: Record<Direction, number> = {
    surging: 0,
    cooling: 1,
    rising: 2,
    steady: 3,
    quiet: 4,
  };

  return [...rows].sort((a, b) => {
    const byDirection = weight[a.direction] - weight[b.direction];
    if (byDirection !== 0) return byDirection;
    return Math.abs(b.change) - Math.abs(a.change);
  });
}
