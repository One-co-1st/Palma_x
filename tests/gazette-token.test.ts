import { describe, expect, it } from 'vitest';
import { readUnsubscribeToken, unsubscribeToken } from '@/lib/gazette-token';

const SECRET = 'a-test-signing-secret-that-is-long-enough';

/**
 * An unsubscribe link has to work for somebody who is not signed in, has lost
 * patience, and is one click from reporting PALMA as spam instead. It also has
 * to be impossible to guess for somebody else's address.
 */
describe('the unsubscribe link', () => {
  it('round-trips the subscription it was made for', () => {
    const token = unsubscribeToken(SECRET, 'sub_123');
    expect(readUnsubscribeToken(SECRET, token)).toBe('sub_123');
  });

  it('refuses a token signed with a different secret', () => {
    const token = unsubscribeToken('another-secret-entirely-long-enough', 'sub_123');
    expect(readUnsubscribeToken(SECRET, token)).toBeNull();
  });

  it('refuses a tampered id', () => {
    const token = unsubscribeToken(SECRET, 'sub_123');
    const tampered = token.replace('sub_123', 'sub_124');
    expect(readUnsubscribeToken(SECRET, tampered)).toBeNull();
  });

  it('refuses nonsense rather than throwing', () => {
    expect(readUnsubscribeToken(SECRET, '')).toBeNull();
    expect(readUnsubscribeToken(SECRET, 'no-dot-here')).toBeNull();
    expect(readUnsubscribeToken(SECRET, '.abc')).toBeNull();
    expect(readUnsubscribeToken(SECRET, 'sub_123.short')).toBeNull();
  });

  it('is stable, so a link in an old issue still works', () => {
    expect(unsubscribeToken(SECRET, 'sub_123')).toBe(unsubscribeToken(SECRET, 'sub_123'));
  });
});
