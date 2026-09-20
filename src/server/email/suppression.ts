import 'server-only';
import { createId } from '@/server/db/ids';
import { sql } from '@/server/db/sql';

/**
 * Addresses PALMA has stopped writing to.
 *
 * A bounce is the provider telling us an address does not work. Continuing to
 * send to it is how a sending domain's reputation is destroyed, which ends
 * with PALMA's mail landing in spam for everybody else — so the first job of a
 * bounce is to stop the next message.
 *
 * It is deliberately not a punishment. Nothing here blocks an account, refuses
 * a claim or affects a record; it governs one thing, which is whether an
 * envelope is worth putting in the post. Proving the address again clears it.
 */

export type SuppressionReason = 'hard_bounce' | 'soft_bounce' | 'complaint';

/** Is PALMA still willing to write to this address? */
export async function isSuppressed(
  email: string,
): Promise<{ reason: string; detail: string } | null> {
  const [row] = await sql<{ reason: string; detail: string | null; clearedAt: Date | null }[]>`
    select reason, detail, "clearedAt"
    from "SuppressedAddress"
    where email = ${email.toLowerCase()}
    limit 1
  `;

  if (!row || row.clearedAt) return null;
  return { reason: row.reason, detail: row.detail ?? '' };
}

export async function suppress(input: {
  email: string;
  reason: SuppressionReason;
  detail?: string | null;
  deliveryId?: string | null;
}): Promise<void> {
  const email = input.email.toLowerCase();

  await sql`
    insert into "SuppressedAddress" (id, email, reason, detail, "deliveryId")
    values (${createId()}, ${email}, ${input.reason}, ${input.detail ?? null}, ${input.deliveryId ?? null})
    on conflict (email) do update set
      reason = excluded.reason,
      detail = excluded.detail,
      "deliveryId" = excluded."deliveryId",
      "clearedAt" = null,
      "clearedById" = null
  `;
}

/**
 * Letting an address back in.
 *
 * Two routes, and both are legitimate: an operator who has spoken to the
 * person, or the person themselves proving the address still works — which
 * confirming a subscription or a password reset already does.
 */
export async function clearSuppression(email: string, clearedById?: string | null): Promise<void> {
  await sql`
    update "SuppressedAddress"
    set "clearedAt" = ${new Date()}, "clearedById" = ${clearedById ?? null}
    where email = ${email.toLowerCase()} and "clearedAt" is null
  `;
}
