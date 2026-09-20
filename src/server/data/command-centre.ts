import 'server-only';
import { sql } from '@/server/db/sql';
import { byUrgency, momentumFor, type CategoryMomentum } from '@/domain/momentum';

/**
 * The command centre's read layer.
 *
 * Everything here counts the same rows the public site, the creator portal,
 * the judging room and the operations queues read. There is no reporting
 * database, no nightly rollup and no second copy of the truth — a statistic
 * that disagrees with the page it summarises is worse than no statistic.
 *
 * Period filtering is applied at the query, not in JavaScript over a fetched
 * array, so a wider window costs the database more and the process nothing.
 */

export const PERIODS = ['7d', '30d', '90d', 'season', 'all'] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  season: 'This season',
  all: 'All time',
};

export function isPeriod(value: string | undefined): value is Period {
  return Boolean(value) && (PERIODS as readonly string[]).includes(value as string);
}

/** Resolves a period to a cutoff. `null` means no lower bound. */
export async function periodStart(period: Period): Promise<Date | null> {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : null;
  if (days) return new Date(Date.now() - days * 86_400_000);

  if (period === 'season') {
    const [season] = await sql<{ nominationsOpenAt: Date | null; createdAt: Date }[]>`
      select "nominationsOpenAt", "createdAt"
      from "AwardYear"
      where "isCurrent" = true
      limit 1
    `;
    return season?.nominationsOpenAt ?? season?.createdAt ?? null;
  }

  return null;
}

export type CreatorStats = {
  total: number;
  added: number;
  claimed: number;
  unclaimed: number;
  verified: number;
  verificationPending: number;
  suspended: number;
  unpublished: number;
};

export type AwardStats = {
  seasonTitle: string;
  seasonYear: number;
  stage: string;
  categories: number;
  nominations: number;
  eligible: number;
  finalists: number;
  winners: number;
  awaitingFinalisation: number;
};

export type OperationsStats = {
  openClaims: number;
  escalations: number;
  verificationQueue: number;
  reports: number;
  openConflicts: number;
  unassignedJudging: number;
};

export type PlatformStats = {
  accounts: number;
  newAccounts: number;
  activeSessions: number;
  nominationActivity: number;
  claimActivity: number;
  auditEvents: number;
  emailsQueued: number;
};

export type CommandCentre = {
  period: Period;
  since: string | null;
  creators: CreatorStats;
  awards: AwardStats | null;
  operations: OperationsStats;
  platform: PlatformStats;
};

