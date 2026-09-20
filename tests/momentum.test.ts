import { describe, expect, it } from 'vitest';
import {
  byUrgency,
  concentration,
  directionOf,
  MEANINGFUL_VOLUME,
  momentumFor,
  trendOf,
  type CategorySignal,
} from '@/domain/momentum';

function signal(overrides: Partial<CategorySignal> = {}): CategorySignal {
  return {
    categoryId: 'c1',
    name: 'Short Form',
    slug: 'short-form',
    current: 100,
    previous: 100,
    nominators: 80,
    spread: [20, 20, 20, 20, 20],
    ...overrides,
  };
}

describe('concentration', () => {
  it('reads a perfectly even category as fully broad', () => {
    const result = concentration([10, 10, 10, 10]);
    expect(result.candidacies).toBe(4);
    expect(result.topShare).toBeCloseTo(0.25);
    expect(result.effective).toBeCloseTo(4);
    expect(result.breadth).toBeCloseTo(1);
  });

  it('sees through a category that is really one creator', () => {
    // Eighteen names, one of whom holds nearly all of it. The candidacy count
    // says eighteen; the effective count is the number that is true.
    const result = concentration([900, ...Array<number>(17).fill(5)]);
    expect(result.candidacies).toBe(18);
    expect(result.topShare).toBeGreaterThan(0.9);
    expect(result.effective).toBeLessThan(1.3);
    expect(result.breadth).toBeLessThan(0.1);
  });

  it('reports no breadth for a single candidacy', () => {
    // Concentrated by definition rather than by behaviour, so it must not
    // report perfect breadth and must not report perfect concentration either.
    const result = concentration([50]);
    expect(result.candidacies).toBe(1);
    expect(result.topShare).toBe(1);
    expect(result.breadth).toBe(0);
  });

  it('ignores candidacies with no nominations', () => {
    expect(concentration([10, 10, 0, 0]).candidacies).toBe(2);
  });

  it('survives an empty category', () => {
    expect(concentration([])).toEqual({
      candidacies: 0,
      topShare: 0,
      effective: 0,
      breadth: 0,
    });
    expect(concentration([0, 0])).toEqual({
      candidacies: 0,
      topShare: 0,
      effective: 0,
      breadth: 0,
    });
  });
});

describe('trend', () => {
  it('measures change against the previous window', () => {
    expect(trendOf(150, 100)).toBeCloseTo(0.5);
    expect(trendOf(50, 100)).toBeCloseTo(-0.5);
    expect(trendOf(100, 100)).toBe(0);
  });

  it('does not divide by a previous window of nothing', () => {
    expect(trendOf(40, 0)).toBe(1);
    expect(trendOf(0, 0)).toBe(0);
    expect(Number.isFinite(trendOf(1, 0))).toBe(true);
  });
});

describe('direction', () => {
  it('gates on volume before percentage', () => {
    // 2 → 6 is a 200% rise and is worth nothing. A dashboard that calls this
    // "surging" teaches whoever reads it to ignore the word.
    expect(directionOf(6, 2)).toBe('quiet');
    expect(directionOf(2, 6)).toBe('quiet');
    expect(6 + 2).toBeLessThan(MEANINGFUL_VOLUME);
  });

  it('names real movement once there is enough of it', () => {
    expect(directionOf(200, 100)).toBe('surging');
    expect(directionOf(125, 100)).toBe('rising');
    expect(directionOf(105, 100)).toBe('steady');
    expect(directionOf(60, 100)).toBe('cooling');
  });

  it('treats a category arriving from nothing as surging, given volume', () => {
    expect(directionOf(60, 0)).toBe('surging');
  });
});

describe('the reading', () => {
  it('leads with concentration when one creator holds the category', () => {
    const row = momentumFor(signal({ current: 900, previous: 300, spread: [800, 40, 30, 20, 10] }));
    expect(row.direction).toBe('surging');
    // Surging, but the sentence must say the thing that is actually true.
    expect(row.reading).toMatch(/One creator holds/);
    expect(row.reading).toMatch(/not a category with interest/);
  });

  it('distinguishes broad growth from a single campaign', () => {
    const broad = momentumFor(
      signal({ current: 200, previous: 100, spread: [40, 40, 40, 40, 40] }),
    );
    expect(broad.reading).toMatch(/spread wide/);

    const narrow = momentumFor(
      signal({ current: 200, previous: 100, spread: [110, 40, 30, 15, 5] }),
    );
    expect(narrow.reading).toMatch(/one campaign/);
  });

  it('says plainly when a category is empty', () => {
    const row = momentumFor(signal({ current: 0, previous: 0, nominators: 0, spread: [] }));
    expect(row.reading).toMatch(/Nobody has nominated/);
  });

  it('says plainly when there is no contest', () => {
    const row = momentumFor(signal({ current: 40, previous: 38, spread: [40] }));
    expect(row.reading).toMatch(/single candidacy/);
  });

  it('never reports a trend it cannot support', () => {
    const row = momentumFor(signal({ current: 3, previous: 2, nominators: 2, spread: [3, 2] }));
    expect(row.direction).toBe('quiet');
    expect(row.reading).toMatch(/Too little to read|Too little traffic/);
  });

  it('does not announce a dominant creator on trivial volume', () => {
    // 60% of five nominations is not a finding about anything.
    const row = momentumFor(signal({ current: 5, previous: 4, nominators: 4, spread: [3, 2] }));
    expect(row.reading).not.toMatch(/One creator holds/);
  });

  it('does announce one once the volume supports it', () => {
    const row = momentumFor(
      signal({ current: 200, previous: 180, nominators: 150, spread: [150, 30, 20] }),
    );
    expect(row.reading).toMatch(/One creator holds 75%/);
  });
});

describe('momentumFor', () => {
  it('carries the raw counts through untouched', () => {
    const row = momentumFor(signal({ current: 120, previous: 80 }));
    expect(row.current).toBe(120);
    expect(row.previous).toBe(80);
    expect(row.change).toBe(40);
    expect(row.trend).toBeCloseTo(0.5);
  });

  it('measures reach as nominators per nomination', () => {
    expect(momentumFor(signal({ current: 100, nominators: 100 })).reach).toBe(1);
    expect(momentumFor(signal({ current: 100, nominators: 25 })).reach).toBeCloseTo(0.25);
    expect(momentumFor(signal({ current: 0, nominators: 0 })).reach).toBe(0);
  });
});

describe('reading order', () => {
  it('puts what changed above what is merely large', () => {
    const rows = [
      momentumFor(signal({ categoryId: 'big', name: 'Big', current: 900, previous: 880 })),
      momentumFor(signal({ categoryId: 'up', name: 'Up', current: 90, previous: 30 })),
      momentumFor(signal({ categoryId: 'down', name: 'Down', current: 30, previous: 90 })),
      momentumFor(
        signal({ categoryId: 'dead', name: 'Dead', current: 1, previous: 0, spread: [1] }),
      ),
    ];

    expect(byUrgency(rows).map((row) => row.name)).toEqual(['Up', 'Down', 'Big', 'Dead']);
  });

  it('does not mutate the array it is given', () => {
    const rows = [
      momentumFor(signal({ name: 'A', current: 10, previous: 90 })),
      momentumFor(signal({ name: 'B', current: 900, previous: 100 })),
    ];
    const before = rows.map((row) => row.name);
    byUrgency(rows);
    expect(rows.map((row) => row.name)).toEqual(before);
  });
});
