import { constantTimeEquals, hmac } from '@/lib/crypto';

/**
 * The unsubscribe link.
 *
 * Derived rather than stored: `<id>.<signature>`, where the signature is an
 * HMAC of the subscription id under PALMA's signing secret. That gives a link
 * which is stable for the life of the subscription, unguessable without the
 * secret, and requires no second column to keep in step with the first.
 *
 * It is deliberately *not* the confirmation token. Confirming proves somebody
 * owns an address; leaving should require nothing at all beyond the link in
 * the email they are trying to escape.
 */

const PREFIX = 'gazette:unsubscribe:';

export function unsubscribeToken(secret: string, subscriptionId: string): string {
  return `${subscriptionId}.${hmac(secret, PREFIX + subscriptionId).slice(0, 32)}`;
}

export function readUnsubscribeToken(secret: string, token: string): string | null {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const id = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!id || signature.length !== 32) return null;

  const expected = hmac(secret, PREFIX + id).slice(0, 32);
  return constantTimeEquals(signature, expected) ? id : null;
}
