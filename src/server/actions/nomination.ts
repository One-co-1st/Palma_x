'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { acceptsNominations, type SeasonStage } from '@/domain/season';
import { assessIntegrity } from '@/domain/integrity';
import { checkNomination, nominatorKey } from '@/domain/nomination';
import {
  canResend,
  checkCodeState,
  expiryFrom,
  mintCode,
  MAX_ATTEMPTS,
} from '@/domain/verification-code';
import { constantTimeEquals, hashIdentifier, sha256 } from '@/lib/crypto';
import { signingSecret } from '@/lib/env';
import {
  fieldErrors,
  nominationDraftSchema,
  submitNominationSchema,
  verifyCodeSchema,
} from '@/lib/validation/nomination';
import { getSession } from '@/lib/auth/session';
import { recordAudit } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql, withTransaction } from '@/server/db/sql';
import { sendNominationCode, sendNominationReceipt } from '@/server/email/messages';
import { RATE_LIMITS, enforceRateLimit } from '@/server/rate-limit';
import type { NominationState } from '@/lib/nomination-state';

/**
 * The nomination flow, in three server actions:
 *
 *   requestNominationCode → verifyNominationCode → submitNomination
 *
 * A draft row exists from the first step so the code can be bound to it, but
 * nothing counts until `submitNomination` commits it. The nomination is only
 * ever a signal: the count it increments is operational, and no part of the
 * judging path reads it.
 */

/**
 * DateTime columns are `timestamp(3)` without time zone, holding UTC wall
 * clock. Render the same wall-clock UTC ISO string straight out of Postgres so
 * comparisons in this module do not depend on the session time zone. Returns a
 * raw SQL fragment; only ever called with static, quoted column references.
 */
