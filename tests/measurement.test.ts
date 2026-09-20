import { describe, expect, it } from 'vitest';
import {
  dayOf,
  isCountable,
  MAX_TERM_LENGTH,
  MEASUREMENT_STATEMENT,
  normalisePath,
  normaliseTerm,
  REFUSED,
  SURFACES,
  surfaceOf,
} from '@/domain/measurement';

describe('what PALMA will count', () => {
  it('counts the public surfaces', () => {
    for (const path of [
      '/',
      '/the-palma',
      '/paroh',
      '/paroh/2027',
      '/winners',
      '/finalists',
      '/awards',
      '/awards/2027',
      '/categories',
      '/categories/short-form',
      '/creators',
      '/creators/ama-x',
      '/journal',
      '/journal/a-piece',
      '/nominate',
      '/verify',
      '/verify/PM-2027-ABC123',
      '/about',
      '/about/judging',
      '/press',
      '/contact',
      '/legal',
      '/legal/privacy',
      '/lists/awards',
    ]) {
      expect(isCountable(path), path).toBe(true);
    }
  });

  it('refuses every signed-in surface', () => {
    // An operator's browser should never announce which internal page they are
    // on, and a counter is not a reason to start.
    for (const path of [
      '/admin',
      '/admin/audience',
      '/portal',
      '/portal/claims',
      '/judge',
      '/creator',
      '/account',
      '/dossier',
      '/api/count',
    ]) {
      expect(isCountable(path), path).toBe(false);
    }
  });

  it('refuses anything that is not a page PALMA has', () => {
    // The endpoint is unauthenticated by necessity, so this is what stops it
    // being a way to write arbitrary rows into the database.
    for (const path of [
      '/../../etc/passwd',
      '/creators/' + 'a'.repeat(200),
      '/paroh/not-a-year',
      '/journal/a piece with spaces',
      '/' + 'x'.repeat(300),
      'https://example.com/paroh',
      '/categories/<script>',
    ]) {
      expect(isCountable(path), path).toBe(false);
    }
  });
});

describe('normalising a path', () => {
  it('drops the query string and the fragment', () => {
    // A query string can carry a token from an email or something a visitor
    // pasted, so it never reaches the counter.
    expect(normalisePath('/paroh?q=someone%40example.com')).toBe('/paroh');
    expect(normalisePath('/creators?token=abc123')).toBe('/creators');
    expect(normalisePath('/the-palma#considerations')).toBe('/the-palma');
  });

  it('collapses a trailing slash so one page is one row', () => {
    expect(normalisePath('/paroh/')).toBe('/paroh');
    expect(normalisePath('/')).toBe('/');
  });

  it('refuses anything that is not a path', () => {
    expect(normalisePath('')).toBeNull();
    expect(normalisePath('paroh')).toBeNull();
    expect(normalisePath('https://elsewhere.example/paroh')).toBeNull();
  });
});

describe('surfaces', () => {
  it('assigns every countable path to exactly one surface', () => {
    const paths = [
      '/the-palma',
      '/paroh/2027',
      '/winners',
      '/finalists',
      '/journal/x',
      '/nominate',
    ];
    for (const path of paths) {
      const matched = SURFACES.filter((surface) => surface.match(path));
      // 'other' matches everything, so a correctly-assigned path matches
      // exactly two: its own surface and the catch-all after it.
      expect(matched[0]!.key, path).not.toBe('other');
    }
  });

  it('groups the Journal and Kulture together as readership', () => {
    expect(surfaceOf('/journal')).toBe('kulture');
    expect(surfaceOf('/journal/a-piece')).toBe('kulture');
    expect(surfaceOf('/kulture')).toBe('kulture');
    expect(surfaceOf('/kulture/product-library')).toBe('kulture');
  });

  it('separates the honours PALMA is asked about most', () => {
    expect(surfaceOf('/the-palma')).toBe('the_palma');
    expect(surfaceOf('/paroh')).toBe('paroh');
    expect(surfaceOf('/paroh/2027')).toBe('paroh');
    expect(surfaceOf('/winners')).toBe('winners');
    expect(surfaceOf('/finalists')).toBe('finalists');
  });

  it('falls through to elsewhere rather than throwing', () => {
    expect(surfaceOf('/something-nobody-planned')).toBe('other');
  });

  it('ends with a catch-all, so no path is ever unassigned', () => {
    expect(SURFACES[SURFACES.length - 1]!.key).toBe('other');
    expect(SURFACES[SURFACES.length - 1]!.match('/anything')).toBe(true);
  });
});

describe('search terms', () => {
  it('normalises whitespace and case so one search is one row', () => {
    expect(normaliseTerm('  Ama   X  ')).toBe('ama x');
    expect(normaliseTerm('AMA X')).toBe('ama x');
  });

  it('never keeps anything with an address in it', () => {
    // Somebody searching their own email address is disclosing an identifier,
    // not searching the archive.
    expect(normaliseTerm('someone@example.com')).toBeNull();
    expect(normaliseTerm('contact me at a@b.co')).toBeNull();
  });

  it('refuses a long paste', () => {
    expect(normaliseTerm('a'.repeat(MAX_TERM_LENGTH + 1))).toBeNull();
    expect(normaliseTerm('a'.repeat(MAX_TERM_LENGTH))).toHaveLength(MAX_TERM_LENGTH);
  });

  it('refuses an empty search', () => {
    expect(normaliseTerm('')).toBeNull();
    expect(normaliseTerm('   ')).toBeNull();
  });
});

describe('the day', () => {
  it('is a UTC date with no time on it', () => {
    const day = dayOf(new Date('2027-07-01T23:47:12.345Z'));
    expect(day.toISOString()).toBe('2027-07-01T00:00:00.000Z');
  });

  it('puts two moments on the same day in the same bucket', () => {
    const morning = dayOf(new Date('2027-07-01T00:00:01Z'));
    const night = dayOf(new Date('2027-07-01T23:59:59Z'));
    expect(morning.getTime()).toBe(night.getTime());
  });
});

describe('what PALMA refuses to report', () => {
  it('names each refusal with a reason', () => {
    const terms = REFUSED.map((entry) => entry.term);
    expect(terms).toContain('Unique visitors');
    expect(terms).toContain('Returning visitors');
    expect(terms).toContain('Direct traffic');
    expect(terms).toContain('Social mentions');
    expect(terms).toContain('Press mentions');
    expect(REFUSED.every((entry) => entry.why.length > 40)).toBe(true);
  });

  it('states the line in one sentence', () => {
    expect(MEASUREMENT_STATEMENT).toMatch(/does not identify or track individual visitors/);
  });
});
