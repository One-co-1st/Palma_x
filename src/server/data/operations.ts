import 'server-only';
import { sql } from '@/server/db/sql';
import { assessClaim, type ClaimCheck } from '@/domain/claim';
import type { VerificationCaseReason, VerificationCaseStatus } from '@/domain/verification-case';
import { honourCategoryName, type HonourKind } from '@/domain/honours';

/**
 * The operations read layer.
 *
 * The back office is organised around queues rather than analytics: the only
 * number that matters on the home screen is how much work is waiting, and for
 * each queue the answer is a count of things a person has to decide.
 *
 * Everything here reads the same Creator, User, Verification and Report rows
 * the public site and the creator portal read. One record, one history,
 * different permissions.
 */

/**
 * DateTime columns are `timestamp(3)` without time zone, holding UTC wall
 * clock. Render the same wall-clock UTC ISO string straight out of Postgres so
 * the DTOs do not depend on the session time zone. Returns a raw SQL fragment;
 * only ever called with static, quoted column references.
 */
const isoTs = (ref: string) =>
  sql.unsafe(`to_char(${ref}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);

/**
 * A substring filter escapes LIKE metacharacters before matching; ILIKE with
 * the default backslash escape behaves the same way.
 */
const likePattern = (value: string) => `%${value.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;

export type QueueCounts = {
  claims: number;
  verification: number;
  unclaimedRecords: number;
  reports: number;
  escalations: number;
  unpublishedRecords: number;
};

export async function getQueueCounts(): Promise<QueueCounts> {
  const [[counts]] = await Promise.all([
    sql<
      [
        {
          claims: number;
          verification: number;
          unclaimedRecords: number;
          reports: number;
          escalations: number;
          unpublishedRecords: number;
        },
      ]
    >`
      select
        (select count(*)::int from "CreatorClaim"
          where status in ('submitted', 'awaiting_information')) as "claims",
        (select count(*)::int from "VerificationCase"
          where status in ('open', 'awaiting_information')) as "verification",
        (select count(*)::int from "Creator"
          where "userId" is null and "isPublished" = true) as "unclaimedRecords",
        (select count(*)::int from "Report"
          where status in ('open', 'investigating')) as "reports",
        (select count(*)::int from "CreatorClaim"
          where status = 'escalated') as "escalations",
        (select count(*)::int from "Creator"
          where "isPublished" = false) as "unpublishedRecords"
    `,
  ]);

  return counts;
}

export type ClaimSummary = {
  id: string;
  reference: string;
  status: string;
  createdAt: string;
  creatorName: string;
  creatorSlug: string;
  claimantEmail: string;
  invited: boolean;
  linkCount: number;
};

export async function listClaims(status?: 'open' | 'settled'): Promise<ClaimSummary[]> {
  const rows = await sql<
    {
      id: string;
      reference: string;
      status: string;
      createdAt: string;
      creatorId: string;
      creatorName: string;
      creatorSlug: string;
      claimantEmail: string;
      linkCount: number;
    }[]
  >`
    select
      cl.id,
      cl.reference,
      cl.status,
      ${isoTs('cl."createdAt"')} as "createdAt",
      cl."creatorId",
      c."displayName" as "creatorName",
      c.slug as "creatorSlug",
      u.email as "claimantEmail",
      (select count(*)::int from "CreatorClaimLink" l where l."claimId" = cl.id) as "linkCount"
    from "CreatorClaim" cl
    join "Creator" c on c.id = cl."creatorId"
    join "User" u on u.id = cl."userId"
    ${
      status === 'open'
        ? sql`where cl.status in ('submitted', 'awaiting_information', 'escalated')`
        : status === 'settled'
          ? sql`where cl.status in ('approved', 'rejected', 'withdrawn')`
          : sql``
    }
    order by cl.status asc, cl."createdAt" asc
    limit 100
  `;

  const creatorIds = [...new Set(rows.map((row) => row.creatorId))];
  const invitedCreatorIds = new Set(
    creatorIds.length === 0
      ? []
      : (
          await sql<{ creatorId: string }[]>`
            select distinct "creatorId"
            from "ClaimInvitation"
            where "creatorId" in ${sql(creatorIds)}
              and "usedAt" is not null
          `
        ).map((invitation) => invitation.creatorId),
  );

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    status: row.status,
    createdAt: row.createdAt,
    creatorName: row.creatorName,
    creatorSlug: row.creatorSlug,
    claimantEmail: row.claimantEmail,
    invited: invitedCreatorIds.has(row.creatorId),
    linkCount: row.linkCount,
  }));
}

