import 'server-only';
import { signingSecret } from '@/lib/env';
import { deriveCode, payloadDigest, signAchievement } from '@/lib/verification';
import { canReceiveHonour } from '@/domain/eligibility';
import { recordAudit, type AuditActor } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql, withTransaction } from '@/server/db/sql';
import { sendHonourConferred, sendHonourRevoked } from '@/server/email/messages';

export type { HonourKind } from '@/domain/honours';
import { honourCategoryName, HONOUR_LABEL } from '@/domain/honours';
import { conferralObjections } from '@/domain/the-palma';
import type { HonourKind } from '@/domain/honours';

type VerificationStatus =
  'unverified' | 'pending' | 'verified' | 'failed' | 'expired' | 'revoked';

export type ConferInput = {
  candidacyId: string;
  kind: HonourKind;
  position?: number;
  citation?: string | null;
  actor: AuditActor;
};

export type ConferResult =
  { ok: true; honourId: string; code: string | null } | { ok: false; reason: string };

type CandidacyHonourRow = {
  id: string;
  status: string;
  awardYearId: string;
  categoryId: string;
  creatorId: string;
  creatorSlug: string;
  creatorDisplayName: string;
  creatorIsSuspended: boolean;
  creatorVerificationStatus: VerificationStatus | null;
  userId: string | null;
  userEmail: string | null;
  categoryName: string;
  awardYear: number;
};

/**
 * Confer an honour.
 *
 * A finalist or winner honour also mints the permanent artefacts: an
 * Achievement (the citable record) and a signed VerificationRecord (the proof).
 * All three are written in one transaction — an honour without its proof would
 * be worse than no honour at all.
 */
