import { describe, expect, it } from 'vitest';
import {
  CAUTION_BELOW,
  disclosureFor,
  EDITORIAL_FIELDS,
  isPlainHttpsUrl,
  PRODUCT_CATEGORIES,
  publishObjections,
  SPONSOR_FIELDS,
  verdictReading,
  type EntryDraft,
} from '@/domain/product-library';

const SOUND: EntryDraft = {
  name: 'A Light',
  brand: 'A Brand',
  category: 'production',
  verdict: 8.5,
  bestFor: 'Solo sets in a small room.',
  strengths: ['Even output across the frame', 'Silent at full power'],
  limitations: ['The stand is not worth using', 'No battery option'],
  review:
    'Used across three months of shoots in a room too small for a proper key. It holds colour where cheaper panels drift, and the diffusion is good enough that a single unit reads as a window. The stand it ships with is genuinely poor and should be replaced immediately, which puts the real price a fair bit above the sticker.',
  externalUrl: 'https://example.com/a-light',
  sponsorId: null,
};

describe('the firewall', () => {
  it('shares no field between what a partner buys and what PALMA writes', () => {
    // The whole architecture in one assertion. If these two lists ever overlap,
    // a sponsorship has been given a route to a verdict.
    const overlap = (EDITORIAL_FIELDS as readonly string[]).filter((field) =>
      (SPONSOR_FIELDS as readonly string[]).includes(field),
    );
    expect(overlap).toEqual([]);
  });

  it('keeps the verdict on the editorial side', () => {
    expect(EDITORIAL_FIELDS).toContain('verdict');
    expect(EDITORIAL_FIELDS).toContain('strengths');
    expect(EDITORIAL_FIELDS).toContain('limitations');
    expect(SPONSOR_FIELDS).not.toContain('verdict');
  });

  it('composes the disclosure rather than letting it be typed', () => {
    const line = disclosureFor('A Brand');
    expect(line).toMatch(/A Brand is a PALMA partner/);
    expect(line).toMatch(/did not affect the verdict/);
    expect(line).toMatch(/not shown to partners before publication/);
  });

  it('says nothing where there is nothing to disclose', () => {
    // A disclosure on an unsponsored entry trains readers to ignore the ones
    // that matter.
    expect(disclosureFor(null)).toBeNull();
  });
});

describe('outbound links', () => {
  it('accepts a plain https address', () => {
    expect(isPlainHttpsUrl('https://example.com/thing')).toBe(true);
    expect(isPlainHttpsUrl('https://example.com')).toBe(true);
  });

  it('refuses anything carrying a query string', () => {
    // Every affiliate and tracking scheme in use works by appending
    // parameters, so a URL that cannot carry them cannot carry a commission.
    expect(isPlainHttpsUrl('https://example.com/thing?ref=palma')).toBe(false);
    expect(isPlainHttpsUrl('https://example.com/thing?utm_source=palma')).toBe(false);
    expect(isPlainHttpsUrl('https://example.com/thing?tag=palma-21')).toBe(false);
    expect(isPlainHttpsUrl('https://example.com/thing#aff')).toBe(false);
  });

  it('refuses http, credentials and nonsense', () => {
    expect(isPlainHttpsUrl('http://example.com')).toBe(false);
    expect(isPlainHttpsUrl('https://user:pass@example.com')).toBe(false);
    expect(isPlainHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isPlainHttpsUrl('not a url')).toBe(false);
  });
});

describe('publishing an entry', () => {
  it('raises nothing against a complete entry', () => {
    expect(publishObjections(SOUND)).toEqual([]);
  });

  it('refuses an entry with no limitations', () => {
    // The asymmetry is the point.
    const objections = publishObjections({ ...SOUND, limitations: [] });
    expect(objections).toHaveLength(1);
    expect(objections[0]).toMatch(/advertisement/);
  });

  it('treats whitespace as no limitation at all', () => {
    expect(publishObjections({ ...SOUND, limitations: ['   ', ''] })[0]).toMatch(/advertisement/);
  });

  it('refuses an entry with no verdict', () => {
    expect(publishObjections({ ...SOUND, verdict: null })[0]).toMatch(/does not publish listings/);
  });

  it('refuses a verdict outside the scale', () => {
    expect(publishObjections({ ...SOUND, verdict: 11 })).not.toEqual([]);
    expect(publishObjections({ ...SOUND, verdict: -1 })).not.toEqual([]);
  });

  it('refuses a review too short to be reasoning', () => {
    expect(publishObjections({ ...SOUND, review: 'Good light.' })[0]).toMatch(/200 characters/);
  });

  it('refuses an affiliate link at the point of publication', () => {
    const objections = publishObjections({
      ...SOUND,
      externalUrl: 'https://example.com/a-light?ref=palma',
    });
    expect(objections[0]).toMatch(/no affiliate or tracking links/i);
  });

  it('returns every objection at once', () => {
    const objections = publishObjections({
      name: '',
      brand: '',
      category: 'nonsense',
      verdict: null,
      bestFor: '',
      strengths: [],
      limitations: [],
      review: '',
      externalUrl: null,
      sponsorId: null,
    });
    expect(objections.length).toBeGreaterThanOrEqual(7);
  });
});

describe('the library stays a library', () => {
  it('offers few categories, each with a note', () => {
    // Six. A catalogue is a different and much worse thing.
    expect(PRODUCT_CATEGORIES.length).toBeLessThanOrEqual(8);
    expect(PRODUCT_CATEGORIES.every((entry) => entry.note.length > 10)).toBe(true);
  });

  it('reads a verdict aloud rather than leaving a bare number', () => {
    expect(verdictReading(9.2)).toMatch(/Exceptional/);
    expect(verdictReading(8.1)).toMatch(/Recommended/);
    expect(verdictReading(CAUTION_BELOW - 0.1)).toMatch(/Not recommended/);
  });

  it('publishes an unfavourable verdict rather than hiding it', () => {
    // A library that only publishes what it likes is a catalogue.
    expect(verdictReading(2)).toMatch(/on the record/);
  });
});
