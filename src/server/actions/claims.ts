'use server';

import { revalidatePath } from 'next/cache';
import { authorise } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { assertSameOrigin } from '@/lib/auth/session';
import { randomToken, sha256 } from '@/lib/crypto';
import { approvalIsBlocked, isOpenClaim, type ClaimStatus } from '@/domain/claim';
import { claimDecisionSchema, claimRequestSchema, newRecordSchema } from '@/lib/validation/claims';
import { fieldErrors } from '@/lib/validation/nomination';
import { recordAudit } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql, withTransaction } from '@/server/db/sql';
import { sendClaimApproved, sendClaimRefused } from '@/server/email/messages';
import { slugify } from '@/lib/utils';

export type ClaimState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  errors?: Record<string, string>;
};

function reference(prefix: string): string {
  return `${prefix}-${new Date().getUTCFullYear()}-${randomToken(4).toUpperCase().slice(0, 6)}`;
}

/**
 * Ask to control a PALMA record.
 *
 * This creates a request and nothing else. It does not link the account, does
 * not set isClaimed, and does not grant the creator role — an approval by a
 * person does all three, in one transaction, later. Claiming a record you do
 * not control should fail at review, not at the database.
 */
export async function requestProfileClaim(
  _previous: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('creator:claim_profile');
  } catch {
    return { status: 'error', message: 'Sign in to claim a profile.' };
  }

  const linkCount = Number(formData.get('linkCount') ?? 0);
  const links = Array.from({ length: Math.min(4, Math.max(0, linkCount)) }, (_, index) => ({
    label: String(formData.get(`linkLabel${index}`) ?? '').trim(),
    url: String(formData.get(`linkUrl${index}`) ?? '').trim(),
  })).filter((link) => link.label && link.url);

  const parsed = claimRequestSchema.safeParse({
    creator: formData.get('creator'),
    contactEmail: formData.get('contactEmail') || session.user.email,
    claimedIdentity: formData.get('claimedIdentity'),
    supportingNote: formData.get('supportingNote') ?? '',
    links,
    token: formData.get('token') ?? '',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the details you have supplied.',
      errors: fieldErrors(parsed.error),
    };
  }

  const [creator] = await sql<{ id: string; displayName: string; userId: string | null }[]>`
    select id, "displayName", "userId" from "Creator" where slug = ${parsed.data.creator} limit 1
  `;

  if (!creator) return { status: 'error', message: 'That profile does not exist.' };

  if (creator.userId) {
    return {
      status: 'error',
      message:
        creator.userId === session.user.id
          ? 'You already hold this profile.'
          : 'That profile is already held by an account. Write to PALMA if you believe that is wrong.',
    };
  }

  const [existing] = await sql<{ id: string }[]>`
    select id from "CreatorClaim"
    where "creatorId" = ${creator.id}
      and "userId" = ${session.user.id}
      and status in ('submitted', 'awaiting_information', 'escalated')
    limit 1
  `;

  if (existing) {
    return {
      status: 'error',
      message: 'You already have a claim open on this profile. PALMA will come back to you.',
    };
  }

  // An invitation PALMA issued is consumed here, and is evidence at review.
  let invitationId: string | null = null;
  if (parsed.data.token) {
    const [invitation] = await sql<{ id: string }[]>`
      select id from "ClaimInvitation"
      where "tokenHash" = ${sha256(parsed.data.token)}
        and "creatorId" = ${creator.id}
        and "usedAt" is null
        and "revokedAt" is null
        and "expiresAt" > timezone('UTC', now())
      limit 1
    `;

    if (invitation) invitationId = invitation.id;
  }

  const claim = await withTransaction(async (tx) => {
    const now = new Date();
    const id = createId();
    const claimReference = reference('CL');

    await tx`
      insert into "CreatorClaim" (
        id, reference, "creatorId", "userId", "contactEmail", "claimedIdentity",
        "supportingNote", "createdAt", "updatedAt"
      ) values (
        ${id}, ${claimReference}, ${creator.id}, ${session.user.id},
        ${parsed.data.contactEmail}, ${parsed.data.claimedIdentity},
        ${parsed.data.supportingNote || null}, ${now}, ${now}
      )
    `;

    for (const link of parsed.data.links) {
      await tx`
        insert into "CreatorClaimLink" (id, "claimId", label, url)
        values (${createId()}, ${id}, ${link.label}, ${link.url})
      `;
    }

    if (invitationId) {
      await tx`
        update "ClaimInvitation" set "usedAt" = ${now} where id = ${invitationId}
      `;
    }

    return { id, reference: claimReference };
  });

  await recordAudit({
    action: 'claim.requested',
    entityType: 'CreatorClaim',
    entityId: claim.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Claim ${claim.reference} opened on ${creator.displayName}`,
  });

  revalidatePath('/creator');
  return {
    status: 'success',
    message: `Claim ${claim.reference} submitted. PALMA reviews claims by hand; you will hear from us by email.`,
  };
}

/**
 * Decide a claim.
 *
 * Approval is the only operation in PALMA that hands a record to a person, so
 * it is a single transaction: link the User, mark the record claimed, raise
 * the account to the creator role if it holds none, and close the claim. Every
 * branch writes an audit entry naming the reviewer.
 */
export async function decideClaim(_previous: ClaimState, formData: FormData): Promise<ClaimState> {
  await assertSameOrigin();

  const parsed = claimDecisionSchema.safeParse({
    claimId: formData.get('claimId'),
    decision: formData.get('decision'),
    note: formData.get('note') ?? '',
  });

  if (!parsed.success) return { status: 'error', message: 'Choose a decision.' };

  // Reviewing is one permission; deciding is another. An editor may read a
  // claim and recommend, but only a moderator or administrator settles it.
  const permission = parsed.data.decision === 'approve' ? 'claims:decide' : 'claims:review';

  let session;
  try {
    session = await authorise(permission);
  } catch {
    return { status: 'error', message: 'You are not authorised to make that decision.' };
  }

  if (
    (parsed.data.decision === 'reject' || parsed.data.decision === 'approve') &&
    !can(session.user.role, 'claims:decide')
  ) {
    return {
      status: 'error',
      message: 'Approving or rejecting a claim is a moderator or administrator decision.',
    };
  }

  const [claim] = await sql<
    {
      id: string;
      reference: string;
      status: string;
      creatorId: string;
      userId: string;
      claimedIdentity: string;
      creatorSlug: string;
      creatorDisplayName: string;
      creatorUserId: string | null;
      userEmail: string;
      userRole: string;
    }[]
  >`
    select
      cl.id, cl.reference, cl.status, cl."creatorId", cl."userId", cl."claimedIdentity",
      c.slug as "creatorSlug", c."displayName" as "creatorDisplayName", c."userId" as "creatorUserId",
      u.email as "userEmail", u.role as "userRole"
    from "CreatorClaim" cl
    join "Creator" c on c.id = cl."creatorId"
    join "User" u on u.id = cl."userId"
    where cl.id = ${parsed.data.claimId}
    limit 1
  `;

  if (!claim) return { status: 'error', message: 'That claim does not exist.' };
  if (!isOpenClaim(claim.status as ClaimStatus)) {
    return { status: 'error', message: 'That claim has already been settled.' };
  }

  const actor = { id: session.user.id, role: session.user.role, label: session.user.email };
  const now = new Date();

  if (parsed.data.decision === 'request_information') {
    await sql`
      update "CreatorClaim" set
        status = 'awaiting_information',
        "informationRequestedAt" = ${now},
        "informationRequestedNote" = ${parsed.data.note || null},
        "updatedAt" = ${now}
      where id = ${claim.id}
    `;

    await recordAudit({
      action: 'claim.information_requested',
      entityType: 'CreatorClaim',
      entityId: claim.id,
      actor,
      summary: `More information requested on ${claim.reference}`,
    });

    revalidatePath('/portal/claims');
    return { status: 'success', message: 'Information requested. The claim stays open.' };
  }

  if (parsed.data.decision === 'escalate') {
    await sql`
      update "CreatorClaim" set
        status = 'escalated',
        "escalatedAt" = ${now},
        "decisionNote" = ${parsed.data.note || null},
        "updatedAt" = ${now}
      where id = ${claim.id}
    `;

    await recordAudit({
      action: 'claim.escalated',
      entityType: 'CreatorClaim',
      entityId: claim.id,
      actor,
      summary: `${claim.reference} escalated`,
    });

    revalidatePath('/portal/claims');
    return { status: 'success', message: 'Escalated. An administrator will take it from here.' };
  }

  if (parsed.data.decision === 'reject') {
    if (!parsed.data.note) {
      return { status: 'error', message: 'A rejection has to carry a reason.' };
    }

    await sql`
      update "CreatorClaim" set
        status = 'rejected',
        "decidedAt" = ${now},
        "decidedById" = ${session.user.id},
        "decisionNote" = ${parsed.data.note},
        "updatedAt" = ${now}
      where id = ${claim.id}
    `;

    await recordAudit({
      action: 'claim.rejected',
      entityType: 'CreatorClaim',
      entityId: claim.id,
      actor,
      summary: `${claim.reference} rejected on ${claim.creatorDisplayName}`,
      after: { reason: parsed.data.note },
    });

    // The person who claimed it is told, with the reason and the route back.
    // A refusal nobody explains is how an institution loses somebody's trust
    // over something that was usually only an evidence problem.
    await sendClaimRefused({
      to: claim.userEmail,
      userId: claim.userId,
      creatorId: claim.creatorId,
      creatorName: claim.creatorDisplayName,
      reason: parsed.data.note,
    });

    revalidatePath('/portal/claims');
    return { status: 'success', message: 'Claim rejected, with the reason recorded.' };
  }

  // Approval.
  const [verification] = await sql<{ status: string }[]>`
    select status from "CreatorVerification" where "creatorId" = ${claim.creatorId} limit 1
  `;

  const blocked = approvalIsBlocked({
    recordUnclaimed: !claim.creatorUserId,
    verificationComplete: verification?.status === 'verified',
    identityStatementSupplied: claim.claimedIdentity.length > 0,
    evidenceLinkCount: 0,
    invited: false,
    openReports: 0,
  });

  if (blocked) return { status: 'error', message: blocked };

  await withTransaction(async (tx) => {
    await tx`
      update "Creator" set "userId" = ${claim.userId}, "isClaimed" = true, "updatedAt" = ${now}
      where id = ${claim.creatorId}
    `;

    // The account is raised to creator only if it holds no role of its own.
    // A judge or a member of staff who also creates keeps the role they have.
    if (claim.userRole === 'visitor') {
      await tx`
        update "User" set role = 'creator', "updatedAt" = ${now} where id = ${claim.userId}
      `;
    }

    await tx`
      update "CreatorClaim" set
        status = 'approved',
        "decidedAt" = ${now},
        "decidedById" = ${session.user.id},
        "decisionNote" = ${parsed.data.note || null},
        "updatedAt" = ${now}
      where id = ${claim.id}
    `;

    // Any other claim still open on this record is now moot.
    await tx`
      update "CreatorClaim" set
        status = 'rejected',
        "decidedAt" = ${now},
        "decidedById" = ${session.user.id},
        "decisionNote" = 'Another claim on this record was approved.',
        "updatedAt" = ${now}
      where "creatorId" = ${claim.creatorId}
        and id <> ${claim.id}
        and status in ('submitted', 'awaiting_information', 'escalated')
    `;
  });

  await recordAudit({
    action: 'claim.approved',
    entityType: 'CreatorClaim',
    entityId: claim.id,
    actor,
    summary: `${session.user.email} approved ${claim.userEmail}'s claim on ${claim.creatorDisplayName}`,
    before: { userId: null, isClaimed: false },
    after: { userId: claim.userId, isClaimed: true },
  });

  await sendClaimApproved({
    to: claim.userEmail,
    userId: claim.userId,
    creatorId: claim.creatorId,
    creatorName: claim.creatorDisplayName,
    slug: claim.creatorSlug,
  });

  revalidatePath('/portal/claims');
  revalidatePath('/creator');
  // The public record says whether it is claimed, so it goes stale the moment
  // this succeeds.
  revalidatePath(`/creators/${claim.creatorSlug}`);
  revalidatePath('/creators');
  return {
    status: 'success',
    message: `Approved. ${claim.creatorDisplayName} is now held by ${claim.userEmail}.`,
  };
}