export type ClaimCase = {
  id: string;
  reference: string;
  status: string;
  createdAt: string;

  /** The PALMA record as it stands. Read-only in this view. */
  record: {
    id: string;
    slug: string;
    displayName: string;
    countryCode: string;
    city: string | null;
    headline: string | null;
    biography: string | null;
    portraitUrl: string | null;
    createdAt: string;
    isPublished: boolean;
    verificationStatus: string;
    verifiedAt: string | null;
    links: { label: string; url: string }[];
    honours: { year: number; kind: string; categoryName: string }[];
  };

  /** What the claimant has supplied. Never published. */
  claimant: {
    userId: string;
    email: string;
    name: string;
    role: string;
    contactEmail: string;
    claimedIdentity: string;
    supportingNote: string | null;
    links: { label: string; url: string }[];
  };

  checks: ClaimCheck[];
  invited: boolean;
  openReports: number;
  informationRequestedNote: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  decidedByEmail: string | null;
};

export async function getClaimCase(id: string): Promise<ClaimCase | null> {
  const [claim] = await sql<
    {
      id: string;
      reference: string;
      status: string;
      createdAt: string;
      creatorId: string;
      contactEmail: string;
      claimedIdentity: string;
      supportingNote: string | null;
      informationRequestedNote: string | null;
      decisionNote: string | null;
      decidedAt: string | null;
      claimantId: string;
      claimantEmail: string;
      claimantName: string;
      claimantRole: string;
      decidedByEmail: string | null;
      recordId: string;
      recordSlug: string;
      recordDisplayName: string;
      recordCountryCode: string;
      recordCity: string | null;
      recordHeadline: string | null;
      recordBiography: string | null;
      recordPortraitUrl: string | null;
      recordCreatedAt: string;
      recordIsPublished: boolean;
      recordUserId: string | null;
      verificationStatus: string | null;
      verifiedAt: string | null;
    }[]
  >`
    select
      cl.id,
      cl.reference,
      cl.status,
      ${isoTs('cl."createdAt"')} as "createdAt",
      cl."creatorId",
      cl."contactEmail",
      cl."claimedIdentity",
      cl."supportingNote",
      cl."informationRequestedNote",
      cl."decisionNote",
      ${isoTs('cl."decidedAt"')} as "decidedAt",
      u.id as "claimantId",
      u.email as "claimantEmail",
      u.name as "claimantName",
      u.role as "claimantRole",
      d.email as "decidedByEmail",
      c.id as "recordId",
      c.slug as "recordSlug",
      c."displayName" as "recordDisplayName",
      c."countryCode" as "recordCountryCode",
      c.city as "recordCity",
      c.headline as "recordHeadline",
      c.biography as "recordBiography",
      c."portraitUrl" as "recordPortraitUrl",
      ${isoTs('c."createdAt"')} as "recordCreatedAt",
      c."isPublished" as "recordIsPublished",
      c."userId" as "recordUserId",
      cv.status as "verificationStatus",
      ${isoTs('cv."verifiedAt"')} as "verifiedAt"
    from "CreatorClaim" cl
    join "User" u on u.id = cl."userId"
    left join "User" d on d.id = cl."decidedById"
    join "Creator" c on c.id = cl."creatorId"
    left join "CreatorVerification" cv on cv."creatorId" = c.id
    where cl.id = ${id}
    limit 1
  `;

  if (!claim) return null;

  const [claimLinks, recordLinks, honours, [invitation], [openReports]] = await Promise.all([
    sql<{ label: string; url: string }[]>`
      select label, url
      from "CreatorClaimLink"
      where "claimId" = ${claim.id}
    `,
    sql<{ label: string; url: string }[]>`
      select label, url
      from "CreatorLink"
      where "creatorId" = ${claim.creatorId}
      order by position asc
    `,
    sql<{ year: number; kind: HonourKind; categoryName: string | null }[]>`
      select ay.year, h.kind, cat.name as "categoryName"
      from "Honour" h
      join "AwardYear" ay on ay.id = h."awardYearId"
      left join "Category" cat on cat.id = h."categoryId"
      where h."creatorId" = ${claim.creatorId}
        and h.state = 'active'
    `,
    sql<{ id: string }[]>`
      select id
      from "ClaimInvitation"
      where "creatorId" = ${claim.creatorId}
        and "usedAt" is not null
      limit 1
    `,
    sql<[{ count: number }]>`
      select count(*)::int as count
      from "Report"
      where "creatorId" = ${claim.creatorId}
        and status in ('open', 'investigating')
    `,
  ]);

  const invited = Boolean(invitation);

  return {
    id: claim.id,
    reference: claim.reference,
    status: claim.status,
    createdAt: claim.createdAt,

    record: {
      id: claim.recordId,
      slug: claim.recordSlug,
      displayName: claim.recordDisplayName,
      countryCode: claim.recordCountryCode,
      city: claim.recordCity,
      headline: claim.recordHeadline,
      biography: claim.recordBiography,
      portraitUrl: claim.recordPortraitUrl,
      createdAt: claim.recordCreatedAt,
      isPublished: claim.recordIsPublished,
      verificationStatus: claim.verificationStatus ?? 'unverified',
      verifiedAt: claim.verifiedAt,
      links: recordLinks,
      honours: honours.map((honour) => ({
        year: honour.year,
        kind: honour.kind,
        categoryName: honourCategoryName(honour.kind, honour.categoryName),
      })),
    },

    claimant: {
      userId: claim.claimantId,
      email: claim.claimantEmail,
      name: claim.claimantName,
      role: claim.claimantRole,
      contactEmail: claim.contactEmail,
      claimedIdentity: claim.claimedIdentity,
      supportingNote: claim.supportingNote,
      links: claimLinks,
    },

    checks: assessClaim({
      recordUnclaimed: !claim.recordUserId,
      verificationComplete: claim.verificationStatus === 'verified',
      identityStatementSupplied: claim.claimedIdentity.trim().length > 0,
      evidenceLinkCount: claimLinks.length,
      invited,
      openReports: openReports.count,
    }),

    invited,
    openReports: openReports.count,
    informationRequestedNote: claim.informationRequestedNote,
    decisionNote: claim.decisionNote,
    decidedAt: claim.decidedAt,
    decidedByEmail: claim.decidedByEmail,
  };
}