export async function conferHonour(input: ConferInput): Promise<ConferResult> {
  const [candidacy] = await sql<CandidacyHonourRow[]>`
    select
      c.id,
      c.status,
      c."awardYearId",
      c."categoryId",
      c."creatorId",
      cr.slug as "creatorSlug",
      cr."displayName" as "creatorDisplayName",
      cr."isSuspended" as "creatorIsSuspended",
      cv.status as "creatorVerificationStatus",
      u.id as "userId",
      u.email as "userEmail",
      cat.name as "categoryName",
      ay.year as "awardYear"
    from "Candidacy" c
    join "Creator" cr on cr.id = c."creatorId"
    left join "CreatorVerification" cv on cv."creatorId" = cr.id
    left join "User" u on u.id = cr."userId"
    join "Category" cat on cat.id = c."categoryId"
    join "AwardYear" ay on ay.id = c."awardYearId"
    where c.id = ${input.candidacyId}
    limit 1
  `;

  if (!candidacy) return { ok: false, reason: 'That candidacy does not exist.' };

  if (candidacy.status === 'ineligible' || candidacy.status === 'withdrawn') {
    return { ok: false, reason: 'That candidacy is not eligible for an honour.' };
  }

  const standing = canReceiveHonour({
    creatorIsSuspended: candidacy.creatorIsSuspended,
    creatorVerificationStatus: candidacy.creatorVerificationStatus ?? 'unverified',
  });
  if (!standing.ok) return { ok: false, reason: standing.reason! };

  const [existing] = await sql<{ id: string }[]>`
    select id
    from "Honour"
    where "awardYearId" = ${candidacy.awardYearId}
      and "categoryId" = ${candidacy.categoryId}
      and "creatorId" = ${candidacy.creatorId}
      and kind = ${input.kind}
    limit 1
  `;
  if (existing) return { ok: false, reason: 'That honour has already been conferred.' };

  const issuedAt = new Date();

  const result = await withTransaction(async (tx) => {
    const honourId = createId();
    await tx`
      insert into "Honour" (
        id, "awardYearId", "categoryId", "creatorId", "candidacyId",
        kind, position, citation, "announcedAt", "updatedAt"
      )
      values (
        ${honourId}, ${candidacy.awardYearId}, ${candidacy.categoryId}, ${candidacy.creatorId}, ${candidacy.id},
        ${input.kind}, ${input.position ?? 0}, ${input.citation ?? null}, ${issuedAt}, ${issuedAt}
      )
    `;

    await tx`
      update "Candidacy"
      set status = ${
        input.kind === 'winner'
          ? 'winner'
          : input.kind === 'finalist'
            ? 'finalist'
            : 'shortlisted'
      }
      where id = ${candidacy.id}
    `;

    // The creator profile becomes public the moment they hold an honour.
    await tx`
      update "Creator" set "isPublished" = true where id = ${candidacy.creatorId}
    `;

    if (input.kind === 'shortlist') {
      return { honourId, code: null as string | null };
    }

    const code = deriveCode(signingSecret(), candidacy.awardYear, honourId);
    const payload = {
      code,
      creatorSlug: candidacy.creatorSlug,
      creatorName: candidacy.creatorDisplayName,
      categoryName: candidacy.categoryName,
      year: candidacy.awardYear,
      kind: input.kind,
      issuedAt: issuedAt.toISOString(),
    };

    const achievementId = createId();
    await tx`
      insert into "Achievement" (
        id, "honourId", "creatorId", code, kind, year,
        "categoryName", "creatorName", "creatorSlug", "issuedAt"
      )
      values (
        ${achievementId}, ${honourId}, ${candidacy.creatorId}, ${code}, ${input.kind}, ${candidacy.awardYear},
        ${candidacy.categoryName}, ${candidacy.creatorDisplayName}, ${candidacy.creatorSlug}, ${issuedAt}
      )
    `;

    await tx`
      insert into "VerificationRecord" (
        id, "achievementId", code, signature, "payloadDigest", "issuedAt"
      )
      values (
        ${createId()}, ${achievementId}, ${code},
        ${signAchievement(signingSecret(), payload)}, ${payloadDigest(payload)}, ${issuedAt}
      )
    `;

    return { honourId, code };
  });

  await recordAudit({
    action:
      input.kind === 'winner'
        ? 'honour.winner_selected'
        : input.kind === 'finalist'
          ? 'honour.finalist_selected'
          : 'honour.shortlisted',
    entityType: 'Honour',
    entityId: result.honourId,
    actor: input.actor,
    summary: `${candidacy.creatorDisplayName}, ${candidacy.categoryName} (${candidacy.awardYear})`,
    after: { kind: input.kind, code: result.code, candidacyId: candidacy.id },
  });

  if (result.code) {
    await recordAudit({
      action: 'achievement.issued',
      entityType: 'Achievement',
      entityId: result.code,
      actor: input.actor,
      summary: `Verification record issued for ${candidacy.creatorDisplayName}`,
    });
  }

  // Telling the creator belongs here rather than at each call site: an honour
  // conferred by a route that forgot to send the email is an honour somebody
  // finds out about from a stranger. A record nobody holds has nobody to tell,
  // and special recognition is announced by the desk rather than by a template.
  if (candidacy.userId && candidacy.userEmail && input.kind !== 'special_recognition') {
    await sendHonourConferred({
      to: candidacy.userEmail,
      userId: candidacy.userId,
      creatorId: candidacy.creatorId,
      creatorName: candidacy.creatorDisplayName,
      kind: input.kind,
      categoryName: candidacy.categoryName,
      year: candidacy.awardYear,
      verificationCode: result.code,
    });
  }

  return { ok: true, honourId: result.honourId, code: result.code };
}

type HonourRevokeRow = {
  id: string;
  state: string;
  kind: HonourKind;
  creatorId: string;
  creatorDisplayName: string;
  creatorUserId: string | null;
  categoryName: string | null;
  awardYear: number;
  achievementId: string | null;
};

/**
 * Revoke an honour.
 *
 * Nothing is deleted. The honour, its achievement and its verification record
 * all remain, marked revoked — a verification page must be able to say "this
 * was revoked" rather than "this never existed".
 */