export async function getCommandCentre(period: Period): Promise<CommandCentre> {
  const since = await periodStart(period);
  const window = since ? sql`and "createdAt" >= ${since}` : sql``;

  const [season] = await sql<{ id: string; title: string; year: number; stage: string }[]>`
    select id, title, year, stage
    from "AwardYear"
    where "isCurrent" = true
    limit 1
  `;

  const [[counts]] = await Promise.all([
    sql<
      [
        {
          creatorsTotal: number;
          creatorsAdded: number;
          creatorsClaimed: number;
          creatorsVerified: number;
          creatorsPending: number;
          creatorsSuspended: number;
          creatorsUnpublished: number;
          accounts: number;
          newAccounts: number;
          activeSessions: number;
          nominationActivity: number;
          claimActivity: number;
          auditEvents: number;
          openClaims: number;
          escalations: number;
          verificationQueue: number;
          reports: number;
          openConflicts: number;
          unassignedJudging: number;
        },
      ]
    >`
      select
        (select count(*)::int from "Creator") as "creatorsTotal",
        (select count(*)::int from "Creator" where true ${window}) as "creatorsAdded",
        (select count(*)::int from "Creator" where "userId" is not null) as "creatorsClaimed",
        (select count(*)::int from "CreatorVerification"
          where status = 'verified') as "creatorsVerified",
        (select count(*)::int from "CreatorVerification"
          where status = 'pending') as "creatorsPending",
        (select count(*)::int from "Creator"
          where "isSuspended" = true) as "creatorsSuspended",
        (select count(*)::int from "Creator"
          where "isPublished" = false) as "creatorsUnpublished",
        (select count(*)::int from "User") as "accounts",
        (select count(*)::int from "User" where true ${window}) as "newAccounts",
        (select count(*)::int from "AuthSession"
          where "revokedAt" is null and "expiresAt" > ${new Date()}) as "activeSessions",
        (select count(*)::int from "Nomination" where true ${window}) as "nominationActivity",
        (select count(*)::int from "CreatorClaim" where true ${window}) as "claimActivity",
        (select count(*)::int from "AuditLog" where true ${window}) as "auditEvents",
        (select count(*)::int from "CreatorClaim"
          where status in ('submitted', 'awaiting_information')) as "openClaims",
        (select count(*)::int from "CreatorClaim"
          where status = 'escalated') as "escalations",
        (select count(*)::int from "VerificationCase"
          where status in ('open', 'awaiting_information')) as "verificationQueue",
        (select count(*)::int from "Report"
          where status in ('open', 'investigating')) as "reports",
        (select count(*)::int from "JudgeConflict"
          where status = 'declared') as "openConflicts",
        (select count(*)::int from "JudgingAssignment"
          where status in ('assigned', 'in_progress')) as "unassignedJudging"
    `,
  ]);

  let awards: AwardStats | null = null;

  if (season) {
    const [[awardCounts]] = await Promise.all([
      sql<
        [
          {
            categories: number;
            nominations: number;
            eligible: number;
            finalists: number;
            winners: number;
            scored: number;
          },
        ]
      >`
        select
          (select count(*)::int from "Category"
            where "awardYearId" = ${season.id}) as "categories",
          (select count(*)::int from "Nomination" n
            join "Candidacy" c on c.id = n."candidacyId"
            where c."awardYearId" = ${season.id} and n.status = 'counted') as "nominations",
          (select count(*)::int from "Candidacy"
            where "awardYearId" = ${season.id} and status = 'eligible') as "eligible",
          (select count(*)::int from "Honour"
            where "awardYearId" = ${season.id}
              and kind = 'finalist' and state = 'active') as "finalists",
          (select count(*)::int from "Honour"
            where "awardYearId" = ${season.id}
              and kind = 'winner' and state = 'active') as "winners",
          (select count(*)::int from "Candidacy" c
            where c."awardYearId" = ${season.id}
              and exists (select 1 from "JudgingScore" s where s."candidacyId" = c.id)
              and not exists (select 1 from "Honour" h where h."candidacyId" = c.id)) as "scored"
      `,
    ]);

    awards = {
      seasonTitle: season.title,
      seasonYear: season.year,
      stage: season.stage,
      categories: awardCounts.categories,
      nominations: awardCounts.nominations,
      eligible: awardCounts.eligible,
      finalists: awardCounts.finalists,
      winners: awardCounts.winners,
      awaitingFinalisation: awardCounts.scored,
    };
  }

  return {
    period,
    since: since?.toISOString() ?? null,
    creators: {
      total: counts.creatorsTotal,
      added: counts.creatorsAdded,
      claimed: counts.creatorsClaimed,
      unclaimed: counts.creatorsTotal - counts.creatorsClaimed,
      verified: counts.creatorsVerified,
      verificationPending: counts.creatorsPending,
      suspended: counts.creatorsSuspended,
      unpublished: counts.creatorsUnpublished,
    },
    awards,
    operations: {
      openClaims: counts.openClaims,
      escalations: counts.escalations,
      verificationQueue: counts.verificationQueue,
      reports: counts.reports,
      openConflicts: counts.openConflicts,
      unassignedJudging: counts.unassignedJudging,
    },
    platform: {
      accounts: counts.accounts,
      newAccounts: counts.newAccounts,
      activeSessions: counts.activeSessions,
      nominationActivity: counts.nominationActivity,
      claimActivity: counts.claimActivity,
      auditEvents: counts.auditEvents,
      emailsQueued: 0,
    },
  };
}

// ── Analytics ────────────────────────────────────────────────────────────────

export type SeasonComparison = {
  year: number;
  title: string;
  stage: string;
  nominations: number;
  candidacies: number;
  categories: number;
  finalists: number;
  winners: number;
  creators: number;
  returningCreators: number;
  newCreators: number;
};

