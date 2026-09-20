import { describe, expect, it } from 'vitest';
import {
  CEREMONY_MONTH,
  CHAPTERS,
  chapter,
  chapterOn,
  daysUntilCeremony,
  defaultSeasonDates,
  inSeason,
  NOMINATIONS_MONTH,
  nextCeremony,
  PALMA_YEAR,
  OFF_SEASON_LENGTH_MONTHS,
  SEASON_CHAPTERS,
  SEASON_LENGTH_MONTHS,
  type Month,
} from '@/domain/calendar';

const MONTHS: Month[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('the PALMA year', () => {
  it('tiles all twelve months exactly once', () => {
    // The invariant that matters: no month belongs to two chapters, and no
    // month belongs to none. A hole here is a month nobody planned.
    const covered = MONTHS.map(
      (month) => CHAPTERS.filter((entry) => month >= entry.from && month <= entry.to).length,
    );
    expect(covered).toEqual(MONTHS.map(() => 1));
  });

  it('runs in calendar order with no overlap', () => {
    for (let index = 1; index < CHAPTERS.length; index += 1) {
      expect(CHAPTERS[index]!.from).toBe(CHAPTERS[index - 1]!.to + 1);
    }
    expect(CHAPTERS[0]!.from).toBe(1);
    expect(CHAPTERS.at(-1)!.to).toBe(12);
  });

  it('is four months of season and eight of institution', () => {
    expect(SEASON_LENGTH_MONTHS).toBe(4);
    expect(OFF_SEASON_LENGTH_MONTHS).toBe(8);

    const seasonMonths = SEASON_CHAPTERS.reduce(
      (sum, entry) => sum + (entry.to - entry.from + 1),
      0,
    );
    expect(seasonMonths).toBe(4);
  });

  it('puts the season in April to July', () => {
    expect(SEASON_CHAPTERS.map((entry) => entry.key)).toEqual([
      'nominations',
      'selection',
      'finalists',
      'the_palma',
    ]);
    expect(SEASON_CHAPTERS[0]!.from).toBe(4);
    expect(SEASON_CHAPTERS.at(-1)!.to).toBe(7);
  });

  it('anchors the ceremony in July and nominations in April', () => {
    expect(CEREMONY_MONTH).toBe(7);
    expect(NOMINATIONS_MONTH).toBe(4);
    expect(chapter('the_palma').from).toBe(CEREMONY_MONTH);
    expect(chapter('nominations').from).toBe(NOMINATIONS_MONTH);
  });

  it('reads from April when presented to a reader', () => {
    // The dial and the list must agree about where the year begins, or the
    // page contradicts itself in two places at once.
    expect(PALMA_YEAR.map((entry) => entry.key)).toEqual([
      'nominations',
      'selection',
      'finalists',
      'the_palma',
      'record',
      'building',
      'anticipation',
    ]);
    expect(PALMA_YEAR).toHaveLength(CHAPTERS.length);
    expect(new Set(PALMA_YEAR)).toEqual(new Set(CHAPTERS));
  });

  it('leaves the canonical calendar order untouched', () => {
    expect(CHAPTERS[0]!.key).toBe('anticipation');
  });

  it('never leaves an eight-month silence', () => {
    // The off-season is three chapters, not one. Each has its own public work,
    // which is the difference between breathing and disappearing.
    const off = CHAPTERS.filter((entry) => !entry.inSeason);
    expect(off).toHaveLength(3);
    expect(off.every((entry) => entry.line.length > 0)).toBe(true);
  });
});

describe('chapterOn', () => {
  it('reports the chapter a date falls in', () => {
    expect(chapterOn(new Date('2027-04-15T00:00:00Z')).key).toBe('nominations');
    expect(chapterOn(new Date('2027-05-02T00:00:00Z')).key).toBe('selection');
    expect(chapterOn(new Date('2027-06-30T23:59:59Z')).key).toBe('finalists');
    expect(chapterOn(new Date('2027-07-01T00:00:00Z')).key).toBe('the_palma');
    expect(chapterOn(new Date('2027-09-30T00:00:00Z')).key).toBe('record');
    expect(chapterOn(new Date('2027-12-31T00:00:00Z')).key).toBe('building');
    expect(chapterOn(new Date('2027-01-01T00:00:00Z')).key).toBe('anticipation');
  });

  it('agrees with inSeason at both boundaries', () => {
    expect(inSeason(new Date('2027-03-31T00:00:00Z'))).toBe(false);
    expect(inSeason(new Date('2027-04-01T00:00:00Z'))).toBe(true);
    expect(inSeason(new Date('2027-07-31T00:00:00Z'))).toBe(true);
    expect(inSeason(new Date('2027-08-01T00:00:00Z'))).toBe(false);
  });

  it('covers every month of a real year without throwing', () => {
    for (const month of MONTHS) {
      expect(() => chapterOn(new Date(Date.UTC(2027, month - 1, 15)))).not.toThrow();
    }
  });
});

describe('the next ceremony', () => {
  it('is this July when July has not happened', () => {
    expect(nextCeremony(new Date('2027-02-10T00:00:00Z'))).toEqual({
      year: 2027,
      at: new Date('2027-07-01T00:00:00Z'),
    });
  });

  it('rolls to next July once this one has', () => {
    expect(nextCeremony(new Date('2027-08-01T00:00:00Z')).year).toBe(2028);
    // The day of the ceremony itself is not "next".
    expect(nextCeremony(new Date('2027-07-01T12:00:00Z')).year).toBe(2028);
  });

  it('counts whole days, rounding a part-day up', () => {
    expect(daysUntilCeremony(new Date('2027-06-29T00:00:00Z'))).toBe(2);
    expect(daysUntilCeremony(new Date('2027-06-30T06:00:00Z'))).toBe(1);
  });
});

describe('default season dates', () => {
  it('derives April to July from the year alone', () => {
    const dates = defaultSeasonDates(2027);
    expect(dates.nominationsOpenAt.toISOString()).toBe('2027-04-01T00:00:00.000Z');
    expect(dates.nominationsCloseAt.toISOString()).toBe('2027-04-30T00:00:00.000Z');
    expect(dates.finalistsAt.toISOString()).toBe('2027-06-01T00:00:00.000Z');
    expect(dates.ceremonyAt.toISOString()).toBe('2027-07-01T00:00:00.000Z');
  });

  it('runs strictly forward', () => {
    const dates = defaultSeasonDates(2030);
    const order = [
      dates.nominationsOpenAt,
      dates.nominationsCloseAt,
      dates.finalistsAt,
      dates.ceremonyAt,
    ].map((date) => date.getTime());
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
