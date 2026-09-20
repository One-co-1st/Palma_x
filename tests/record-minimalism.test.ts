import { describe, expect, it } from 'vitest';
import {
  CLAIMED_RECORD_FIELDS,
  FORBIDDEN_ON_UNCLAIMED,
  UNCLAIMED_RECORD_FIELDS,
  excessOnUnclaimed,
  linkIsPublishableUnclaimed,
  minimiseUnclaimed,
} from '@/domain/record-minimalism';

/**
 * PALMA never collects information about an unclaimed creator merely because
 * it might be useful later.
 *
 * These assert the rule rather than describe it. Widening what an unclaimed
 * record may hold is a privacy decision, and it should have to break a test
 * and be argued for in a diff — not slip in because a form had a spare field.
 */
describe('what an unclaimed record may hold', () => {
  it('is four things, and each one carries its justification', () => {
    expect(UNCLAIMED_RECORD_FIELDS).toHaveLength(4);
    for (const field of UNCLAIMED_RECORD_FIELDS) {
      expect(field.why.length, `${field.key} has no justification`).toBeGreaterThan(20);
      expect(field.source.length, `${field.key} does not say where it came from`).toBeGreaterThan(
        10,
      );
    }
  });

  it('holds a name, a country, links and honours — and nothing else', () => {
    expect(UNCLAIMED_RECORD_FIELDS.map((field) => field.key).sort()).toEqual([
      'countryCode',
      'displayName',
      'honours',
      'links',
    ]);
  });

  it('never holds a city, however the record was created', () => {
    // The one people argue about. A country is what an awards archive
    // organises by; a town is where somebody lives.
    expect(FORBIDDEN_ON_UNCLAIMED).toContain('city');
    expect(UNCLAIMED_RECORD_FIELDS.map((field) => field.key)).not.toContain('city');
  });

  it('never holds anything a nominator wrote about them', () => {
    expect(FORBIDDEN_ON_UNCLAIMED).toContain('nominationText');
  });

  it('never holds a characterisation written by anyone but the creator', () => {
    for (const field of ['biography', 'headline'] as const) {
      expect(FORBIDDEN_ON_UNCLAIMED).toContain(field);
    }
  });

  it('never holds anything from which an age or an identity could be read', () => {
    for (const field of ['dateOfBirth', 'age', 'legalName', 'verificationData'] as const) {
      expect(FORBIDDEN_ON_UNCLAIMED).toContain(field);
    }
  });

  it('keeps the forbidden list disjoint from what an unclaimed record holds', () => {
    const held = new Set<string>(UNCLAIMED_RECORD_FIELDS.map((field) => field.key));
    for (const forbidden of FORBIDDEN_ON_UNCLAIMED) {
      expect(held.has(forbidden), `${forbidden} is both held and forbidden`).toBe(false);
    }
  });
});

describe('minimising a draft', () => {
  const full = {
    displayName: 'Ama Mensah',
    countryCode: 'GH',
    city: 'Accra',
    headline: 'Documentary shorts on informal economies',
    biography: 'A long biography somebody else wrote.',
    pronouns: 'she/her',
    websiteUrl: 'https://example.com',
    portraitUrl: 'https://example.com/portrait.jpg',
  };

  it('keeps the name and the country', () => {
    const minimal = minimiseUnclaimed(full);
    expect(minimal.displayName).toBe('Ama Mensah');
    expect(minimal.countryCode).toBe('GH');
  });

  it('drops everything an unclaimed record must not hold', () => {
    const minimal = minimiseUnclaimed(full);
    expect(minimal.city).toBeNull();
    expect(minimal.headline).toBeNull();
    expect(minimal.biography).toBeNull();
    expect(minimal.pronouns).toBeNull();
    expect(minimal.portraitUrl).toBeNull();
  });

  it('leaves nothing behind for the excess check to find', () => {
    expect(excessOnUnclaimed(minimiseUnclaimed(full))).toEqual([]);
  });

  it('names what it would drop, so an operator can be told', () => {
    expect(excessOnUnclaimed(full).sort()).toEqual(
      ['biography', 'city', 'headline', 'portraitUrl', 'pronouns'].sort(),
    );
  });

  it('finds nothing in a draft that was already minimal', () => {
    expect(excessOnUnclaimed({ displayName: 'Ama Mensah', countryCode: 'GH' })).toEqual([]);
  });
});

describe('links on an unclaimed record', () => {
  it('accepts a creator’s own professional presence', () => {
    expect(linkIsPublishableUnclaimed('https://youtube.com/@amamensah')).toBe(true);
    expect(linkIsPublishableUnclaimed('https://ama-mensah.co.uk/work')).toBe(true);
  });

  it('refuses anything that is not a web link', () => {
    expect(linkIsPublishableUnclaimed('javascript:alert(1)')).toBe(false);
    expect(linkIsPublishableUnclaimed('mailto:ama@example.com')).toBe(false);
    expect(linkIsPublishableUnclaimed('not a url at all')).toBe(false);
  });

  it('refuses a link carrying a query string', () => {
    // Usually a search, a referral or a tracking parameter rather than a
    // stable professional presence — and a tracking parameter is somebody
    // else's data about the creator riding in on a field that looks harmless.
    expect(linkIsPublishableUnclaimed('https://example.com/search?q=ama+mensah')).toBe(false);
    expect(linkIsPublishableUnclaimed('https://youtube.com/@ama?si=trackingtoken')).toBe(false);
  });
});

describe('a claimed record, by contrast', () => {
  it('lets the creator publish more about themselves than PALMA ever would', () => {
    expect(CLAIMED_RECORD_FIELDS.length).toBeGreaterThan(UNCLAIMED_RECORD_FIELDS.length);
    for (const field of ['city', 'headline', 'biography', 'pronouns'] as const) {
      expect(CLAIMED_RECORD_FIELDS as readonly string[]).toContain(field);
    }
  });
});
