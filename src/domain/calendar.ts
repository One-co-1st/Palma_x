/**
 * The PALMA year.
 *
 * Twelve months make one PALMA year. Four of them are the season; the other
 * eight are the institution.
 *
 * Two decisions are encoded here and both are deliberate.
 *
 * **The season is four months, not six.** Six months of a twelve-month year
 * spent asking people to nominate and vote is not an awards cycle, it is a
 * permanent campaign, and a permanent campaign is how an award becomes
 * background noise. Four months is closer to how an established cycle actually
 * operates: it opens, it builds, it concludes, and then it stops.
 *
 * **The season is not tied to the calendar year.** The year *number* matters —
 * it is what the record is filed under, and PALMA 2027 must mean one
 * unambiguous thing for ever. The *event* sits in the middle of the year, and
 * THE PALMA is conferred in July. January-to-December awards all land in the
 * same exhausted fortnight as everyone else's; a July ceremony belongs to the
 * summer, and an institution that owns a season of the year owns an
 * anticipation that rebuilds itself every twelve months.
 *
 * What the eight months are not is a disappearance. They are the Journal, the
 * archive, creator features, partnerships, next season's categories — the
 * work that makes the four months mean something. PALMA has a season, then it
 * breathes, then it comes back.
 */

/** 1 = January, as `Date#getMonth() + 1` gives. */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type ChapterKey =
  'anticipation' | 'nominations' | 'selection' | 'finalists' | 'the_palma' | 'record' | 'building';

export type Chapter = {
  key: ChapterKey;
  /** Where it sits in the year, inclusive at both ends. */
  from: Month;
  to: Month;
  /** The months as a label: "April", "August — September". */
  months: string;
  /** Short enough to sit on a rail. */
  label: string;
  /** What the institution is doing. One line. */
  line: string;
  /** The longer form, for the page that explains the year. */
  detail: string;
  /** In season, or building it. */
  inSeason: boolean;
};

/**
 * The seven chapters, in the order the year runs them.
 *
 * They tile the twelve months exactly — no gaps, no overlaps — and a test holds
 * that invariant, because a calendar with a hole in it is how a month arrives
 * with nobody having decided what happens in it.
 */
export const CHAPTERS: Chapter[] = [
  {
    key: 'anticipation',
    from: 1,
    to: 3,
    months: 'January, March',
    label: 'Anticipation',
    line: 'The season ahead takes shape in public.',
    detail:
      'Categories for the coming season are published, the panel is announced, and the Journal turns toward what the year might hold. Nothing is open yet. That is the point: by the time April arrives, people already know it is coming.',
    inSeason: false,
  },
  {
    key: 'nominations',
    from: 4,
    to: 4,
    months: 'April',
    label: 'Nominations',
    line: 'Four weeks. Anyone may nominate; no account required.',
    detail:
      'Audience nominations open across every category, each verified by a one-time code to a working email address. Eligibility screening runs alongside them rather than after, so a creator who cannot be considered is not left in a list for a month pretending otherwise.',
    inSeason: true,
  },
  {
    key: 'selection',
    from: 5,
    to: 5,
    months: 'May',
    label: 'Selection',
    line: 'Nominations close. PALMA investigates; the panel reads.',
    detail:
      'The quiet month, and the one the institution is actually judged on. Candidacies are checked, conflicts are declared, evidence is gathered, and the panel works through it to a shortlist. Nothing is published while it happens.',
    inSeason: true,
  },
  {
    key: 'finalists',
    from: 6,
    to: 6,
    months: 'June',
    label: 'Finalist season',
    line: 'Finalists announced. Four weeks of the work being looked at.',
    detail:
      'The finalists are named and the month belongs to them: editorial coverage, interviews, the work itself put in front of people who had not seen it. Judging continues underneath. Being a PALMA finalist is meant to be worth something on its own.',
    inSeason: true,
  },
  {
    key: 'the_palma',
    from: 7,
    to: 7,
    months: 'July',
    label: 'THE PALMA',
    line: 'Final judging, winner validation, the ceremony.',
    detail:
      'Scores close, winners are validated, and the ceremony confers them. THE PALMA is the last thing conferred on the night. Every honour enters the Roll of Honour with a signed verification record before the room empties.',
    inSeason: true,
  },
  {
    key: 'record',
    from: 8,
    to: 9,
    months: 'August, September',
    label: 'The record',
    line: 'Winners, PaROH, and the writing that follows them.',
    detail:
      'The season becomes an archive. Winners are profiled, the Roll of Honour takes the year in, the Journal runs the features that a four-week ceremony month has no room for, and partners see what their association actually bought.',
    inSeason: false,
  },
  {
    key: 'building',
    from: 10,
    to: 12,
    months: 'October, December',
    label: 'Building',
    line: 'Next season is designed, not merely scheduled.',
    detail:
      'Categories are revised against what the last season revealed, partnerships are agreed, the panel is rebuilt, and the editorial calendar for the year is set. The least visible quarter and the one that decides whether the next season is any good.',
    inSeason: false,
  },
];