/**
 * Issue a claim invitation.
 *
 * PALMA often knows about a creator before the creator knows about PALMA. The
 * token is returned once, here, and stored only as a hash — the link is
 * knowledge, not a row somebody can read back out of the database.
 */
export async function issueClaimInvitation(
  _previous: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('editorial:edit_creator');
  } catch {
    return { status: 'error', message: 'You are not authorised to invite a claim.' };
  }

  const creatorId = String(formData.get('creatorId') ?? '');
  const [creator] = await sql<
    { id: string; slug: string; displayName: string; userId: string | null }[]
  >`
    select id, slug, "displayName", "userId" from "Creator" where id = ${creatorId} limit 1
  `;

  if (!creator) return { status: 'error', message: 'That record does not exist.' };
  if (creator.userId) return { status: 'error', message: 'That record is already held.' };

  const token = randomToken(24);

  await sql`
    insert into "ClaimInvitation" (id, "creatorId", "tokenHash", "issuedById", "expiresAt", "createdAt")
    values (
      ${createId()}, ${creator.id}, ${sha256(token)}, ${session.user.id},
      ${new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)}, ${new Date()}
    )
  `;

  await recordAudit({
    action: 'claim.invitation_issued',
    entityType: 'Creator',
    entityId: creator.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Claim invitation issued for ${creator.displayName}`,
  });

  revalidatePath(`/portal/creators/${creator.slug}`);
  return {
    status: 'success',
    message: `/claim/${token}`,
  };
}

/**
 * Start a record that does not exist yet.
 *
 * PALMA writes most records itself, the first time a creator is nominated —
 * but the industry is larger than the archive, and a creator who finds nothing
 * of themselves here should not hit a dead end.
 *
 * Two routes, one outcome. `create` means the creator writes their own copy;
 * `request` means they supply the links and PALMA's desk writes from them.
 * Either way what appears is an *unpublished* creator record held by that
 * account, waiting on a moderator — because a record anyone could publish
 * about themselves is not an archive, it is a directory.
 *
 * Age and identity assurance is a separate step and happens once the record
 * exists; no honour is conferred without it.
 */
export async function startCreatorRecord(
  _previous: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('creator:claim_profile');
  } catch {
    return { status: 'error', message: 'Sign in to start a record.' };
  }

  const linkCount = Number(formData.get('linkCount') ?? 0);
  const links = Array.from({ length: Math.min(6, Math.max(0, linkCount)) }, (_, index) => ({
    label: String(formData.get(`linkLabel${index}`) ?? '').trim(),
    url: String(formData.get(`linkUrl${index}`) ?? '').trim(),
  })).filter((link) => link.label && link.url);

  const parsed = newRecordSchema.safeParse({
    route: formData.get('route'),
    displayName: formData.get('displayName'),
    countryCode: formData.get('countryCode'),
    city: formData.get('city') ?? '',
    pronouns: formData.get('pronouns') ?? '',
    headline: formData.get('headline') ?? '',
    biography: formData.get('biography') ?? '',
    links,
    note: formData.get('note') ?? '',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the details you have supplied.',
      errors: fieldErrors(parsed.error),
    };
  }

  // One record per account. An account already holding one is editing, not
  // starting — and an account with a request open is waiting, not stuck.
  const [held] = await sql<{ slug: string; displayName: string }[]>`
    select slug, "displayName" from "Creator" where "userId" = ${session.user.id} limit 1
  `;

  if (held) {
    return {
      status: 'error',
      message: `You already hold the record for ${held.displayName}. Edit it from your portal.`,
    };
  }

  const base = slugify(parsed.data.displayName);
  let slug = base;
  for (
    let attempt = 2;
    (
      await sql<{ id: string }[]>`
        select id from "Creator" where slug = ${slug} limit 1
      `
    )[0];
    attempt += 1
  ) {
    slug = `${base}-${attempt}`;
  }

  const requested = parsed.data.route === 'request';

  const creator = await withTransaction(async (tx) => {
    const now = new Date();
    const id = createId();

    await tx`
      insert into "Creator" (
        id, slug, "displayName", "countryCode", city, pronouns, headline, biography,
        "userId", "isClaimed", "isPublished", "createdAt", "updatedAt"
      ) values (
        ${id}, ${slug}, ${parsed.data.displayName}, ${parsed.data.countryCode},
        ${parsed.data.city || null}, ${parsed.data.pronouns || null},
        ${requested ? null : parsed.data.headline || null},
        ${requested ? null : parsed.data.biography || null},
        ${session.user.id}, true, false, ${now}, ${now}
      )
    `;

    for (const [position, link] of parsed.data.links.entries()) {
      await tx`
        insert into "CreatorLink" (id, "creatorId", label, url, position)
        values (${createId()}, ${id}, ${link.label}, ${link.url}, ${position})
      `;
    }

    await tx`
      insert into "CreatorVerification" (id, "creatorId", status, "createdAt", "updatedAt")
      values (${createId()}, ${id}, 'unverified', ${now}, ${now})
    `;

    await tx`
      insert into "CreatorNote" (id, "creatorId", "authorId", body, "createdAt")
      values (
        ${createId()}, ${id}, ${session.user.id},
        ${requested
          ? `Record requested by ${session.user.email}. PALMA to write from the supplied links.${
              parsed.data.note ? ` They add: ${parsed.data.note}` : ''
            }`
          : `Record written by ${session.user.email} about themselves.${
              parsed.data.note ? ` They add: ${parsed.data.note}` : ''
            } Review the copy before publishing.`},
        ${now}
      )
    `;

    return { id, displayName: parsed.data.displayName };
  });

  await recordAudit({
    action: requested ? 'creator.record_requested' : 'creator.record_created',
    entityType: 'Creator',
    entityId: creator.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${creator.displayName} started by ${session.user.email} (${parsed.data.route})`,
  });

  revalidatePath('/creator');
  revalidatePath('/portal/creators');

  return {
    status: 'success',
    message: requested
      ? 'Requested. PALMA will write your record from the links you gave and publish it once checked.'
      : 'Started. PALMA reviews every record before it is published; yours is held by your account in the meantime.',
  };
}
