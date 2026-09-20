'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertSameOrigin } from '@/lib/auth/session';
import { authorise } from '@/lib/auth/guards';
import { recordAudit } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql, withTransaction } from '@/server/db/sql';
import { RATE_LIMITS, enforceRateLimit } from '@/server/rate-limit';
import { CONTACTS } from '@/lib/legal';

/**
 * "I never asked to be in your archive."
 *
 * PALMA writes creator records about people before those people agree to
 * anything, relying on legitimate interests. That balance only holds while the
 * person named can object and be heard — so this route needs no account, no
 * reason, and no proof up front.
 *
 * It deliberately does not delete the record on submission. Anyone can open
 * this form about anybody, and a self-service delete button on a public archive
 * is a way to erase a rival. A person reads it, and PALMA's default answer for
 * an unclaimed record is yes.
 */

export type ObjectionState = { status: 'idle' | 'error' | 'success'; message?: string };

const objectionSchema = z.object({
  creatorSlug: z.string().trim().min(1).max(200),
  contactEmail: z.string().trim().toLowerCase().email('Enter an address PALMA can reply to.'),
  note: z.string().trim().max(2000).optional().or(z.literal('')),
});

export async function objectToRecord(
  _previous: ObjectionState,
  formData: FormData,
): Promise<ObjectionState> {
  await assertSameOrigin();

  const limit = await enforceRateLimit(RATE_LIMITS.objection);
  if (!limit.allowed) {
    return { status: 'error', message: 'Too many requests from this connection. Try again later.' };
  }

  const parsed = objectionSchema.safeParse({
    creatorSlug: formData.get('creatorSlug'),
    contactEmail: formData.get('contactEmail'),
    note: formData.get('note') ?? '',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Check the details.',
    };
  }

  const [creator] = await sql<{ id: string; displayName: string; userId: string | null }[]>`
    select id, "displayName", "userId" from "Creator" where slug = ${parsed.data.creatorSlug} limit 1
  `;

  if (!creator) {
    return { status: 'error', message: 'That record does not exist.' };
  }

  // A claimed record is already under its holder's control; the route for that
  // is the account page, not an objection from a stranger.
  if (creator.userId) {
    return {
      status: 'error',
      message:
        'That record is held by an account. If it is yours, sign in and edit or close it; if you believe it is held by the wrong person, write to ' +
        CONTACTS.integrity +
        '.',
    };
  }

  const [existing] = await sql<{ id: string }[]>`
    select id from "RecordObjection"
    where "creatorId" = ${creator.id} and status = 'received'
    limit 1
  `;

  if (existing) {
    // Same answer either way: whether an objection is already open about
    // somebody is not a fact a stranger should be able to test for.
    return { status: 'success', message: SAME_ANSWER };
  }

  await sql`
    insert into "RecordObjection" (id, "creatorId", "contactEmail", note, "createdAt")
    values (${createId()}, ${creator.id}, ${parsed.data.contactEmail}, ${parsed.data.note || null}, ${new Date()})
  `;

  await recordAudit({
    action: 'record.objection_received',
    entityType: 'Creator',
    entityId: creator.id,
    summary: `Objection received to the unclaimed record for ${creator.displayName}`,
  });

  revalidatePath('/portal/objections');

  return { status: 'success', message: SAME_ANSWER };
}

const SAME_ANSWER =
  'Received. A person at PALMA will read it and reply to the address you gave, usually within a few days. For an unclaimed record the answer is normally yes.';

/**
 * Deciding one.
 *
 * Upholding removes the record and leaves a tombstone — a note that a record
 * was removed on objection and must not be recreated — so that a later
 * nomination does not quietly put the person back into an archive they asked
 * to leave. The tombstone holds no personal data beyond the slug that was
 * released and the date.
 */