export type VerificationCaseSummary = {
  id: string;
  reference: string;
  status: VerificationCaseStatus;
  reason: VerificationCaseReason;
  creatorName: string;
  creatorSlug: string;
  openedAt: string;
  mediaReceivedAt: string | null;
  mediaDeletedAt: string | null;
};

export async function listVerificationCases(
  scope: 'open' | 'all' = 'open',
): Promise<VerificationCaseSummary[]> {
  const rows = await sql<
    {
      id: string;
      reference: string;
      status: string;
      reason: string;
      creatorName: string;
      creatorSlug: string;
      openedAt: string;
      mediaReceivedAt: string | null;
      mediaDeletedAt: string | null;
    }[]
  >`
    select
      vc.id,
      vc.reference,
      vc.status,
      vc.reason,
      c."displayName" as "creatorName",
      c.slug as "creatorSlug",
      ${isoTs('vc."openedAt"')} as "openedAt",
      ${isoTs('vc."mediaReceivedAt"')} as "mediaReceivedAt",
      ${isoTs('vc."mediaDeletedAt"')} as "mediaDeletedAt"
    from "VerificationCase" vc
    join "Creator" c on c.id = vc."creatorId"
    ${scope === 'open' ? sql`where vc.status in ('open', 'awaiting_information')` : sql``}
    order by vc."openedAt" asc
    limit 100
  `;

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    status: row.status as VerificationCaseStatus,
    reason: row.reason as VerificationCaseReason,
    creatorName: row.creatorName,
    creatorSlug: row.creatorSlug,
    openedAt: row.openedAt,
    mediaReceivedAt: row.mediaReceivedAt,
    mediaDeletedAt: row.mediaDeletedAt,
  }));
}

export type StaffCreatorSummary = {
  id: string;
  slug: string;
  displayName: string;
  countryCode: string;
  isPublished: boolean;
  isClaimed: boolean;
  isSuspended: boolean;
  verificationStatus: string;
  honourCount: number;
  openClaims: number;
  noteCount: number;
};

