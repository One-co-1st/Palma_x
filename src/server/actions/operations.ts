'use server';

import { revalidatePath } from 'next/cache';
import { authorise } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/session';
import { randomToken, sha256 } from '@/lib/crypto';
import { closureIsBlocked, caseReference } from '@/domain/verification-case';
import {
  creatorRecordSchema,
  internalNoteSchema,
  verificationCaseSchema,
  verificationDecisionSchema,
} from '@/lib/validation/claims';
import { fieldErrors } from '@/lib/validation/nomination';
import { recordAudit } from '@/server/audit';
import { sendRecordPublished, sendVerificationOutcome } from '@/server/email/messages';
import { createId } from '@/server/db/ids';
import { sql, withTransaction } from '@/server/db/sql';
import { slugify } from '@/lib/utils';

export type OperationsState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  errors?: Record<string, string>;
};

/**
 * Create or enrich a creator record.
 *
 * PALMA writes records before creators claim them — that is how the archive
 * gets ahead of the industry rather than waiting on it. Everything set here is
 * *public* information. Anything a member of staff wants to say privately goes
 * in an internal note, which is a different table with a different audience.
 */
export async function saveCreatorRecord(
  _previous: OperationsState,
  formData: FormData,
): Promise<OperationsState> {
  await assertSameOrigin();

  const creatorId = String(formData.get('creatorId') ?? '').trim();
  const permission = creatorId ? 'editorial:edit_creator' : 'editorial:create_creator';

  let session;
  try {
    session = await authorise(permission);
  } catch {
    return { status: 'error', message: 'You are not authorised to change creator records.' };
  }

  const parsed = creatorRecordSchema.safeParse({
    creatorId,
    displayName: formData.get('displayName'),
    countryCode: formData.get('countryCode'),
    city: formData.get('city') ?? '',
    headline: formData.get('headline') ?? '',
    biography: formData.get('biography') ?? '',
    websiteUrl: formData.get('websiteUrl') ?? '',
    isPublished: formData.get('isPublished') === 'on',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the record.',
      errors: fieldErrors(parsed.error),
    };
  }

  const data = {
    displayName: parsed.data.displayName,
    countryCode: parsed.data.countryCode,
    city: parsed.data.city || null,
    headline: parsed.data.headline || null,
    biography: parsed.data.biography || null,
    websiteUrl: parsed.data.websiteUrl || null,
    isPublished: parsed.data.isPublished,
  };

  if (creatorId) {
    type BeforeRow = {
      slug: string;
      displayName: string;
      countryCode: string;
      city: string | null;
      headline: string | null;
      biography: string | null;
      websiteUrl: string | null;
      isPublished: boolean;
      userId: string | null;
      userEmail: string | null;
    };
    const [before] = await sql<BeforeRow[]>`
      select
        c.slug,
        c."displayName",
        c."countryCode",
        c.city,
        c.headline,
        c.biography,
        c."websiteUrl",
        c."isPublished",
        u.id as "userId",
        u.email as "userEmail"
      from "Creator" c
      left join "User" u on u.id = c."userId"
      where c.id = ${creatorId}
      limit 1
    `;

    if (!before) return { status: 'error', message: 'That record does not exist.' };

    await sql`
      update "Creator"
      set
        "displayName" = ${data.displayName},
        "countryCode" = ${data.countryCode},
        city = ${data.city},
        headline = ${data.headline},
        biography = ${data.biography},
        "websiteUrl" = ${data.websiteUrl},
        "isPublished" = ${data.isPublished}
      where id = ${creatorId}
    `;

    await recordAudit({
      action: 'creator.record_updated',
      entityType: 'Creator',
      entityId: creatorId,
      actor: { id: session.user.id, role: session.user.role, label: session.user.email },
      summary: `${before.displayName} updated`,
      before: {
        slug: before.slug,
        displayName: before.displayName,
        countryCode: before.countryCode,
        city: before.city,
        headline: before.headline,
        biography: before.biography,
        websiteUrl: before.websiteUrl,
        isPublished: before.isPublished,
        user: before.userId ? { id: before.userId, email: before.userEmail } : null,
      },
      after: data,
    });

    // Publication is the one edit the creator is waiting on, so it is the one
    // that writes to them. Every other change is editorial housekeeping and
    // does not need an email about it.
    const justPublished = !before.isPublished && data.isPublished;
    if (justPublished && before.userId && before.userEmail) {
      await sendRecordPublished({
        to: before.userEmail,
        userId: before.userId,
        creatorId,
        creatorName: data.displayName,
        slug: before.slug,
      });
    }

    revalidatePath(`/creators/${before.slug}`);
    revalidatePath(`/portal/creators/${before.slug}`);
    revalidatePath('/creators');
    return { status: 'success', message: 'Record updated. The change is in the audit log.' };
  }

  // A new record needs a slug that does not collide with an existing one.
  const base = slugify(parsed.data.displayName);
  let slug = base;
  for (
    let attempt = 2;
    (await sql<{ id: string }[]>`select id from "Creator" where slug = ${slug} limit 1`).length > 0;
    attempt += 1
  ) {
    slug = `${base}-${attempt}`;
  }

  const [created] = await sql<{ id: string; displayName: string }[]>`
    insert into "Creator" (
      id, slug, "displayName", "countryCode", city, headline, biography, "websiteUrl", "isPublished"
    ) values (
      ${createId()},
      ${slug},
      ${data.displayName},
      ${data.countryCode},
      ${data.city},
      ${data.headline},
      ${data.biography},
      ${data.websiteUrl},
      ${data.isPublished}
    )
    returning id, "displayName"
  `;

  if (!created) return { status: 'error', message: 'The record could not be created.' };

  await recordAudit({
    action: 'creator.record_created',
    entityType: 'Creator',
    entityId: created.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${created.displayName} created as an unclaimed record`,
    after: data,
  });

  revalidatePath('/portal/creators');
  return { status: 'success', message: `Created ${created.displayName}, unclaimed.` };
}

/** Staff-only working notes. Never public, never shown to the creator. */
export async function addInternalNote(
  _previous: OperationsState,
  formData: FormData,
): Promise<OperationsState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('editorial:write_internal_note');
  } catch {
    return { status: 'error', message: 'You are not authorised to write internal notes.' };
  }

  const parsed = internalNoteSchema.safeParse({
    creatorId: formData.get('creatorId'),
    body: formData.get('body'),
  });

  if (!parsed.success) return { status: 'error', message: 'Write the note.' };

  const [creator] = await sql<{ id: string; slug: string; displayName: string }[]>`
    select id, slug, "displayName"
    from "Creator"
    where id = ${parsed.data.creatorId}
    limit 1
  `;

  if (!creator) return { status: 'error', message: 'That record does not exist.' };

  await sql`
    insert into "CreatorNote" (id, "creatorId", "authorId", body)
    values (${createId()}, ${creator.id}, ${session.user.id}, ${parsed.data.body})
  `;

  await recordAudit({
    action: 'creator.internal_note_added',
    entityType: 'Creator',
    entityId: creator.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Internal note added to ${creator.displayName}`,
  });

  revalidatePath(`/portal/creators/${creator.slug}`);
  return { status: 'success', message: 'Note added. Staff only. It is never published.' };
}