export async function revokeHonour(input: {
  honourId: string;
  reason: string;
  actor: AuditActor;
}): Promise<{ ok: boolean; reason?: string }> {
  const [honour] = await sql<HonourRevokeRow[]>`
    select
      h.id,
      h.state,
      h.kind,
      h."creatorId",
      cr."displayName" as "creatorDisplayName",
      cr."userId" as "creatorUserId",
      cat.name as "categoryName",
      ay.year as "awardYear",
      a.id as "achievementId"
    from "Honour" h
    join "Creator" cr on cr.id = h."creatorId"
    left join "Category" cat on cat.id = h."categoryId"
    join "AwardYear" ay on ay.id = h."awardYearId"
    left join "Achievement" a on a."honourId" = h.id
    where h.id = ${input.honourId}
    limit 1
  `;

  if (!honour) return { ok: false, reason: 'That honour does not exist.' };
  if (honour.state === 'revoked') return { ok: false, reason: 'That honour is already revoked.' };
  if (input.reason.trim().length < 20) {
    return { ok: false, reason: 'A revocation must be explained in at least 20 characters.' };
  }

  const revokedAt = new Date();

  await withTransaction(async (tx) => {
    await tx`
      update "Honour"
      set state = 'revoked', "revokedAt" = ${revokedAt}, "revokedReason" = ${input.reason}
      where id = ${honour.id}
    `;

    if (honour.achievementId) {
      await tx`
        update "Achievement"
        set state = 'revoked', "revokedAt" = ${revokedAt}
        where id = ${honour.achievementId}
      `;
    }
  });

  await recordAudit({
    action: 'honour.revoked',
    entityType: 'Honour',
    entityId: honour.id,
    actor: input.actor,
    summary: `${honour.creatorDisplayName}, ${honourCategoryName(honour.kind, honour.categoryName)} (${honour.awardYear})`,
    before: { state: 'active' },
    after: { state: 'revoked', reason: input.reason },
  });

  // Never gated by a preference. Finding out from the public page that your
  // honour was revoked is not an acceptable way to be told.
  if (honour.creatorUserId) {
    const [holder] = await sql<{ id: string; email: string }[]>`
      select id, email from "User" where id = ${honour.creatorUserId} limit 1
    `;
    if (holder) {
      await sendHonourRevoked({
        to: holder.email,
        userId: holder.id,
        creatorId: honour.creatorId,
        creatorName: honour.creatorDisplayName,
        categoryName: honourCategoryName(honour.kind, honour.categoryName),
        year: honour.awardYear,
        reason: input.reason,
      });
    }
  }

  return { ok: true };
}

type PalmaCreatorRow = {
  id: string;
  slug: string;
  displayName: string;
  isSuspended: boolean;
  isPublished: boolean;
  verificationStatus: VerificationStatus | null;
  userId: string | null;
  userEmail: string | null;
};

/**
 * Confer THE PALMA.
 *
 * Its own function, because it is not a category honour with a flag set. There
 * is no candidacy to read, no category to write, no shortlist it came through
 * and no position in a list. Routing it through `conferHonour` would have meant
 * threading nulls through every step of that function and trusting a caller to
 * pass the right ones, which is how a second PALMA eventually gets conferred in
 * a season.
 *
 * The database holds the two rules that matter even if this function is wrong:
 * a partial unique index allows one active PALMA a season, and a check
 * constraint refuses one that carries a category.
 */
