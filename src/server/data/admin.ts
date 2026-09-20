import 'server-only';
import { rank } from '@/domain/judging';
import { sql } from '@/server/db/sql';

/**
 * DateTime columns are `timestamp(3)` without time zone, holding UTC wall
 * clock. Render the same wall-clock UTC ISO string straight out of Postgres so
 * the DTOs do not depend on the session time zone. Returns a raw SQL fragment;
 * only ever called with static, quoted column references.
 */
const isoTs = (ref: string) =>
  sql.unsafe(`to_char(${ref}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);

export type AdminOverview = {
  seasonTitle: string;
  seasonYear: number;
  stage: string;
  counts: {
    nominations: number;
    candidacies: number;
    underReview: number;
    eligible: number;
    judging: number;
    finalists: number;
    winners: number;
    creators: number;
    judges: number;
    openReports: number;
    openConflicts: number;
    flagged: number;
  };
};

export async function getAdminOverview(): Promise<AdminOverview | null> {
  const seasons = await sql<{ id: string; title: string; year: number; stage: string }[]>`
    select id, title, year, stage
    from "AwardYear"
    where "isCurrent" = true
    limit 1
  `;
  const season = seasons[0];
  if (!season) return null;

  const [counts] = await sql<
    [
      {
        nominations: number;
        candidacies: number;
        underReview: number;
        eligible: number;
        judging: number;
        finalists: number;
        winners: number;
        creators: number;
        judges: number;
        openReports: number;
        openConflicts: number;
        flagged: number;
      },
    ]
  >`
    select
      (select count(*)::int from "Nomination" n
        join "Candidacy" c on c.id = n."candidacyId"
        where c."awardYearId" = ${season.id} and n.status = 'counted') as "nominations",
      (select count(*)::int from "Candidacy" c
        where c."awardYearId" = ${season.id}) as "candidacies",
      (select count(*)::int from "Candidacy" c
        where c."awardYearId" = ${season.id} and c.status = 'under_review') as "underReview",
      (select count(*)::int from "Candidacy" c
        where c."awardYearId" = ${season.id} and c.status = 'eligible') as "eligible",
      (select count(*)::int from "JudgingAssignment" a
        join "Candidacy" c on c.id = a."candidacyId"
        where c."awardYearId" = ${season.id}
          and a.status in ('assigned', 'in_progress')) as "judging",
      (select count(*)::int from "Honour" h
        where h."awardYearId" = ${season.id} and h.kind = 'finalist' and h.state = 'active') as "finalists",
      (select count(*)::int from "Honour" h
        where h."awardYearId" = ${season.id} and h.kind = 'winner' and h.state = 'active') as "winners",
      (select count(*)::int from "Creator") as "creators",
      (select count(*)::int from "Judge" j where j."isActive" = true) as "judges",
      (select count(*)::int from "Report" r
        where r.status in ('open', 'investigating')) as "openReports",
      (select count(*)::int from "JudgeConflict" jc
        where jc.status = 'declared') as "openConflicts",
      (select count(*)::int from "Candidacy" c
        where c."awardYearId" = ${season.id} and c."integrityFlag" = true) as "flagged"
  `;

  return {
    seasonTitle: season.title,
    seasonYear: season.year,
    stage: season.stage,
    counts,
  };
}

export type AdminCandidacy = {
  id: string;
  reference: string;
  creatorName: string;
  creatorSlug: string;
  categoryName: string;
  categorySlug: string;
  status: string;
  /** Operational only. Never shown to judges, never shown publicly. */
  nominationCount: number;
  referralShare: number;
  integrityFlag: boolean;
  integrityNote: string | null;
  evidenceCount: number;
  firstNominatedAt: string | null;
  lastNominatedAt: string | null;
  verificationStatus: string;
  /**
   * What the audience actually wrote, for the desk that decides whether this
   * candidacy is worth putting in front of a panel. The count says how loud
   * the room was; these say what it said, which is the part a person has to
   * read. Never published, and never carried into the judging layer, which
   * builds its own sample separately and without the number attached.
   */
  reasons: string[];
};

type AdminCandidacyRow = {
  id: string;
  reference: string;
  creatorName: string;
  creatorSlug: string;
  categoryName: string;
  categorySlug: string;
  status: string;
  nominationCount: number;
  integrityFlag: boolean;
  integrityNote: string | null;
  evidenceCount: number;
  firstNominatedAt: string | null;
  lastNominatedAt: string | null;
  verificationStatus: string | null;
  nominations: { source: string; reason: string }[];
};

export async function listAdminCandidacies(filter: {
  status?: string;
  year?: number;
  flagged?: boolean;
}): Promise<AdminCandidacy[]> {
  const rows = await sql<AdminCandidacyRow[]>`
    select
      c.id,
      c.reference,
      cr."displayName" as "creatorName",
      cr.slug as "creatorSlug",
      cat.name as "categoryName",
      cat.slug as "categorySlug",
      c.status,
      c."nominationCount",
      c."integrityFlag",
      c."integrityNote",
      (select count(*)::int from "CandidacyEvidence" e
        where e."candidacyId" = c.id) as "evidenceCount",
      ${isoTs('c."firstNominatedAt"')} as "firstNominatedAt",
      ${isoTs('c."lastNominatedAt"')} as "lastNominatedAt",
      v.status as "verificationStatus",
      (select coalesce(
          json_agg(json_build_object('source', n.source, 'reason', n.reason)
            order by n."createdAt" asc),
          '[]'::json)
        from "Nomination" n
        where n."candidacyId" = c.id and n.status = 'counted') as "nominations"
    from "Candidacy" c
    join "AwardYear" ay on ay.id = c."awardYearId"
    join "Creator" cr on cr.id = c."creatorId"
    left join "CreatorVerification" v on v."creatorId" = cr.id
    join "Category" cat on cat.id = c."categoryId"
    where true
      ${filter.status ? sql`and c.status = ${filter.status}` : sql``}
      ${filter.flagged ? sql`and c."integrityFlag" = true` : sql``}
      ${filter.year ? sql`and ay.year = ${filter.year}` : sql`and ay."isCurrent" = true`}
    order by c."integrityFlag" desc, c."nominationCount" desc, c."createdAt" desc
    limit 200
  `;

  return rows.map((row) => {
    const counted = row.nominations.length;
    const referrals = row.nominations.filter((entry) => entry.source === 'referral').length;
    return {
      id: row.id,
      reference: row.reference,
      creatorName: row.creatorName,
      creatorSlug: row.creatorSlug,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      status: row.status,
      nominationCount: row.nominationCount,
      referralShare: counted > 0 ? Math.round((referrals / counted) * 100) : 0,
      integrityFlag: row.integrityFlag,
      integrityNote: row.integrityNote,
      evidenceCount: row.evidenceCount,
      reasons: row.nominations.map((entry) => entry.reason).filter(Boolean),
      firstNominatedAt: row.firstNominatedAt,
      lastNominatedAt: row.lastNominatedAt,
      verificationStatus: row.verificationStatus ?? 'unverified',
    };
  });
}

export type CategoryStanding = {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  candidates: {
    candidacyId: string;
    creatorId: string;
    creatorName: string;
    judgeCount: number;
    trimmedMean: number;
    spread: number;
    eligible: boolean;
    honour: string | null;
  }[];
};

type StandingRow = {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  candidacyId: string | null;
  creatorId: string | null;
  creatorName: string | null;
  isSuspended: boolean | null;
  verificationStatus: string | null;
  totals: number[] | null;
  honour: string | null;
};

/**
 * The standings an administrator sees when selecting finalists and winners.
 * Aggregation happens here so the UI never has to hold raw judge scores.
 */
export async function getCategoryStandings(year: number): Promise<CategoryStanding[]> {
  const rows = await sql<StandingRow[]>`
    select
      cat.id as "categoryId",
      cat.slug as "categorySlug",
      cat.name as "categoryName",
      cd.id as "candidacyId",
      cd."creatorId" as "creatorId",
      cr."displayName" as "creatorName",
      cr."isSuspended" as "isSuspended",
      v.status as "verificationStatus",
      (select array_agg(s.total) from "JudgingScore" s
        where s."candidacyId" = cd.id) as "totals",
      (select h.kind from "Honour" h
        where h."candidacyId" = cd.id and h.state = 'active'
        order by h.kind desc
        limit 1) as "honour"
    from "Category" cat
    join "AwardYear" ay on ay.id = cat."awardYearId" and ay.year = ${year}
    left join "Candidacy" cd
      on cd."categoryId" = cat.id and cd.status not in ('withdrawn', 'ineligible')
    left join "Creator" cr on cr.id = cd."creatorId"
    left join "CreatorVerification" v on v."creatorId" = cr.id
    order by cat.position asc
  `;

  const categories = new Map<
    string,
    { slug: string; name: string; candidacies: StandingRow[] }
  >();
  for (const row of rows) {
    let category = categories.get(row.categoryId);
    if (!category) {
      category = { slug: row.categorySlug, name: row.categoryName, candidacies: [] };
      categories.set(row.categoryId, category);
    }
    if (row.candidacyId !== null) category.candidacies.push(row);
  }

  return [...categories.entries()].map(([categoryId, category]) => {
    const ranked = rank(
      category.candidacies.map((candidacy) => ({
        candidacyId: candidacy.candidacyId!,
        totals: candidacy.totals ?? [],
      })),
    );
    const byId = new Map(category.candidacies.map((candidacy) => [candidacy.candidacyId, candidacy]));

    return {
      categoryId,
      categorySlug: category.slug,
      categoryName: category.name,
      candidates: ranked.map((entry) => {
        const candidacy = byId.get(entry.candidacyId)!;
        return {
          candidacyId: entry.candidacyId,
          creatorId: candidacy.creatorId!,
          creatorName: candidacy.creatorName!,
          judgeCount: entry.judgeCount,
          trimmedMean: entry.trimmedMean,
          spread: entry.spread,
          eligible: !candidacy.isSuspended && candidacy.verificationStatus === 'verified',
          honour: candidacy.honour,
        };
      }),
    };
  });
}

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorLabel: string | null;
  actorRole: string | null;
  summary: string | null;
  createdAt: string;
};

export async function listAuditLog(
  options: { action?: string; limit?: number } = {},
): Promise<AuditEntry[]> {
  const rows = await sql<
    {
      id: string;
      action: string;
      entityType: string;
      entityId: string;
      actorLabel: string | null;
      actorRole: string | null;
      summary: string | null;
      createdAt: string;
    }[]
  >`
    select
      id,
      action,
      "entityType",
      "entityId",
      "actorLabel",
      "actorRole",
      summary,
      ${isoTs('"createdAt"')} as "createdAt"
    from "AuditLog"
    ${options.action ? sql`where action = ${options.action}` : sql``}
    order by "createdAt" desc
    limit ${options.limit ?? 100}
  `;

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actorLabel: row.actorLabel,
    actorRole: row.actorRole,
    summary: row.summary,
    createdAt: row.createdAt,
  }));
}

export type ReportEntry = {
  id: string;
  reason: string;
  status: string;
  detail: string;
  subject: string;
  createdAt: string;
};

export async function listReports(): Promise<ReportEntry[]> {
  const rows = await sql<
    {
      id: string;
      reason: string;
      status: string;
      detail: string;
      creatorName: string | null;
      candidacyReference: string | null;
      createdAt: string;
    }[]
  >`
    select
      r.id,
      r.reason,
      r.status,
      r.detail,
      cr."displayName" as "creatorName",
      c.reference as "candidacyReference",
      ${isoTs('r."createdAt"')} as "createdAt"
    from "Report" r
    left join "Creator" cr on cr.id = r."creatorId"
    left join "Candidacy" c on c.id = r."candidacyId"
    order by r."createdAt" desc
    limit 100
  `;

  return rows.map((row) => ({
    id: row.id,
    reason: row.reason,
    status: row.status,
    detail: row.detail,
    subject: row.creatorName ?? row.candidacyReference ?? 'Unattributed',
    createdAt: row.createdAt,
  }));
}
