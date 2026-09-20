import { describe, expect, it } from 'vitest';
import {
  canResend,
  checkCodeState,
  CODE_PREFIX,
  CODE_TTL_SECONDS,
  mintCode,
  expiryFrom,
  isValidCodeFormat,
  MAX_ATTEMPTS,
  normaliseCode,
  RESEND_COOLDOWN_SECONDS,
} from '@/domain/verification-code';

const now = new Date('2027-01-15T12:00:00.000Z');

describe('verification codes', () => {
  it('accepts a code as a person would type it', () => {
    expect(normaliseCode(' PM56 17 ')).toBe('PM5617');
    expect(normaliseCode('PM-5617')).toBe('PM5617');
    expect(normaliseCode('pm5617')).toBe('PM5617');
    // Somebody reading only the figures off the screen still gets in.
    expect(normaliseCode('5617')).toBe('PM5617');

    expect(isValidCodeFormat('PM 5617')).toBe(true);
    expect(isValidCodeFormat('5617')).toBe(true);
    expect(isValidCodeFormat('PM561')).toBe(false);
    expect(isValidCodeFormat('PM56178')).toBe(false);
    expect(isValidCodeFormat('ABCDEF')).toBe(false);
    expect(isValidCodeFormat('XX5617')).toBe(false);
  });

  it('mints codes of the advertised shape', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = mintCode();
      expect(code).toMatch(/^PM\d{4}$/);
      expect(code.startsWith(CODE_PREFIX)).toBe(true);
      expect(isValidCodeFormat(code)).toBe(true);
    }
  });

  it('does not always mint the same code', () => {
    const drawn = new Set(Array.from({ length: 200 }, mintCode));
    expect(drawn.size).toBeGreaterThan(150);
  });

  it('expires', () => {
    const expiresAt = expiryFrom(now);
    expect(expiresAt.getTime() - now.getTime()).toBe(CODE_TTL_SECONDS * 1000);

    expect(checkCodeState({ expiresAt, attempts: 0, consumedAt: null }, now).ok).toBe(true);
    expect(
      checkCodeState(
        { expiresAt, attempts: 0, consumedAt: null },
        new Date(expiresAt.getTime() + 1),
      ),
    ).toMatchObject({ ok: false, code: 'expired' });
  });

  it('is single use', () => {
    expect(
      checkCodeState({ expiresAt: expiryFrom(now), attempts: 0, consumedAt: now }, now),
    ).toMatchObject({ ok: false, code: 'consumed' });
  });

  it('cannot be brute-forced', () => {
    expect(
      checkCodeState({ expiresAt: expiryFrom(now), attempts: MAX_ATTEMPTS, consumedAt: null }, now),
    ).toMatchObject({ ok: false, code: 'too_many_attempts' });

    expect(
      checkCodeState(
        { expiresAt: expiryFrom(now), attempts: MAX_ATTEMPTS - 1, consumedAt: null },
        now,
      ).ok,
    ).toBe(true);
  });

  it('rate-limits resending per address', () => {
    expect(canResend(null, now)).toBe(true);
    expect(canResend(new Date(now.getTime() - 1000), now)).toBe(false);
    expect(canResend(new Date(now.getTime() - RESEND_COOLDOWN_SECONDS * 1000), now)).toBe(true);
  });
});
