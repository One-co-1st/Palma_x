/**
 * Email verification for nominations.
 *
 * A nomination is not a nomination until the address behind it has answered a
 * code. No password, no account, no profile — one code, once.
 */

/**
 * The shape of a code: PM and four figures, as in PM5617.
 *
 * The prefix is the point. A bare run of characters could have come from
 * anywhere, and a nominator who has asked for one code all year should be able
 * to glance at an inbox and know which message is PALMA's. It also survives
 * being read down a phone, which a run of mixed letters does not.
 *
 * Four figures is ten thousand codes, and that is deliberate rather than
 * careless: a code lives fifteen minutes, dies after five wrong guesses
 * (MAX_ATTEMPTS) and is further capped per connection by the nominationVerify
 * rate limit. Five tries against ten thousand is one chance in two thousand,
 * and what it would win is a single nomination reason attached to a candidacy,
 * which decides nothing. The attempt ceiling is what holds here, not the size
 * of the code space, which is why MAX_ATTEMPTS must not be raised.
 */
export const CODE_PREFIX = 'PM';
export const CODE_DIGITS = 4;
export const CODE_LENGTH = CODE_PREFIX.length + CODE_DIGITS;
export const CODE_TTL_SECONDS = 15 * 60;
export const MAX_ATTEMPTS = 5;
/** A fresh code may be requested only this often, per address. */
export const RESEND_COOLDOWN_SECONDS = 60;

export const CODE_PATTERN = new RegExp(`^${CODE_PREFIX}\\d{${CODE_DIGITS}}$`);

/**
 * Mint one. `crypto.getRandomValues` rather than `Math.random`, and a modulo
 * of a 32-bit draw rather than four separate digits, so the bias is one part
 * in four hundred thousand rather than anything a person could exploit.
 */
export function mintCode(): string {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  const figures = String(buffer[0]! % 10 ** CODE_DIGITS).padStart(CODE_DIGITS, '0');
  return `${CODE_PREFIX}${figures}`;
}

export function isValidCodeFormat(value: string): boolean {
  return CODE_PATTERN.test(normaliseCode(value));
}

/** People type codes with spaces and dashes. Accept it. */
export function normaliseCode(value: string): string {
  // Upper-cased so a code typed "pm5617" is the same code, and the prefix is
  // forgiven entirely for anyone who types only the figures they can see.
  const bare = value.replace(/[\s-]/g, '').trim().toUpperCase();
  return /^\d+$/.test(bare) ? `${CODE_PREFIX}${bare}` : bare;
}

export type CodeState = {
  expiresAt: Date | string;
  attempts: number;
  consumedAt: Date | string | null;
};

export type CodeCheck =
  | { ok: true }
  | { ok: false; code: 'expired' | 'consumed' | 'too_many_attempts' | 'mismatch'; message: string };

/**
 * Everything about a stored code except the comparison itself, which must be
 * done in constant time against the stored hash by the caller.
 */
export function checkCodeState(state: CodeState, now = new Date()): CodeCheck {
  if (state.consumedAt) {
    return {
      ok: false,
      code: 'consumed',
      message: 'That code has already been used. Request a new one.',
    };
  }

  if (new Date(state.expiresAt).getTime() < now.getTime()) {
    return { ok: false, code: 'expired', message: 'That code has expired. Request a new one.' };
  }

  if (state.attempts >= MAX_ATTEMPTS) {
    return {
      ok: false,
      code: 'too_many_attempts',
      message: 'Too many attempts. Request a new code.',
    };
  }

  return { ok: true };
}

export function expiryFrom(now = new Date()): Date {
  return new Date(now.getTime() + CODE_TTL_SECONDS * 1000);
}

export function canResend(lastSentAt: Date | string | null, now = new Date()): boolean {
  if (!lastSentAt) return true;
  return now.getTime() - new Date(lastSentAt).getTime() >= RESEND_COOLDOWN_SECONDS * 1000;
}
