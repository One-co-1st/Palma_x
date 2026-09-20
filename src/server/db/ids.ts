import { randomBytes } from 'node:crypto';

/**
 * Prisma-compatible enough string IDs.
 *
 * Existing rows keep their historical cuid values. New rows only need a unique,
 * URL-safe, non-sequential string; changing the whole table's ID format would
 * be a data migration, which this project deliberately is not.
 */
export function createId(): string {
  const time = Date.now().toString(36);
  const random = randomBytes(10).toString('base64url');
  return `c${time}${random}`.slice(0, 25);
}