/** Open a manual age-assurance case. */
export async function openVerificationCase(
  _previous: OperationsState,
  formData: FormData,
): Promise<OperationsState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('verification:review_manual');
  } catch {
    return { status: 'error', message: 'You are not authorised to open verification cases.' };
  }

  const parsed = verificationCaseSchema.safeParse({
    creatorId: formData.get('creatorId'),
    reason: formData.get('reason'),
    mediaReceived: formData.get('mediaReceived') === 'on',
  });

  if (!parsed.success) return { status: 'error', message: 'Choose why this needs a person.' };

  const [creator] = await sql<{ id: string; displayName: string }[]>`
    select id, "displayName"
    from "Creator"
    where id = ${parsed.data.creatorId}
    limit 1
  `;

  if (!creator) return { status: 'error', message: 'That record does not exist.' };

  const year = new Date().getUTCFullYear();
  const [countRow] = await sql<{ count: number }[]>`
    select count(*)::int as count from "VerificationCase"
  `;
  const sequence = (countRow?.count ?? 0) + 1;

  const [opened] = await sql<{ id: string; reference: string }[]>`
    insert into "VerificationCase" (
      id, reference, "creatorId", reason, "mediaReceivedAt"
    ) values (
      ${createId()},
      ${caseReference(year, sequence)},
      ${creator.id},
      ${parsed.data.reason},
      ${parsed.data.mediaReceived ? new Date() : null}
    )
    returning id, reference
  `;

  if (!opened) return { status: 'error', message: 'The case could not be opened.' };

  await recordAudit({
    action: 'verification.case_opened',
    entityType: 'VerificationCase',
    entityId: opened.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${opened.reference} opened for ${creator.displayName}`,
    after: { reason: parsed.data.reason, mediaReceived: parsed.data.mediaReceived },
  });

  revalidatePath('/portal/verification');
  return { status: 'success', message: `Opened ${opened.reference}.` };
}

/**
 * Decide a verification case.
 *
 * What PALMA keeps is a status, a provider reference and a result hash. The
 * documents, if any were ever received, are destroyed as part of closing —
 * and the case cannot be closed while they are still held, so nothing is left
 * sitting in a workspace with no prompt to remove it.
 */
export async function decideVerificationCase(
  _previous: OperationsState,
  formData: FormData,
): Promise<OperationsState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('verification:review_manual');
  } catch {
    return { status: 'error', message: 'You are not authorised to decide verification cases.' };
  }

  const parsed = verificationDecisionSchema.safeParse({
    caseId: formData.get('caseId'),
    outcome: formData.get('outcome'),
    providerReference: formData.get('providerReference') ?? '',
    note: formData.get('note') ?? '',
    mediaDeleted: formData.get('mediaDeleted') === 'on',
  });

  if (!parsed.success) return { status: 'error', message: 'Choose an outcome.' };

  type CaseRow = {
    id: string;
    reference: string;
    creatorId: string;
    decidedAt: Date | null;
    mediaReceivedAt: Date | null;
    mediaDeletedAt: Date | null;
    creatorSlug: string;
    creatorDisplayName: string;
    userId: string | null;
    userEmail: string | null;
  };
  const [record] = await sql<CaseRow[]>`
    select
      v.id,
      v.reference,
      v."creatorId",
      v."decidedAt",
      v."mediaReceivedAt",
      v."mediaDeletedAt",
      c.slug as "creatorSlug",
      c."displayName" as "creatorDisplayName",
      u.id as "userId",
      u.email as "userEmail"
    from "VerificationCase" v
    join "Creator" c on c.id = v."creatorId"
    left join "User" u on u.id = c."userId"
    where v.id = ${parsed.data.caseId}
    limit 1
  `;

  if (!record) return { status: 'error', message: 'That case does not exist.' };
  if (record.decidedAt) return { status: 'error', message: 'That case is already decided.' };

  const actor = { id: session.user.id, role: session.user.role, label: session.user.email };
  const now = new Date();

  if (parsed.data.outcome === 'request_information') {
    await sql`
      update "VerificationCase"
      set status = 'awaiting_information', "decisionNote" = ${parsed.data.note || null}
      where id = ${record.id}
    `;

    if (record.userId && record.userEmail) {
      await sendVerificationOutcome({
        to: record.userEmail,
        userId: record.userId,
        creatorId: record.creatorId,
        outcome: 'more_needed',
        note: parsed.data.note || null,
      });
    }

    revalidatePath('/portal/verification');
    return { status: 'success', message: 'Information requested. The case stays open.' };
  }

  // Narrowed above: 'request_information' has already returned.
  const outcome: 'verified' | 'refused' | 'abandoned' = parsed.data.outcome;

  const mediaDeletedAt = record.mediaDeletedAt ?? (parsed.data.mediaDeleted ? now : null);

  const blocked = closureIsBlocked({
    receivedAt: record.mediaReceivedAt?.toISOString() ?? null,
    deletedAt: mediaDeletedAt?.toISOString() ?? null,
  });

  if (blocked) return { status: 'error', message: blocked };

  // The hash binds the outcome to this case without carrying anything about
  // the person. It is a receipt, not a copy.
  const resultHash =
    outcome === 'verified'
      ? sha256(`${record.reference}:${record.creatorId}:${now.toISOString()}:${randomToken(8)}`)
      : null;

  await withTransaction(async (tx) => {
    await tx`
      update "VerificationCase"
      set
        status = ${outcome},
        "decidedAt" = ${now},
        "decidedById" = ${session.user.id},
        "decisionNote" = ${parsed.data.note || null},
        "providerReference" = ${parsed.data.providerReference || null},
        "resultHash" = ${resultHash},
        "mediaDeletedAt" = ${mediaDeletedAt}
      where id = ${record.id}
    `;

    if (outcome === 'verified') {
      await tx`
        insert into "CreatorVerification" (
          id, "creatorId", status, provider, "providerReference", method, "verifiedAt", "lastCheckedAt"
        ) values (
          ${createId()},
          ${record.creatorId},
          'verified',
          'palma_manual',
          ${parsed.data.providerReference || record.reference},
          'manual_review',
          ${now},
          ${now}
        )
        on conflict ("creatorId") do update set
          status = 'verified',
          provider = 'palma_manual',
          "providerReference" = excluded."providerReference",
          method = 'manual_review',
          "verifiedAt" = excluded."verifiedAt",
          "lastCheckedAt" = excluded."lastCheckedAt",
          "failureCode" = null
      `;
    }

    if (outcome === 'refused') {
      await tx`
        insert into "CreatorVerification" (
          id, "creatorId", status, "lastCheckedAt", "failureCode"
        ) values (
          ${createId()},
          ${record.creatorId},
          'failed',
          ${now},
          'manual_refusal'
        )
        on conflict ("creatorId") do update set
          status = 'failed',
          "lastCheckedAt" = excluded."lastCheckedAt",
          "failureCode" = 'manual_refusal'
      `;
    }
  });

  await recordAudit({
    action: 'verification.case_decided',
    entityType: 'VerificationCase',
    entityId: record.id,
    actor,
    summary: `${record.reference} decided: ${outcome}`,
    // The outcome only. No documents, no date of birth, no address.
    after: {
      status: outcome,
      providerReference: parsed.data.providerReference || null,
      resultHash: resultHash ? `${resultHash.slice(0, 8)}…` : null,
    },
  });

  if (mediaDeletedAt && !record.mediaDeletedAt) {
    await recordAudit({
      action: 'verification.media_deleted',
      entityType: 'VerificationCase',
      entityId: record.id,
      actor,
      summary: `Submitted media deleted for ${record.reference}`,
    });
  }

  // Told to the creator, never quoting anything they submitted. An abandoned
  // case is one nobody is waiting on, so it writes nothing.
  if (record.userId && record.userEmail && outcome !== 'abandoned') {
    await sendVerificationOutcome({
      to: record.userEmail,
      userId: record.userId,
      creatorId: record.creatorId,
      outcome: outcome === 'verified' ? 'verified' : 'failed',
      note: parsed.data.note || null,
    });
  }

  revalidatePath('/portal/verification');
  revalidatePath('/creator');
  revalidatePath(`/creators/${record.creatorSlug}`);
  return {
    status: 'success',
    message:
      mediaDeletedAt && record.mediaReceivedAt
        ? `${record.reference} closed. Submitted media deleted.`
        : `${record.reference} closed.`,
  };
}