export async function conferThePalma(input: {
  awardYearId: string;
  creatorId: string;
  citation: string;
  actor: AuditActor;
}): Promise<ConferResult> {
  const [[awardYear], [creator]] = await Promise.all([
    sql<{ id: string; year: number }[]>`
      select id, year from "AwardYear" where id = ${input.awardYearId} limit 1
    `,
    sql<PalmaCreatorRow[]>`
      select
        c.id,
        c.slug,
        c."displayName",
        c."isSuspended",
        c."isPublished",
        cv.status as "verificationStatus",
        u.id as "userId",
        u.email as "userEmail"
      from "Creator" c
      left join "CreatorVerification" cv on cv."creatorId" = c.id
      left join "User" u on u.id = c."userId"
      where c.id = ${input.creatorId}
      limit 1
    `,
  ]);

  if (!awardYear) return { ok: false, reason: 'That season does not exist.' };
  if (!creator) return { ok: false, reason: 'That creator does not exist.' };

  const standing = canReceiveHonour({
    creatorIsSuspended: creator.isSuspended,
    creatorVerificationStatus: creator.verificationStatus ?? 'unverified',
  });
  if (!standing.ok) return { ok: false, reason: standing.reason! };

  // Everything the rules need, read once and handed to the domain. The domain
  // decides; this function only gathers and writes.
  const [[existingThisSeason], held] = await Promise.all([
    sql<{ count: number }[]>`
      select count(*)::int as count
      from "Honour"
      where "awardYearId" = ${awardYear.id} and kind = 'the_palma' and state = 'active'
    `,
    sql<{ year: number }[]>`
      select ay.year
      from "Honour" h
      join "AwardYear" ay on ay.id = h."awardYearId"
      where h."creatorId" = ${creator.id} and h.kind = 'the_palma' and h.state = 'active'
    `,
  ]);

  const objections = conferralObjections({
    existingThisSeason: existingThisSeason?.count ?? 0,
    creatorHeldIn: held.map((honour) => honour.year),
    creatorIsVerified: creator.verificationStatus === 'verified',
    creatorIsPublished: creator.isPublished,
    citation: input.citation,
  });

  if (objections.length > 0) return { ok: false, reason: objections.join(' ') };

  const issuedAt = new Date();
  const categoryName = HONOUR_LABEL.the_palma;

  const result = await withTransaction(async (tx) => {
    const honourId = createId();
    await tx`
      insert into "Honour" (
        id, "awardYearId", "categoryId", "creatorId", "candidacyId",
        kind, position, citation, "announcedAt", "updatedAt"
      )
      values (
        ${honourId}, ${awardYear.id}, ${null}, ${creator.id}, ${null},
        'the_palma', 0, ${input.citation.trim()}, ${issuedAt}, ${issuedAt}
      )
    `;

    await tx`update "Creator" set "isPublished" = true where id = ${creator.id}`;

    const code = deriveCode(signingSecret(), awardYear.year, honourId);
    const payload = {
      code,
      creatorSlug: creator.slug,
      creatorName: creator.displayName,
      categoryName,
      year: awardYear.year,
      kind: 'the_palma' as const,
      issuedAt: issuedAt.toISOString(),
    };

    const achievementId = createId();
    await tx`
      insert into "Achievement" (
        id, "honourId", "creatorId", code, kind, year,
        "categoryName", "creatorName", "creatorSlug", "issuedAt"
      )
      values (
        ${achievementId}, ${honourId}, ${creator.id}, ${code}, 'the_palma', ${awardYear.year},
        ${categoryName}, ${creator.displayName}, ${creator.slug}, ${issuedAt}
      )
    `;

    await tx`
      insert into "VerificationRecord" (
        id, "achievementId", code, signature, "payloadDigest", "issuedAt"
      )
      values (
        ${createId()}, ${achievementId}, ${code},
        ${signAchievement(signingSecret(), payload)}, ${payloadDigest(payload)}, ${issuedAt}
      )
    `;

    return { honourId, code };
  });

  await recordAudit({
    action: 'honour.the_palma_conferred',
    entityType: 'Honour',
    entityId: result.honourId,
    actor: input.actor,
    summary: `THE PALMA ${awardYear.year}, ${creator.displayName}`,
    after: { kind: 'the_palma', code: result.code, citation: input.citation.trim() },
  });

  await recordAudit({
    action: 'achievement.issued',
    entityType: 'Achievement',
    entityId: result.code,
    actor: input.actor,
    summary: `Verification record issued for ${creator.displayName}`,
  });

  if (creator.userId && creator.userEmail) {
    await sendHonourConferred({
      to: creator.userEmail,
      userId: creator.userId,
      creatorId: creator.id,
      creatorName: creator.displayName,
      kind: 'the_palma',
      categoryName,
      year: awardYear.year,
      verificationCode: result.code,
    });
  }

  return { ok: true, honourId: result.honourId, code: result.code };
}