export async function listCreatorRecords(filter?: {
  query?: string;
  claimed?: boolean;
}): Promise<StaffCreatorSummary[]> {
  const rows = await sql<
    {
      id: string;
      slug: string;
      displayName: string;
      countryCode: string;
      isPublished: boolean;
      isSuspended: boolean;
      userId: string | null;
      verificationStatus: string | null;
      honourCount: number;
      openClaims: number;
      noteCount: number;
    }[]
  >`
    select
      c.id,
      c.slug,
      c."displayName",
      c."countryCode",
      c."isPublished",
      c."isSuspended",
      c."userId",
      cv.status as "verificationStatus",
      (select count(*)::int from "Honour" h
        where h."creatorId" = c.id and h.state = 'active') as "honourCount",
      (select count(*)::int from "CreatorClaim" cc
        where cc."creatorId" = c.id
          and cc.status in ('submitted', 'awaiting_information', 'escalated')) as "openClaims",
      (select count(*)::int from "CreatorNote" n
        where n."creatorId" = c.id) as "noteCount"
    from "Creator" c
    left join "CreatorVerification" cv on cv."creatorId" = c.id
    where true
      ${filter?.query ? sql`and c."displayName" ilike ${likePattern(filter.query)}` : sql``}
      ${filter?.claimed === true ? sql`and c."userId" is not null` : sql``}
      ${filter?.claimed === false ? sql`and c."userId" is null` : sql``}
    order by c."displayName" asc
    limit 200
  `;

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    countryCode: row.countryCode,
    isPublished: row.isPublished,
    isClaimed: Boolean(row.userId),
    isSuspended: row.isSuspended,
    verificationStatus: row.verificationStatus ?? 'unverified',
    honourCount: row.honourCount,
    openClaims: row.openClaims,
    noteCount: row.noteCount,
  }));
}

export type StaffCreatorRecord = {
  id: string;
  slug: string;
  displayName: string;
  countryCode: string;
  city: string | null;
  headline: string | null;
  biography: string | null;
  websiteUrl: string | null;
  isPublished: boolean;
  isSuspended: boolean;
  createdAt: string;

  /** Who holds it, if anyone. */
  heldBy: { email: string; name: string } | null;

  /** Where the work lives — what the desk writes and checks the record from. */
  links: { id: string; label: string; url: string }[];

  verification: {
    status: string;
    provider: string | null;
    providerReference: string | null;
    verifiedAt: string | null;
  };

  /** PALMA's record of what happened. Shown here, never editable here. */
  honours: { year: number; kind: string; categoryName: string; state: string }[];

  claims: { id: string; reference: string; status: string; createdAt: string; email: string }[];
  cases: { id: string; reference: string; status: string; reason: string }[];
  notes: { id: string; body: string; createdAt: string; author: string | null }[];
  invitations: { id: string; createdAt: string; expiresAt: string; usedAt: string | null }[];
};

