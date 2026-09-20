import { describe, expect, it } from 'vitest';
import { creatorLinksSchema } from '@/lib/validation/account';
import { newRecordSchema } from '@/lib/validation/claims';
import { CREATOR_EDITABLE_FIELDS } from '@/domain/claim';

/**
 * Starting a record when the archive holds none.
 *
 * The rules that matter here are not about form ergonomics: a record PALMA
 * cannot check is a record PALMA must not publish, and a creator's own words
 * must never arrive as editorial copy by accident.
 */
describe('starting a record', () => {
  const base = {
    route: 'request' as const,
    displayName: 'Rae Okafor',
    countryCode: 'GB',
    links: [{ label: 'YouTube', url: 'https://youtube.com/@raeokafor' }],
  };

  it('refuses a record with nothing to check', () => {
    const result = newRecordSchema.safeParse({ ...base, links: [] });
    expect(result.success).toBe(false);
  });

  it('takes either route', () => {
    expect(newRecordSchema.safeParse(base).success).toBe(true);
    expect(newRecordSchema.safeParse({ ...base, route: 'create' }).success).toBe(true);
  });

  it('refuses a route it does not offer', () => {
    expect(newRecordSchema.safeParse({ ...base, route: 'publish' }).success).toBe(false);
  });

  it('stops at six links', () => {
    const links = Array.from({ length: 7 }, (_, index) => ({
      label: `Link ${index}`,
      url: `https://example.com/${index}`,
    }));
    expect(newRecordSchema.safeParse({ ...base, links }).success).toBe(false);
  });
});

describe('keeping links current', () => {
  it('keeps at least one', () => {
    expect(creatorLinksSchema.safeParse({ links: [] }).success).toBe(false);
  });

  it('refuses a link that is not a link', () => {
    const result = creatorLinksSchema.safeParse({
      links: [{ label: 'YouTube', url: 'youtube.com/@rae' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts the set a creator may actually keep', () => {
    const result = creatorLinksSchema.safeParse({
      links: [
        { label: 'YouTube', url: 'https://youtube.com/@raeokafor' },
        { label: 'Instagram', url: 'https://instagram.com/raeokafor' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('is a field the claim rules already let a creator change', () => {
    expect(CREATOR_EDITABLE_FIELDS).toContain('links');
  });
});
