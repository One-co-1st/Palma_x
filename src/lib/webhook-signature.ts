import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Svix signatures, which is the format Resend sends.
 *
 * The signed payload is `id.timestamp.body`, and the header carries one or more
 * space-separated `v1,<base64>` values — more than one because a secret being
 * rotated means two are briefly valid at once.
 *
 * This guards an endpoint that can mark any address undeliverable, so it is
 * kept separate from the route and tested directly: forging a delivery event
 * would otherwise be a way to cut somebody off from their own account.
 */
export function signatureIsValid(input: {
  secret: string;
  id: string;
  timestamp: string;
  body: string;
  header: string;
}): boolean {
  // The secret is issued as `whsec_<base64>`; the decoded bytes are what signs.
  let key: Buffer;
  try {
    key = Buffer.from(input.secret.replace(/^whsec_/, ''), 'base64');
  } catch {
    return false;
  }
  if (key.length === 0) return false;

  const expected = Buffer.from(
    createHmac('sha256', key)
      .update(`${input.id}.${input.timestamp}.${input.body}`)
      .digest('base64'),
  );

  return input.header
    .split(' ')
    .map((part) => part.split(',')[1] ?? '')
    .filter(Boolean)
    .some((candidate) => {
      const offered = Buffer.from(candidate);
      // Length is checked first because timingSafeEqual throws on a mismatch —
      // and a length difference is not a secret worth protecting.
      return offered.length === expected.length && timingSafeEqual(offered, expected);
    });
}

/** The signature PALMA would expect, used by the tests and nothing else. */
export function signPayload(secret: string, id: string, timestamp: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  return `v1,${createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')}`;
}