const isoTs = (ref: string) =>
  sql.unsafe(`to_char(${ref}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);

async function requestMeta() {
  try {
    const headerList = await headers();
    const forwarded = headerList.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? '';
    return {
      ipHash: ip ? hashIdentifier(ip, signingSecret()) : null,
      userAgentHash: hashIdentifier(headerList.get('user-agent') ?? '', signingSecret()),
    };
  } catch {
    return { ipHash: null, userAgentHash: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 — Details, then a code
// ─────────────────────────────────────────────────────────────────────────────

export async function requestNominationCode(
  _previous: NominationState,
  formData: FormData,
): Promise<NominationState> {
  const parsed = nominationDraftSchema.safeParse({
    creatorSlug: formData.get('creatorSlug'),
    categorySlug: formData.get('categorySlug'),
    reason: formData.get('reason'),
    email: formData.get('email'),
    referralSlug: formData.get('referralSlug') ?? '',
    website: formData.get('website') ?? '',
    formRenderedAt: formData.get('formRenderedAt') ?? undefined,
  });

  if (!parsed.success) {
    return {
      step: 'details',
      status: 'error',
      message: 'A couple of details need attention.',
      errors: fieldErrors(parsed.error),
    };
  }

  const input = parsed.data;

  const limit = await enforceRateLimit(RATE_LIMITS.nominationCode);
  if (!limit.allowed) {
    return {
      step: 'details',
      status: 'error',
      message: `Too many attempts from this connection. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const [creator] = await sql<
    {
      id: string;
      displayName: string;
      isPublished: boolean;
      isSuspended: boolean;
      accountEmail: string | null;
    }[]
  >`
    select c.id, c."displayName", c."isPublished", c."isSuspended", u.email as "accountEmail"
    from "Creator" c
    left join "User" u on u.id = c."userId"
    where c.slug = ${input.creatorSlug}
    limit 1
  `;

  if (!creator || !creator.isPublished) {
    return {
      step: 'details',
      status: 'error',
      message: 'That creator could not be found.',
      errors: { creatorSlug: 'Search for a creator and pick them from the list.' },
    };
  }

  const [seasonRow] = await sql<
    {
      id: string;
      year: number;
      stage: string;
      categoryId: string | null;
      categoryName: string | null;
      categoryIsOpen: boolean | null;
    }[]
  >`
    select ay.id, ay.year, ay.stage,
           cat.id as "categoryId", cat.name as "categoryName", cat."isOpen" as "categoryIsOpen"
    from "AwardYear" ay
    left join "Category" cat on cat."awardYearId" = ay.id and cat.slug = ${input.categorySlug}
    where ay."isCurrent" = true
    limit 1
  `;

  const season = seasonRow ? { id: seasonRow.id, year: seasonRow.year, stage: seasonRow.stage } : null;
  const category = seasonRow?.categoryId
    ? { id: seasonRow.categoryId, name: seasonRow.categoryName!, isOpen: seasonRow.categoryIsOpen! }
    : undefined;

  if (!season || !category) {
    return {
      step: 'details',
      status: 'error',
      message: 'That category is not part of the current season.',
      errors: { categorySlug: 'Choose a category.' },
    };
  }

  const key = nominatorKey(input.email);

  let nominator = (
    await sql<{ id: string; isBlocked: boolean }[]>`
      select id, "isBlocked" from "Nominator" where "emailKey" = ${key} limit 1
    `
  )[0];
  if (!nominator) {
    const created = new Date();
    nominator = (
      await sql<{ id: string; isBlocked: boolean }[]>`
        insert into "Nominator" (id, email, "emailKey", "createdAt", "updatedAt")
        values (${createId()}, ${input.email}, ${key}, ${created}, ${created})
        returning id, "isBlocked"
      `
    )[0]!;
  }

  const [candidacy] = await sql<{ id: string }[]>`
    select id from "Candidacy"
    where "awardYearId" = ${season.id} and "categoryId" = ${category.id} and "creatorId" = ${creator.id}
    limit 1
  `;

  const existing = candidacy
    ? (
        await sql<{ status: string }[]>`
          select status from "Nomination"
          where "nominatorId" = ${nominator.id} and "candidacyId" = ${candidacy.id}
          limit 1
        `
      )[0]
    : undefined;

  const check = checkNomination({
    nominatorEmail: input.email,
    creatorAccountEmails: creator.accountEmail ? [creator.accountEmail] : [],
    alreadyNominated: existing?.status === 'counted',
    creatorIsSuspended: creator.isSuspended,
    categoryIsOpen: category.isOpen,
    seasonAcceptsNominations: acceptsNominations(season.stage as SeasonStage),
    nominatorIsBlocked: nominator.isBlocked,
    reasonLength: input.reason.length,
  });

  if (!check.ok) {
    return { step: 'details', status: 'error', message: check.message };
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const recent = (
    await sql<{ recentByNominator: number; recentForCandidacy: number }[]>`
      select
        (select count(*)::int from "Nomination"
          where "nominatorId" = ${nominator.id} and "createdAt" >= timezone('UTC', ${hourAgo}))
          as "recentByNominator",
        ${candidacy
          ? sql`(select count(*)::int from "Nomination"
              where "candidacyId" = ${candidacy.id} and "createdAt" >= timezone('UTC', ${tenMinutesAgo}))`
          : sql`0`}
          as "recentForCandidacy"
    `
  )[0]!;

  const integrity = assessIntegrity({
    honeypot: input.website,
    elapsedMs: input.formRenderedAt ? Date.now() - input.formRenderedAt : null,
    reason: input.reason,
    email: input.email,
    recentByNominator: recent.recentByNominator,
    recentForCandidacy: recent.recentForCandidacy,
  });

  if (integrity.reject) {
    // Deliberately unspecific: naming the signal teaches an abuser how to pass.
    return {
      step: 'details',
      status: 'error',
      message: 'This nomination could not be accepted. Contact PALMA if you believe that is wrong.',
    };
  }

  // Rate-limit fresh codes per address, not just per connection.
  const [lastCode] = await sql<{ createdAt: string }[]>`
    select ${isoTs('"createdAt"')} as "createdAt"
    from "NominatorVerification"
    where "nominatorId" = ${nominator.id}
    order by "createdAt" desc
    limit 1
  `;
  if (lastCode && !canResend(lastCode.createdAt)) {
    return {
      step: 'details',
      status: 'error',
      message:
        'A code was just sent to that address. Check your inbox, then try again in a minute.',
    };
  }

  const meta = await requestMeta();

  let candidacyRecord = candidacy;
  if (!candidacyRecord) {
    const created = new Date();
    candidacyRecord = (
      await sql<{ id: string }[]>`
        insert into "Candidacy" (id, reference, "awardYearId", "categoryId", "creatorId", "createdAt", "updatedAt")
        values (
          ${createId()}, ${await nextCandidacyReference(season.year)},
          ${season.id}, ${category.id}, ${creator.id}, ${created}, ${created}
        )
        returning id
      `
    )[0]!;
  }

  const now = new Date();
  const nomination = (
    await sql<{ id: string }[]>`
      insert into "Nomination" (
        id, reference, "candidacyId", "nominatorId", source, status, reason, "referralSlug",
        "ipHash", "userAgentHash", "integrityScore", "integritySignals", "createdAt"
      ) values (
        ${createId()}, ${await nextNominationReference(season.year)},
        ${candidacyRecord.id}, ${nominator.id},
        ${input.referralSlug ? 'referral' : 'organic'}, 'pending_verification', ${input.reason},
        ${input.referralSlug || null}, ${meta.ipHash}, ${meta.userAgentHash},
        ${integrity.score}, ${sql.array(integrity.signals, 25)}, ${now}
      )
      on conflict ("nominatorId", "candidacyId") do update set
        reason = excluded.reason,
        source = excluded.source,
        "referralSlug" = excluded."referralSlug",
        "integrityScore" = excluded."integrityScore",
        "integritySignals" = excluded."integritySignals",
        "ipHash" = excluded."ipHash",
        "userAgentHash" = excluded."userAgentHash"
      returning id
    `
  )[0]!;

  const code = mintCode();

  await sql`
    insert into "NominatorVerification" (id, "nominatorId", "codeHash", "expiresAt", "ipHash", "createdAt")
    values (
      ${createId()}, ${nominator.id}, ${sha256(`${nomination.id}:${code}`)},
      ${expiryFrom()}, ${meta.ipHash}, ${new Date()}
    )
  `;

  const sent = await sendNominationCode({
    to: input.email,
    code,
    creatorName: creator.displayName,
    categoryName: category.name,
  });

  if (sent.status === 'failed') {
    // `dispatch` reports 'failed' both when the provider refuses the message
    // and when PALMA cannot reach its own database to record it, and those are
    // not the same news. Blaming the mail for an outage sends somebody to
    // check a spam folder that has nothing in it, so say which it was: the
    // detail already distinguishes them.
    const ourFault = /record/i.test(sent.detail ?? '');
    return {
      step: 'details',
      status: 'error',
      message: ourFault
        ? 'PALMA is having trouble at our end and could not issue a code. Nothing has been recorded. Please try again shortly.'
        : 'That address would not accept the code. Check it and try again.',
    };
  }

  return {
    step: 'verify',
    status: 'success',
    nominationId: nomination.id,
    email: input.email,
    creatorName: creator.displayName,
    categoryName: category.name,
    codeNotDelivered: sent.status !== 'sent',
    message: `We have sent a code to ${input.email}. It looks like PM5617 and lasts fifteen minutes.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 — The code
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyNominationCode(
  previous: NominationState,
  formData: FormData,
): Promise<NominationState> {
  const parsed = verifyCodeSchema.safeParse({
    nominationId: formData.get('nominationId'),
    code: formData.get('code'),
  });

  if (!parsed.success) {
    return {
      ...previous,
      step: 'verify',
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Enter the code from your email, like PM5617.',
    };
  }

  const limit = await enforceRateLimit(RATE_LIMITS.nominationVerify);
  if (!limit.allowed) {
    return {
      ...previous,
      step: 'verify',
      status: 'error',
      message: 'Too many attempts. Try again later.',
    };
  }

  const [nomination] = await sql<{ id: string; status: string; nominatorId: string }[]>`
    select id, status, "nominatorId" from "Nomination" where id = ${parsed.data.nominationId} limit 1
  `;

  if (!nomination) {
    return {
      ...previous,
      step: 'details',
      status: 'error',
      message: 'Start the nomination again.',
    };
  }

  if (nomination.status === 'counted') {
    return {
      ...previous,
      step: 'verify',
      status: 'error',
      message: 'This nomination is already recorded.',
    };
  }

  const [verification] = await sql<
    { id: string; codeHash: string; attempts: number; expiresAt: string }[]
  >`
    select id, "codeHash", attempts, ${isoTs('"expiresAt"')} as "expiresAt"
    from "NominatorVerification"
    where "nominatorId" = ${nomination.nominatorId} and "consumedAt" is null
    order by "createdAt" desc
    limit 1
  `;

  if (!verification) {
    return {
      ...previous,
      step: 'verify',
      status: 'error',
      message: 'That code is no longer valid. Request a new one.',
    };
  }

  const state = checkCodeState({
    expiresAt: verification.expiresAt,
    attempts: verification.attempts,
    consumedAt: null,
  });
  if (!state.ok) {
    return { ...previous, step: 'verify', status: 'error', message: state.message };
  }

  const matches = constantTimeEquals(
    verification.codeHash,
    sha256(`${nomination.id}:${parsed.data.code}`),
  );

  if (!matches) {
    const updated = (
      await sql<{ attempts: number }[]>`
        update "NominatorVerification"
        set attempts = attempts + 1
        where id = ${verification.id}
        returning attempts
      `
    )[0]!;
    const left = Math.max(0, MAX_ATTEMPTS - updated.attempts);
    return {
      ...previous,
      step: 'verify',
      status: 'error',
      message:
        left > 0
          ? `That code is not right. ${left} attempts left.`
          : 'Too many attempts. Request a new code.',
    };
  }

  const now = new Date();
  await withTransaction(async (tx) => {
    await tx`
      update "NominatorVerification" set "consumedAt" = ${now} where id = ${verification.id}
    `;
    await tx`
      update "Nominator"
      set "verifiedAt" = coalesce("verifiedAt", ${now}), "updatedAt" = ${now}
      where id = ${nomination.nominatorId}
    `;
    await tx`
      update "Nomination" set "verifiedAt" = ${now} where id = ${nomination.id}
    `;
  });

  return {
    ...previous,
    step: 'verify',
    status: 'success',
    nominationId: nomination.id,
    message: 'Email verified. You can submit the nomination now.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 — Submit
// ─────────────────────────────────────────────────────────────────────────────

export async function submitNomination(
  previous: NominationState,
  formData: FormData,
): Promise<NominationState> {
  const parsed = submitNominationSchema.safeParse({ nominationId: formData.get('nominationId') });
  if (!parsed.success) {
    return { ...previous, status: 'error', message: 'Start the nomination again.' };
  }

  const [nomination] = await sql<
    {
      id: string;
      reference: string;
      status: string;
      source: string;
      integrityScore: number;
      integritySignals: string[];
      candidacyId: string;
      nominatorId: string;
      verifiedAt: string | null;
      nominatorEmail: string;
      candidacyReference: string;
      creatorName: string;
      categoryName: string;
      seasonStage: string;
      seasonYear: number;
    }[]
  >`
    select
      n.id, n.reference, n.status, n.source, n."integrityScore", n."integritySignals",
      n."candidacyId", n."nominatorId",
      ${isoTs('n."verifiedAt"')} as "verifiedAt",
      nom.email as "nominatorEmail",
      c.reference as "candidacyReference",
      cr."displayName" as "creatorName",
      cat.name as "categoryName",
      ay.stage as "seasonStage",
      ay.year as "seasonYear"
    from "Nomination" n
    join "Nominator" nom on nom.id = n."nominatorId"
    join "Candidacy" c on c.id = n."candidacyId"
    join "Creator" cr on cr.id = c."creatorId"
    join "Category" cat on cat.id = c."categoryId"
    join "AwardYear" ay on ay.id = c."awardYearId"
    where n.id = ${parsed.data.nominationId}
    limit 1
  `;

  if (!nomination) {
    return {
      ...previous,
      step: 'details',
      status: 'error',
      message: 'Start the nomination again.',
    };
  }

  // The button is disabled until verification, but the server decides.
  if (!nomination.verifiedAt) {
    return {
      ...previous,
      step: 'verify',
      status: 'error',
      message: 'Verify your email address before submitting.',
    };
  }

  if (nomination.status === 'counted') {
    return {
      ...previous,
      step: 'done',
      status: 'success',
      reference: nomination.reference,
      creatorName: nomination.creatorName,
      categoryName: nomination.categoryName,
      message: 'This nomination is already recorded.',
    };
  }

  // The season can close between requesting a code and submitting.
  if (!acceptsNominations(nomination.seasonStage as SeasonStage)) {
    return {
      ...previous,
      status: 'error',
      message: 'Nominations closed while you were verifying. Nothing has been recorded.',
    };
  }

  const now = new Date();
  // Automation signals raise a flag for a moderator; they never block the
  // person in front of us, who is most likely a real supporter.
  const flagged = nomination.integrityScore >= 30;

  await withTransaction(async (tx) => {
    await tx`
      update "Nomination" set status = 'counted', "countedAt" = ${now} where id = ${nomination.id}
    `;
    await tx`
      update "Candidacy" set
        "nominationCount" = "nominationCount" + 1,
        "lastNominatedAt" = ${now},
        "firstNominatedAt" = coalesce("firstNominatedAt", ${now}),
        ${flagged ? sql`"integrityFlag" = true,` : sql``}
        "updatedAt" = ${now}
      where id = ${nomination.candidacyId}
    `;
    await tx`
      update "Nominator" set "lastNominatedAt" = ${now}, "updatedAt" = ${now}
      where id = ${nomination.nominatorId}
    `;
  });

  const session = await getSession();

  await recordAudit({
    action: 'nomination.counted',
    entityType: 'Nomination',
    entityId: nomination.id,
    actor: session
      ? { id: session.user.id, role: session.user.role, label: session.user.email }
      : { label: 'nominator' },
    summary: `${nomination.creatorName} nominated in ${nomination.categoryName}`,
    after: {
      reference: nomination.reference,
      candidacy: nomination.candidacyReference,
      source: nomination.source,
      integrityScore: nomination.integrityScore,
      integritySignals: nomination.integritySignals,
    },
  });

  await sendNominationReceipt({
    to: nomination.nominatorEmail,
    creatorName: nomination.creatorName,
    categoryName: nomination.categoryName,
    reference: nomination.reference,
    year: nomination.seasonYear,
  }).catch(() => undefined);

  revalidatePath('/portal/nominations');

  return {
    step: 'done',
    status: 'success',
    reference: nomination.reference,
    creatorName: nomination.creatorName,
    categoryName: nomination.categoryName,
    message: 'Nomination recorded.',
  };
}

async function nextNominationReference(year: number): Promise<string> {
  const row = (
    await sql<{ count: number }[]>`
      select count(*)::int as "count"
      from "Nomination" n
      join "Candidacy" c on c.id = n."candidacyId"
      join "AwardYear" ay on ay.id = c."awardYearId"
      where ay.year = ${year}
    `
  )[0]!;
  return `PN-${year}-${String(row.count + 1).padStart(6, '0')}`;
}

async function nextCandidacyReference(year: number): Promise<string> {
  const row = (
    await sql<{ count: number }[]>`
      select count(*)::int as "count"
      from "Candidacy" c
      join "AwardYear" ay on ay.id = c."awardYearId"
      where ay.year = ${year}
    `
  )[0]!;
  return `PC-${year}-${String(row.count + 1).padStart(4, '0')}`;
}
