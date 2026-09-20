import { describe, expect, it } from 'vitest';
import { fieldErrors, nominationDraftSchema } from '@/lib/validation/nomination';
import { MAX_REASON_LENGTH, MIN_REASON_LENGTH } from '@/domain/nomination';

const valid = {
  creatorSlug: 'maya-rivers',
  categorySlug: 'best-independent-creator',
  reason: 'Six years of researched work published on schedule, without an agency behind her.',
  email: 'Someone@Example.com',
};

describe('the nomination form', () => {
  it('accepts a complete nomination and normalises the address', () => {
    const result = nominationDraftSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('someone@example.com');
  });

  it('asks for a creator, a category, a reason and an email — and nothing else', () => {
    const keys = Object.keys(nominationDraftSchema.shape);
    expect(keys).toEqual(
      expect.arrayContaining(['creatorSlug', 'categorySlug', 'reason', 'email']),
    );
    // No account, no evidence, no attachments, no statement of any length.
    for (const absent of ['password', 'evidence', 'attachments', 'statement', 'name']) {
      expect(keys).not.toContain(absent);
    }
  });

  it('requires each of the four fields', () => {
    for (const key of ['creatorSlug', 'categorySlug', 'reason', 'email'] as const) {
      const result = nominationDraftSchema.safeParse({ ...valid, [key]: '' });
      expect(result.success, key).toBe(false);
    }
  });

  it('keeps the reason short', () => {
    expect(nominationDraftSchema.safeParse({ ...valid, reason: 'Great.' }).success).toBe(false);
    expect(
      nominationDraftSchema.safeParse({ ...valid, reason: 'x'.repeat(MAX_REASON_LENGTH + 1) })
        .success,
    ).toBe(false);
    expect(
      nominationDraftSchema.safeParse({ ...valid, reason: 'x'.repeat(MIN_REASON_LENGTH) }).success,
    ).toBe(true);
  });

  it('refuses an address it cannot send a code to', () => {
    const result = nominationDraftSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toHaveProperty('email');
  });

  it('treats the honeypot as a field that must stay empty', () => {
    expect(nominationDraftSchema.safeParse({ ...valid, website: 'http://spam' }).success).toBe(
      false,
    );
    expect(nominationDraftSchema.safeParse({ ...valid, website: '' }).success).toBe(true);
  });

  it('carries the referral slug when one is present', () => {
    const result = nominationDraftSchema.safeParse({ ...valid, referralSlug: 'maya-rivers' });
    expect(result.success && result.data.referralSlug).toBe('maya-rivers');
  });
});