export async function compareSeasons(): Promise<SeasonComparison[]> {
  const seasons = await sql<{ id: string; year: number; title: string; stage: string }[]>`
    select id, year, title, stage
    from "AwardYear"
    order by year asc
  `;
  const out: SeasonComparison[] = [];
  const seen = new Set<string>();

  for (const season of seasons) {
    const [[counts], creatorRows] = await Promise.all([
      sql<
        [
          {
            nominations: number;
            candidacies: number;
            categories: number;
            finalists: number;
            winners: number;
          },
        ]
      >`
        select
          (select count(*)::int from "Nomination" n
            join "Candidacy" c on c.id = n."candidacyId"
            where c."awardYearId" = ${season.id} and n.status = 'counted') as "nominations",
          (select count(*)::int from "Candidacy"
            where "awardYearId" = ${season.id}) as "candidacies",
          (select count(*)::int from "Category"
            where "awardYearId" = ${season.id}) as "categories",
          (select count(*)::int from "Honour"
            where "awardYearId" = ${season.id}
              and kind = 'finalist' and state = 'active') as "finalists",
          (select count(*)::int from "Honour"
            where "awardYearId" = ${season.id}
              and kind = 'winner' and state = 'active') as "winners"
      `,
      sql<{ creatorId: string }[]>`
        select distinct "creatorId"
        from "Candidacy"
        where "awardYearId" = ${season.id}
      `,
    ]);

    // Returning means PALMA has considered this creator in an earlier season.
    let returning = 0;
    for (const row of creatorRows) {
      if (seen.has(row.creatorId)) returning += 1;
    }
    for (const row of creatorRows) seen.add(row.creatorId);

    out.push({
      year: season.year,
      title: season.title,
      stage: season.stage,
      nominations: counts.nominations,
      candidacies: counts.candidacies,
      categories: counts.categories,
      finalists: counts.finalists,
      winners: counts.winners,
      creators: creatorRows.length,
      returningCreators: returning,
      newCreators: creatorRows.length - returning,
    });
  }

  return out;
}

export type NominationAnalytics = {
  byDay: { label: string; values: number[] }[];
  bySource: { label: string; value: number }[];
  byStatus: { label: string; value: number }[];
  byCategory: { label: string; value: number }[];
  funnel: { label: string; value: number }[];
  integrityFlagged: number;
  duplicatesRefused: number;
};

export async function getNominationAnalytics(period: Period): Promise<NominationAnalytics> {
  const since = await periodStart(period);

  const [rows, categories, [candidacies], [flagged]] = await Promise.all([
    sql<{ createdAt: Date; source: string; status: string }[]>`
      select "createdAt", source, status
      from "Nomination"
      ${since ? sql`where "createdAt" >= ${since}` : sql``}
      order by "createdAt" asc
      limit 20000
    `,
    sql<{ label: string; value: number }[]>`
      select
        c.name as label,
        coalesce(sum(ca."nominationCount"), 0)::int as value
      from "Category" c
      left join "Candidacy" ca on ca."categoryId" = c.id
      group by c.id, c.name
    `,
    sql<[{ count: number }]>`
      select count(*)::int as count from "Candidacy"
    `,
    sql<[{ count: number }]>`
      select count(*)::int as count from "Candidacy" where "integrityFlag" = true
    `,
  ]);

  // Bucket by day, oldest first, with empty days preserved so a quiet week
  // reads as quiet rather than as a gap in the data.
  const buckets = new Map<string, { organic: number; referral: number }>();
  const start = since ?? rows[0]?.createdAt ?? new Date();
  const days = Math.min(120, Math.max(1, Math.ceil((Date.now() - start.getTime()) / 86_400_000)));

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(Date.now() - index * 86_400_000).toISOString().slice(0, 10);
    buckets.set(day, { organic: 0, referral: 0 });
  }

  for (const row of rows) {
    const day = new Date(row.createdAt).toISOString().slice(0, 10);
    const bucket = buckets.get(day);
    if (!bucket) continue;
    if (row.source === 'referral') bucket.referral += 1;
    else bucket.organic += 1;
  }

  const counted = rows.filter((row) => row.status === 'counted').length;
  const rejected = rows.filter((row) => row.status === 'rejected').length;
  const pending = rows.filter((row) => row.status === 'pending_verification').length;

  return {
    byDay: [...buckets.entries()].map(([day, value]) => ({
      label: day.slice(5),
      values: [value.organic, value.referral],
    })),
    bySource: [
      { label: 'Organic', value: rows.filter((row) => row.source === 'organic').length },
      { label: 'Referral', value: rows.filter((row) => row.source === 'referral').length },
    ],
    byStatus: [
      { label: 'Counted', value: counted },
      { label: 'Awaiting verification', value: pending },
      { label: 'Rejected', value: rejected },
    ],
    byCategory: categories
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    funnel: [
      { label: 'Nominations submitted', value: rows.length },
      { label: 'Verified and counted', value: counted },
      { label: 'Candidacies formed', value: candidacies.count },
    ],
    integrityFlagged: flagged.count,
    duplicatesRefused: rejected,
  };
}