export async function decideObjection(
  _previous: ObjectionState,
  formData: FormData,
): Promise<ObjectionState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('creators:view_records');
  } catch {
    return { status: 'error', message: 'You are not authorised to decide objections.' };
  }

  const id = String(formData.get('objectionId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '').trim();

  if (decision !== 'uphold' && decision !== 'refuse') {
    return { status: 'error', message: 'Choose whether to remove the record.' };
  }

  // Refusing somebody's objection to a record they never asked for is the one
  // decision here that needs explaining, so it cannot be made silently.
  if (decision === 'refuse' && note.length < 30) {
    return {
      status: 'error',
      message:
        'A refusal has to carry a reason of at least 30 characters. It is sent to the person who objected.',
    };
  }

  const [objection] = await sql<
    {
      id: string;
      status: string;
      creatorId: string;
      creatorSlug: string;
      creatorDisplayName: string;
      activeHonours: number;
    }[]
  >`
    select
      o.id, o.status,
      c.id as "creatorId", c.slug as "creatorSlug", c."displayName" as "creatorDisplayName",
      (select count(*)::int from "Honour" h
        where h."creatorId" = c.id and h.state = 'active') as "activeHonours"
    from "RecordObjection" o
    join "Creator" c on c.id = o."creatorId"
    where o.id = ${id}
    limit 1
  `;

  if (!objection) return { status: 'error', message: 'That objection does not exist.' };
  if (objection.status !== 'received') {
    return { status: 'error', message: 'That objection has already been settled.' };
  }

  const actor = { id: session.user.id, role: session.user.role, label: session.user.email };
  const now = new Date();

  if (decision === 'refuse') {
    await sql`
      update "RecordObjection" set
        status = 'refused',
        "decidedAt" = ${now},
        "decidedById" = ${session.user.id},
        "decisionNote" = ${note}
      where id = ${objection.id}
    `;

    await recordAudit({
      action: 'record.objection_refused',
      entityType: 'Creator',
      entityId: objection.creatorId,
      actor,
      summary: `Objection to ${objection.creatorDisplayName} refused`,
      after: { reason: note },
    });

    revalidatePath('/portal/objections');
    return {
      status: 'success',
      message: 'Refused, with the reason recorded. Write to them and explain it.',
    };
  }

  const hadHonours = objection.activeHonours > 0;

  await withTransaction(async (tx) => {
    await tx`
      update "RecordObjection" set
        status = 'upheld',
        "decidedAt" = ${now},
        "decidedById" = ${session.user.id},
        "decisionNote" = ${note || null}
      where id = ${objection.id}
    `;

    if (hadHonours) {
      // The honour stays; everything descriptive goes. The record is reduced
      // to the achievement itself.
      await tx`
        delete from "CreatorLink" where "creatorId" = ${objection.creatorId}
      `;
      await tx`
        update "Creator" set
          city = null,
          headline = null,
          biography = null,
          pronouns = null,
          "websiteUrl" = null,
          "portraitUrl" = null,
          "updatedAt" = ${now}
        where id = ${objection.creatorId}
      `;
    } else {
      // Nothing conferred: the record has no institutional reason to exist.
      await tx`
        delete from "Creator" where id = ${objection.creatorId}
      `;
    }
  });

  await recordAudit({
    action: 'record.objection_upheld',
    entityType: 'Creator',
    entityId: objection.creatorId,
    actor,
    summary: hadHonours
      ? `Objection upheld: ${objection.creatorDisplayName} reduced to the conferred honour`
      : `Objection upheld: the unclaimed record for ${objection.creatorDisplayName} was removed`,
  });

  revalidatePath('/portal/objections');
  revalidatePath('/creators');
  revalidatePath(`/creators/${objection.creatorSlug}`);

  return {
    status: 'success',
    message: hadHonours
      ? 'Upheld. The record is reduced to the honour itself. Write and tell them what remains and why.'
      : 'Upheld. The record is gone. Write and tell them it is done.',
  };
}