export async function getCreatorRecord(slug: string): Promise<StaffCreatorRecord | null> {
  const [creator] = await sql<
    {
      id: string;
      slug: string;
      displayName: string;
      countryCode: string;
      city: string | null;
      headline: string | null;
      biography: string | null;
      websiteUrl: string | null;
      isPublished: boolean;
      isSuspended: boolean;
      createdAt: string;
      holderEmail: string | null;
      holderName: string | null;
      verificationStatus: string | null;
      verificationProvider: string | null;
      verificationProviderReference: string | null;
      verifiedAt: string | null;
    }[]
  >`
    select
      c.id,
      c.slug,
      c."displayName",
      c."countryCode",
      c.city,
      c.headline,
      c.biography,
      c."websiteUrl",
      c."isPublished",
      c."isSuspended",
      ${isoTs('c."createdAt"')} as "createdAt",
      u.email as "holderEmail",
      u.name as "holderName",
      cv.status as "verificationStatus",
      cv.provider as "verificationProvider",
      cv."providerReference" as "verificationProviderReference",
      ${isoTs('cv."verifiedAt"')} as "verifiedAt"
    from "Creator" c
    left join "User" u on u.id = c."userId"
    left join "CreatorVerification" cv on cv."creatorId" = c.id
    where c.slug = ${slug}
    limit 1
  `;

  if (!creator) return null;

  const [links, honours, claims, cases, notes, invitations] = await Promise.all([
    sql<{ id: string; label: string; url: string }[]>`
      select id, label, url
      from "CreatorLink"
      where "creatorId" = ${creator.id}
      order by position asc
    `,
    sql<{ year: number; kind: HonourKind; categoryName: string | null; state: string }[]>`
      select ay.year, h.kind, cat.name as "categoryName", h.state
      from "Honour" h
      join "AwardYear" ay on ay.id = h."awardYearId"
      left join "Category" cat on cat.id = h."categoryId"
      where h."creatorId" = ${creator.id}
      order by h."createdAt" desc
    `,
    sql<{ id: string; reference: string; status: string; createdAt: string; email: string }[]>`
      select
        cl.id,
        cl.reference,
        cl.status,
        ${isoTs('cl."createdAt"')} as "createdAt",
        u.email
      from "CreatorClaim" cl
      join "User" u on u.id = cl."userId"
      where cl."creatorId" = ${creator.id}
      order by cl."createdAt" desc
      limit 20
    `,
    sql<{ id: string; reference: string; status: string; reason: string }[]>`
      select id, reference, status, reason
      from "VerificationCase"
      where "creatorId" = ${creator.id}
      order by "openedAt" desc
      limit 20
    `,
    sql<{ id: string; body: string; createdAt: string; author: string | null }[]>`
      select
        n.id,
        n.body,
        ${isoTs('n."createdAt"')} as "createdAt",
        u.email as author
      from "CreatorNote" n
      left join "User" u on u.id = n."authorId"
      where n."creatorId" = ${creator.id}
      order by n."createdAt" desc
      limit 50
    `,
    sql<{ id: string; createdAt: string; expiresAt: string; usedAt: string | null }[]>`
      select
        id,
        ${isoTs('"createdAt"')} as "createdAt",
        ${isoTs('"expiresAt"')} as "expiresAt",
        ${isoTs('"usedAt"')} as "usedAt"
      from "ClaimInvitation"
      where "creatorId" = ${creator.id}
      order by "createdAt" desc
      limit 10
    `,
  ]);

  return {
    id: creator.id,
    slug: creator.slug,
    displayName: creator.displayName,
    countryCode: creator.countryCode,
    city: creator.city,
    headline: creator.headline,
    biography: creator.biography,
    websiteUrl: creator.websiteUrl,
    isPublished: creator.isPublished,
    isSuspended: creator.isSuspended,
    createdAt: creator.createdAt,

    heldBy:
      creator.holderEmail && creator.holderName
        ? { email: creator.holderEmail, name: creator.holderName }
        : null,

    links,

    verification: {
      status: creator.verificationStatus ?? 'unverified',
      provider: creator.verificationProvider,
      providerReference: creator.verificationProviderReference,
      verifiedAt: creator.verifiedAt,
    },

    honours: honours.map((honour) => ({
      year: honour.year,
      kind: honour.kind,
      categoryName: honourCategoryName(honour.kind, honour.categoryName),
      state: honour.state,
    })),

    claims,

    cases,

    notes,

    invitations,
  };
}

/** Resolve a claim invitation token to the record it invites a claim on. */
export async function creatorForInvitationToken(
  tokenHash: string,
): Promise<{ slug: string; displayName: string } | null> {
  const [invitation] = await sql<
    {
      usedAt: Date | null;
      revokedAt: Date | null;
      expiresAt: Date;
      creatorUserId: string | null;
      creatorSlug: string;
      creatorDisplayName: string;
    }[]
  >`
    select
      i."usedAt",
      i."revokedAt",
      i."expiresAt",
      c."userId" as "creatorUserId",
      c.slug as "creatorSlug",
      c."displayName" as "creatorDisplayName"
    from "ClaimInvitation" i
    join "Creator" c on c.id = i."creatorId"
    where i."tokenHash" = ${tokenHash}
    limit 1
  `;

  if (!invitation) return null;
  if (invitation.usedAt || invitation.revokedAt) return null;
  if (new Date(invitation.expiresAt).getTime() < Date.now()) return null;
  if (invitation.creatorUserId) return null;

  return { slug: invitation.creatorSlug, displayName: invitation.creatorDisplayName };
}