export type CreatorAnalytics = {
  claimed: { label: string; value: number }[];
  verification: { label: string; value: number }[];
  byCountry: { label: string; value: number }[];
  honoursHeld: { label: string; value: number }[];
};

export async function getCreatorAnalytics(): Promise<CreatorAnalytics> {
  const [creators, honours] = await Promise.all([
    sql<{ id: string; countryCode: string; userId: string | null; verificationStatus: string | null }[]>`
      select
        c.id,
        c."countryCode",
        c."userId",
        cv.status as "verificationStatus"
      from "Creator" c
      left join "CreatorVerification" cv on cv."creatorId" = c.id
    `,
    sql<{ creatorId: string; kind: string }[]>`
      select "creatorId", kind
      from "Honour"
      where state = 'active'
    `,
  ]);

  const honoursByCreator = new Map<string, string[]>();
  for (const honour of honours) {
    const held = honoursByCreator.get(honour.creatorId) ?? [];
    held.push(honour.kind);
    honoursByCreator.set(honour.creatorId, held);
  }

  const countries = new Map<string, number>();
  for (const creator of creators) {
    countries.set(creator.countryCode, (countries.get(creator.countryCode) ?? 0) + 1);
  }

  const statuses = new Map<string, number>();
  for (const creator of creators) {
    const status = creator.verificationStatus ?? 'unverified';
    statuses.set(status, (statuses.get(status) ?? 0) + 1);
  }

  const claimedCount = creators.filter((creator) => creator.userId).length;
  const heldKinds = (creatorId: string) => honoursByCreator.get(creatorId) ?? [];
  return {
    claimed: [
      { label: 'Claimed', value: claimedCount },
      { label: 'Unclaimed', value: creators.length - claimedCount },
    ],
    verification: [...statuses.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    byCountry: [...countries.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    honoursHeld: [
      {
        label: 'Holds a winner',
        value: creators.filter((c) => heldKinds(c.id).some((kind) => kind === 'winner')).length,
      },
      {
        label: 'Finalist only',
        value: creators.filter(
          (c) =>
            heldKinds(c.id).some((kind) => kind === 'finalist') &&
            !heldKinds(c.id).some((kind) => kind === 'winner'),
        ).length,
      },
      {
        label: 'No honour yet',
        value: creators.filter((c) => heldKinds(c.id).length === 0).length,
      },
    ],
  };
}

export type AwardsAnalytics = {
  participation: { label: string; value: number }[];
  conversion: { label: string; value: number }[];
  repeatWinners: number;
  firstTimeWinners: number;
  winnersByCategory: { label: string; value: number }[];
};

export async function getAwardsAnalytics(): Promise<AwardsAnalytics> {
  const [categories, winners, [candidacies], [finalists]] = await Promise.all([
    sql<{ label: string; value: number }[]>`
      select
        c.name as label,
        count(ca.id)::int as value
      from "Category" c
      left join "Candidacy" ca on ca."categoryId" = c.id
      group by c.id, c.name
    `,
    sql<{ creatorId: string; categoryName: string | null }[]>`
      select h."creatorId", cat.name as "categoryName"
      from "Honour" h
      left join "Category" cat on cat.id = h."categoryId"
      where h.kind = 'winner' and h.state = 'active'
    `,
    sql<[{ count: number }]>`
      select count(*)::int as count from "Candidacy"
    `,
    sql<[{ count: number }]>`
      select count(*)::int as count
      from "Honour"
      where kind = 'finalist' and state = 'active'
    `,
  ]);

  const winsPerCreator = new Map<string, number>();
  for (const winner of winners) {
    winsPerCreator.set(winner.creatorId, (winsPerCreator.get(winner.creatorId) ?? 0) + 1);
  }

  const byCategory = new Map<string, number>();
  for (const winner of winners) {
    // Winners only, so every row has a category. THE PALMA is not counted
    // here and should not be: it is not won in a category, and adding it to a
    // per-category breakdown would invent a thirteenth column.
    const name = winner.categoryName;
    if (!name) continue;
    byCategory.set(name, (byCategory.get(name) ?? 0) + 1);
  }

  return {
    participation: categories
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    conversion: [
      { label: 'Candidacies', value: candidacies.count },
      { label: 'Finalists', value: finalists.count },
      { label: 'Winners', value: winners.length },
    ],
    repeatWinners: [...winsPerCreator.values()].filter((count) => count > 1).length,
    firstTimeWinners: [...winsPerCreator.values()].filter((count) => count === 1).length,
    winnersByCategory: [...byCategory.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
  };
}

export type OperationalAnalytics = {
  claimOutcomes: { label: string; value: number }[];
  averageClaimReviewHours: number | null;
  verificationOutcomes: { label: string; value: number }[];
  averageVerificationHours: number | null;
  staffWorkload: { label: string; value: number }[];
  enforcement: { label: string; value: number }[];
};

export async function getOperationalAnalytics(): Promise<OperationalAnalytics> {
  const [claims, cases, audit, moderation] = await Promise.all([
    sql<{ status: string; createdAt: Date; decidedAt: Date | null; decidedByEmail: string | null }[]>`
      select
        cl.status,
        cl."createdAt",
        cl."decidedAt",
        u.email as "decidedByEmail"
      from "CreatorClaim" cl
      left join "User" u on u.id = cl."decidedById"
    `,
    sql<{ status: string; openedAt: Date; decidedAt: Date | null }[]>`
      select status, "openedAt", "decidedAt"
      from "VerificationCase"
    `,
    sql<{ actorLabel: string | null }[]>`
      select "actorLabel"
      from "AuditLog"
      where "actorLabel" is not null
      order by "createdAt" desc
      limit 5000
    `,
    sql<{ kind: string; count: number }[]>`
      select kind, count(*)::int as count
      from "ModerationAction"
      group by kind
    `,
  ]);

  const hours = (rows: { from: Date; to: Date | null }[]) => {
    const settled = rows.filter((row) => row.to);
    if (settled.length === 0) return null;
    const total = settled.reduce(
      (sum, row) => sum + (new Date(row.to as Date).getTime() - new Date(row.from).getTime()),
      0,
    );
    return Math.round((total / settled.length / 3_600_000) * 10) / 10;
  };

  const workload = new Map<string, number>();
  for (const entry of audit) {
    if (!entry.actorLabel) continue;
    workload.set(entry.actorLabel, (workload.get(entry.actorLabel) ?? 0) + 1);
  }

  const claimStatuses = new Map<string, number>();
  for (const claim of claims) {
    claimStatuses.set(claim.status, (claimStatuses.get(claim.status) ?? 0) + 1);
  }

  const caseStatuses = new Map<string, number>();
  for (const entry of cases) {
    caseStatuses.set(entry.status, (caseStatuses.get(entry.status) ?? 0) + 1);
  }

  return {
    claimOutcomes: [...claimStatuses.entries()].map(([label, value]) => ({ label, value })),
    averageClaimReviewHours: hours(
      claims.map((claim) => ({ from: claim.createdAt, to: claim.decidedAt })),
    ),
    verificationOutcomes: [...caseStatuses.entries()].map(([label, value]) => ({ label, value })),
    averageVerificationHours: hours(
      cases.map((entry) => ({ from: entry.openedAt, to: entry.decidedAt })),
    ),
    staffWorkload: [...workload.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    enforcement: moderation.map((row) => ({
      label: row.kind.replace(/_/g, ' '),
      value: row.count,
    })),
  };
}

/**
 * Category momentum.
 *
 * The one question a category list cannot answer on its own: which of these do
 * people actually want? Counts alone say which category is biggest, which is
 * mostly a fact about how long it has existed. Momentum compares a window
 * against the window immediately before it, and pairs that with how widely the
 * interest is spread — because a category surging on one creator's audience and
 * a category surging across forty are the same number and opposite findings.
 *
 * Internal only, and the module it calls into explains at length why. These
 * figures are for deciding what next season's categories should be, not for
 * ranking anybody, and nothing in the judging path reads them.
 */
export type MomentumReport = {
  /** The window these figures cover, and the one they are compared against. */
  window: { days: number; from: string; comparedFrom: string } | null;
  seasonYear: number | null;
  rows: CategoryMomentum[];
};

export async function getCategoryMomentum(period: Period): Promise<MomentumReport> {
  const [season] = await sql<{ id: string; year: number }[]>`
    select id, year
    from "AwardYear"
    where "isCurrent" = true
    limit 1
  `;

  if (!season) return { window: null, seasonYear: null, rows: [] };

  const since = await periodStart(period);

  // "All time" and "this season" have no earlier window to compare against, so
  // momentum is measured over the season's own length against the equivalent
  // stretch before it. A comparison against nothing is not a comparison.
  const days = since ? Math.max(1, Math.ceil((Date.now() - since.getTime()) / 86_400_000)) : 30;
  const from = since ?? new Date(Date.now() - days * 86_400_000);
  const comparedFrom = new Date(from.getTime() - days * 86_400_000);

  const categories = await sql<
    { id: string; name: string; slug: string; position: number; candidacyId: string | null; nominationCount: number | null }[]
  >`
    select
      c.id,
      c.name,
      c.slug,
      c.position,
      ca.id as "candidacyId",
      ca."nominationCount"
    from "Category" c
    left join "Candidacy" ca on ca."categoryId" = c.id
    where c."awardYearId" = ${season.id}
    order by c.position asc
  `;

  const byCategoryId = new Map<
    string,
    { id: string; name: string; slug: string; spread: number[] }
  >();
  const candidacyToCategory = new Map<string, string>();

  for (const row of categories) {
    const category =
      byCategoryId.get(row.id) ?? { id: row.id, name: row.name, slug: row.slug, spread: [] };
    if (row.candidacyId) {
      candidacyToCategory.set(row.candidacyId, row.id);
      category.spread.push(row.nominationCount ?? 0);
    }
    byCategoryId.set(row.id, category);
  }

  // One pass over the two windows rather than a query per category. Only
  // counted nominations are read: a nomination awaiting its verification code
  // is not yet a signal about anything, and a rejected one never was.
  const nominations =
    candidacyToCategory.size === 0
      ? []
      : await sql<{ candidacyId: string; nominatorId: string; createdAt: Date }[]>`
          select "candidacyId", "nominatorId", "createdAt"
          from "Nomination"
          where status = 'counted'
            and "candidacyId" in ${sql([...candidacyToCategory.keys()])}
            and "createdAt" >= ${comparedFrom}
          limit 50000
        `;

  const current = new Map<string, number>();
  const previous = new Map<string, number>();
  const nominators = new Map<string, Set<string>>();

  for (const row of nominations) {
    const categoryId = candidacyToCategory.get(row.candidacyId);
    if (!categoryId) continue;

    if (new Date(row.createdAt) >= from) {
      current.set(categoryId, (current.get(categoryId) ?? 0) + 1);
      const seen = nominators.get(categoryId) ?? new Set<string>();
      seen.add(row.nominatorId);
      nominators.set(categoryId, seen);
    } else {
      previous.set(categoryId, (previous.get(categoryId) ?? 0) + 1);
    }
  }

  const rows = [...byCategoryId.values()].map((category) =>
    momentumFor({
      categoryId: category.id,
      name: category.name,
      slug: category.slug,
      current: current.get(category.id) ?? 0,
      previous: previous.get(category.id) ?? 0,
      nominators: nominators.get(category.id)?.size ?? 0,
      // Concentration is read from the season's standing totals, not the
      // window: whether one creator holds a category is a fact about the
      // category, not about the last thirty days of it.
      spread: category.spread,
    }),
  );

  return {
    seasonYear: season.year,
    window: {
      days,
      from: from.toISOString(),
      comparedFrom: comparedFrom.toISOString(),
    },
    rows: byUrgency(rows),
  };
}