/**
 * The same seven chapters in the order the PALMA year runs them — April first.
 *
 * `CHAPTERS` is in calendar order because that is what makes it checkable: the
 * months tile 1 to 12 with no gaps. But nobody experiences the year starting in
 * January. The institution's year opens when nominations do, and anything that
 * presents the rhythm to a reader should say so, or the dial and the list
 * disagree about where the year begins.
 */
export const PALMA_YEAR: Chapter[] = [...CHAPTERS].sort(
  (a, b) => ((a.from - 4 + 12) % 12) - ((b.from - 4 + 12) % 12),
);

/** The four months that are the season. */
export const SEASON_CHAPTERS = CHAPTERS.filter((chapter) => chapter.inSeason);

/** The month THE PALMA is conferred in. The anchor everything else hangs off. */
export const CEREMONY_MONTH: Month = 7;

/** The month nominations open in. */
export const NOMINATIONS_MONTH: Month = 4;

export const SEASON_LENGTH_MONTHS = SEASON_CHAPTERS.length;
export const OFF_SEASON_LENGTH_MONTHS = 12 - SEASON_LENGTH_MONTHS;

/** Which chapter a date falls in. Every date falls in exactly one. */
export function chapterOn(date: Date = new Date()): Chapter {
  const month = (date.getUTCMonth() + 1) as Month;
  const found = CHAPTERS.find((chapter) => month >= chapter.from && month <= chapter.to);
  // The chapters tile the year, so this cannot be reached — but a calendar
  // that silently returns undefined is worse than one that says so.
  if (!found) throw new Error(`No PALMA chapter covers month ${month}.`);
  return found;
}

export function chapter(key: ChapterKey): Chapter {
  const found = CHAPTERS.find((entry) => entry.key === key);
  if (!found) throw new Error(`Unknown PALMA chapter: ${key}`);
  return found;
}

/** Is the institution in season on this date? */
export function inSeason(date: Date = new Date()): boolean {
  return chapterOn(date).inSeason;
}

/**
 * The season's four key dates, derived from the year rather than stored.
 *
 * A season row in the database carries its own dates, because a real season
 * can move for a real reason — a venue, a clash, a year PALMA decides to open
 * a week late. This is what those dates default to, and what the public
 * calendar shows for a season that does not exist yet.
 *
 * Months are the anchor; the day of the month is deliberately the first, so
 * "April" means April and nobody has to remember a date.
 */
export function defaultSeasonDates(year: number): {
  nominationsOpenAt: Date;
  nominationsCloseAt: Date;
  finalistsAt: Date;
  ceremonyAt: Date;
} {
  return {
    nominationsOpenAt: utc(year, 4, 1),
    nominationsCloseAt: utc(year, 4, 30),
    finalistsAt: utc(year, 6, 1),
    ceremonyAt: utc(year, 7, 1),
  };
}

/**
 * The next ceremony from a given moment.
 *
 * July of this year if it has not happened; July of next year if it has. This
 * is what a countdown on the public site counts down to, and the reason the
 * site never has to be told which season is next.
 */
export function nextCeremony(from: Date = new Date()): { year: number; at: Date } {
  const year = from.getUTCFullYear();
  const thisYear = utc(year, CEREMONY_MONTH, 1);
  if (from.getTime() < thisYear.getTime()) return { year, at: thisYear };
  return { year: year + 1, at: utc(year + 1, CEREMONY_MONTH, 1) };
}

/** Whole days until the next ceremony. Rounded up: a partial day still counts. */
export function daysUntilCeremony(from: Date = new Date()): number {
  const { at } = nextCeremony(from);
  return Math.ceil((at.getTime() - from.getTime()) / 86_400_000);
}

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}
