import { describe, expect, it } from 'vitest';
import {
  constantTimeEquals,
  hashIdentifier,
  hashPassword,
  hmac,
  randomToken,
  sha256,
  verifyPassword,
} from '@/lib/crypto';
import { passwordSchema } from '@/lib/auth/password-policy';
import { consumeRateLimit, RATE_LIMITS, __resetMemoryLimiter } from '@/server/rate-limit';

describe('passwords', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const stored = await hashPassword('a-perfectly-fine-password');
    expect(await verifyPassword('a-perfectly-fine-password', stored)).toBe(true);
    expect(await verifyPassword('a-perfectly-fine-passwore', stored)).toBe(false);
  });

  it('salts, so the same password never produces the same hash', async () => {
    const a = await hashPassword('identical-password-here');
    const b = await hashPassword('identical-password-here');
    expect(a).not.toBe(b);
    expect(await verifyPassword('identical-password-here', b)).toBe(true);
  });

  it('refuses malformed stored hashes rather than throwing', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$abc$00')).toBe(false);
  });

  it('normalises unicode so an equivalent password still verifies', async () => {
    const stored = await hashPassword('café-password-2027');
    expect(await verifyPassword('café-password-2027', stored)).toBe(true);
  });

  it('enforces the password policy', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('password').success).toBe(false);
    expect(passwordSchema.safeParse('alllowercaseletters').success).toBe(false);
    expect(passwordSchema.safeParse('Correct-Horse-Battery-9').success).toBe(true);
  });
});

describe('digests and tokens', () => {
  it('produces stable digests and unique tokens', () => {
    expect(sha256('palma')).toBe(sha256('palma'));
    expect(randomToken()).not.toBe(randomToken());
  });

  it('compares in constant time without throwing on length mismatch', () => {
    expect(constantTimeEquals('abc', 'abc')).toBe(true);
    expect(constantTimeEquals('abc', 'abcd')).toBe(false);
  });

  it('hashes identifiers rather than storing them', () => {
    const hashed = hashIdentifier('203.0.113.7', 'secret');
    expect(hashed).not.toContain('203.0.113');
    expect(hashed).toHaveLength(32);
    expect(hashIdentifier('203.0.113.7', 'secret')).toBe(hashed);
    expect(hashIdentifier('203.0.113.7', 'other-secret')).not.toBe(hashed);
  });

  it('keys HMACs to the secret', () => {
    expect(hmac('a', 'message')).not.toBe(hmac('b', 'message'));
  });
});

describe('rate limiting', () => {
  it('allows up to the limit, then refuses with a retry hint', async () => {
    __resetMemoryLimiter();
    const rule = RATE_LIMITS.nominationCode;

    for (let attempt = 0; attempt < rule.limit; attempt += 1) {
      const result = await consumeRateLimit(rule, 'identity-a');
      expect(result.allowed, `attempt ${attempt}`).toBe(true);
    }

    const blocked = await consumeRateLimit(rule, 'identity-a');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('keeps buckets and identities separate', async () => {
    __resetMemoryLimiter();
    await consumeRateLimit(RATE_LIMITS.signIn, 'identity-a');
    const other = await consumeRateLimit(RATE_LIMITS.signIn, 'identity-b');
    expect(other.remaining).toBe(RATE_LIMITS.signIn.limit - 1);
  });
});
