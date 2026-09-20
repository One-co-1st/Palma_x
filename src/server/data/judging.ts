import 'server-only';
import { sql } from '@/server/db/sql';
import { prepareEligibility, caseIsClear, type CaseFacts, type EligibilityCheck } from '@/domain/case-file';
import { honourCategoryName, type HonourKind } from '@/domain/honours';

/**
 * The judging room's read layer.
 *
 * Two rules govern everything here. First, a judge may only ever load their
 * own work: the judgeId is part of the query, never a check applied after the
 * rows come back. Second, nomination volume never leaves this file — it is not
 * selected, not mapped, and not returned, so it cannot reach a judge's screen
 * by accident.
 */

/**
 * DateTime columns are `timestamp(3)` without time zone, holding UTC wall
 * clock. Render the same wall-clock UTC ISO string straight out of Postgres so
 * the DTOs do not depend on the session time zone. Returns a raw SQL fragment;
 * only ever called with static, quoted column references.
 */
const isoTs = (ref: string) =>
  sql.unsafe(`to_char(${ref}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);

export type AssignmentSummary = {
  id: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'recused' | 'reassigned';
  candidacyId: string;
  reference: string;
  creatorName: string;
  creatorSlug: string;
  categoryName: string;
  categorySlug: string;
  year: number;
  assignedAt: string;
  completedAt: string | null;
};

export type CategoryWorkload = {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  assigned: number;
  completed: number;
  /** The next case in this category awaiting the judge, if there is one. */
  nextAssignmentId: string | null;
};

export type JudgeOverview = {
  judgeName: string;
  isChair: boolean;
  season: {
    year: number;
    title: string;
    stage: string;
    closesAt: string | null;
    daysRemaining: number | null;
  };
  counts: { assigned: number; completed: number; remaining: number; recused: number };
  categories: CategoryWorkload[];
  toReview: AssignmentSummary[];
  inProgress: AssignmentSummary[];
  completed: AssignmentSummary[];
  recused: AssignmentSummary[];
  notifications: {
    id: string;
    subject: string;
    body: string;
    href: string | null;
    createdAt: string;
    readAt: string | null;
  }[];
};

function days(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

type SeasonRow = {
  id: string;
  year: number;
  title: string;
  stage: string;
  finalistsAt: string | null;
  ceremonyAt: string | null;
};

const SEASON_COLUMNS = sql`
  id, year, title, stage,
  ${isoTs('"finalistsAt"')} as "finalistsAt",
  ${isoTs('"ceremonyAt"')} as "ceremonyAt"
`;

export async function getJudgeOverview(
  judgeId: string,
  userId: string,
): Promise<JudgeOverview | null> {
  const [judge] = await sql<[{ displayName: string }]>`
    select "displayName" from "Judge" where id = ${judgeId} limit 1
  `;

  if (!judge) return null;

  const memberships = await sql<{ isChair: boolean; season: SeasonRow }[]>`
    select
      m."isChair",
      json_build_object(
        'id', ay.id,
        'year', ay.year,
        'title', ay.title,
        'stage', ay.stage,
        'finalistsAt', ${isoTs('ay."finalistsAt"')},
        'ceremonyAt', ${isoTs('ay."ceremonyAt"')}
      ) as season
    from "JudgePanelMembership" m
    join "AwardYear" ay on ay.id = m."awardYearId"
    where m."judgeId" = ${judgeId}
  `;

  // The season the judge is shown is the current one — unless they have no work
  // in it yet, in which case showing an empty page would be unhelpful and the
  // most recent season they actually judged is shown instead.
  const [currentSeason] = await sql<SeasonRow[]>`
    select ${SEASON_COLUMNS}
    from "AwardYear"
    where "isCurrent" = true
    limit 1
  `;

  const hasWorkInCurrent = currentSeason
    ? (
          await sql<[{ count: number }]>`
            select count(*)::int as count
            from "JudgingAssignment" ja
            join "Candidacy" c on c.id = ja."candidacyId"
            where ja."judgeId" = ${judgeId}
              and c."awardYearId" = ${currentSeason.id}
          `
        )[0].count > 0
    : false;

  const [latestSeason] = hasWorkInCurrent
    ? []
    : await sql<SeasonRow[]>`
        select
          ay.id, ay.year, ay.title, ay.stage,
          ${isoTs('ay."finalistsAt"')} as "finalistsAt",
          ${isoTs('ay."ceremonyAt"')} as "ceremonyAt"
        from "JudgingAssignment" ja
        join "Candidacy" c on c.id = ja."candidacyId"
        join "AwardYear" ay on ay.id = c."awardYearId"
        where ja."judgeId" = ${judgeId}
        order by ja."assignedAt" desc
        limit 1
      `;

  const current = hasWorkInCurrent
    ? currentSeason
    : (latestSeason ??
      currentSeason ??
      memberships.map((membership) => membership.season).sort((a, b) => b.year - a.year)[0] ??
      null);

  type AssignmentRow = {
    id: string;
    status: AssignmentSummary['status'];
    candidacyId: string;
    categoryId: string;
    assignedAt: string;
    completedAt: string | null;
    reference: string;
    creatorName: string;
    creatorSlug: string;
    categoryName: string;
    categorySlug: string;
    year: number;
  };

  const assignments = await sql<AssignmentRow[]>`
    select
      ja.id,
      ja.status,
      ja."candidacyId",
      ja."categoryId",
      ${isoTs('ja."assignedAt"')} as "assignedAt",
      ${isoTs('ja."completedAt"')} as "completedAt",
      c.reference,
      cr."displayName" as "creatorName",
      cr.slug as "creatorSlug",
      cat.name as "categoryName",
      cat.slug as "categorySlug",
      ay.year
    from "JudgingAssignment" ja
    join "Candidacy" c on c.id = ja."candidacyId"
    join "Creator" cr on cr.id = c."creatorId"
    join "Category" cat on cat.id = ja."categoryId"
    join "AwardYear" ay on ay.id = c."awardYearId"
    where ja."judgeId" = ${judgeId}
    ${current ? sql`and c."awardYearId" = ${current.id}` : sql``}
    order by ja."assignedAt" asc
  `;

  const notifications = await sql<
    {
      id: string;
      subject: string;
      body: string;
      href: string | null;
      createdAt: string;
      readAt: string | null;
    }[]
  >`
    select
      id, subject, body, href,
      ${isoTs('"createdAt"')} as "createdAt",
      ${isoTs('"readAt"')} as "readAt"
    from "Notification"
    where "userId" = ${userId}
    order by "createdAt" desc
    limit 6
  `;

  const map = (assignment: AssignmentRow): AssignmentSummary => ({
    id: assignment.id,
    status: assignment.status,
    candidacyId: assignment.candidacyId,
    reference: assignment.reference,
    creatorName: assignment.creatorName,
    creatorSlug: assignment.creatorSlug,
    categoryName: assignment.categoryName,
    categorySlug: assignment.categorySlug,
    year: assignment.year,
    assignedAt: assignment.assignedAt,
    completedAt: assignment.completedAt,
  });

  const toReview = assignments.filter((a) => a.status === 'assigned').map(map);
  const inProgress = assignments.filter((a) => a.status === 'in_progress').map(map);
  const completed = assignments.filter((a) => a.status === 'completed').map(map);
  const recused = assignments.filter((a) => a.status === 'recused').map(map);

  const byCategory = new Map<string, CategoryWorkload>();
  for (const assignment of assignments) {
    if (assignment.status === 'recused' || assignment.status === 'reassigned') continue;

    const existing = byCategory.get(assignment.categoryId) ?? {
      categoryId: assignment.categoryId,
      categoryName: assignment.categoryName,
      categorySlug: assignment.categorySlug,
      assigned: 0,
      completed: 0,
      nextAssignmentId: null,
    };

    existing.assigned += 1;
    if (assignment.status === 'completed') existing.completed += 1;
    else if (!existing.nextAssignmentId) existing.nextAssignmentId = assignment.id;

    byCategory.set(assignment.categoryId, existing);
  }

  const closesAt = current?.finalistsAt ?? current?.ceremonyAt ?? null;

  return {
    judgeName: judge.displayName,
    isChair: memberships.some((membership) => membership.isChair),
    season: {
      year: current?.year ?? new Date().getUTCFullYear(),
      title: current?.title ?? 'PALMA',
      stage: current?.stage ?? 'announced',
      closesAt,
      daysRemaining: closesAt ? Math.max(0, days(new Date(), new Date(closesAt))) : null,
    },
    counts: {
      assigned: toReview.length + inProgress.length + completed.length,
      completed: completed.length,
      remaining: toReview.length + inProgress.length,
      recused: recused.length,
    },
    categories: [...byCategory.values()].sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName),
    ),
    toReview,
    inProgress,
    completed,
    recused,
    notifications,
  };
}

export type JudgingCase = {
  assignmentId: string;
  status: string;
  candidacyId: string;
  reference: string;
  year: number;
  seasonTitle: string;

  category: { name: string; slug: string; criteria: string; eligibility: string };

  candidate: {
    name: string;
    slug: string;
    pronouns: string | null;
    country: string;
    city: string | null;
    headline: string | null;
    biography: string | null;
    isVerified: boolean;
    verifiedAt: string | null;
    links: { label: string; url: string }[];
    /** Previous PALMA recognition, with the code that makes each checkable. */
    palmaRecord: { year: number; kind: string; categoryName: string; code: string | null }[];
  };

  /** PALMA's own screening result, presented as a settled checklist. */
  eligibility: EligibilityCheck[];
  isClear: boolean;
  screenedAt: string | null;
  screeningNote: string | null;

  /** What the audience said — never how many said it. */
  audienceVoices: string[];

  evidence: { id: string; kind: string; label: string; url: string | null; note: string | null }[];

  alreadyScored: boolean;
  conflictDeclared: boolean;
};

/**
 * A judge may only ever load their own assignment. The judgeId is part of the
 * query, not checked afterwards.
 */
export async function getJudgingCase(
  assignmentId: string,
  judgeId: string,
): Promise<JudgingCase | null> {
  const [assignment] = await sql<
    {
      assignmentId: string;
      assignmentStatus: string;
      candidacyId: string;
      reference: string;
      candidacyStatus: string;
      firstNominatedAt: string | null;
      candidacyCreatedAt: string;
      integrityFlag: boolean;
      reviewedAt: string | null;
      reviewNote: string | null;
      year: number;
      seasonTitle: string;
      nominationsOpenAt: string | null;
      nominationsCloseAt: string | null;
      categoryName: string;
      categorySlug: string;
      categoryCriteria: string;
      categoryEligibility: string;
      creatorName: string;
      creatorSlug: string;
      pronouns: string | null;
      countryCode: string;
      city: string | null;
      headline: string | null;
      biography: string | null;
      verificationStatus: string | null;
      verifiedAt: string | null;
      alreadyScored: boolean;
      conflictDeclared: boolean;
    }[]
  >`
    select
      ja.id as "assignmentId",
      ja.status as "assignmentStatus",
      c.id as "candidacyId",
      c.reference,
      c.status as "candidacyStatus",
      ${isoTs('c."firstNominatedAt"')} as "firstNominatedAt",
      ${isoTs('c."createdAt"')} as "candidacyCreatedAt",
      c."integrityFlag",
      ${isoTs('c."reviewedAt"')} as "reviewedAt",
      c."reviewNote",
      ay.year,
      ay.title as "seasonTitle",
      ${isoTs('ay."nominationsOpenAt"')} as "nominationsOpenAt",
      ${isoTs('ay."nominationsCloseAt"')} as "nominationsCloseAt",
      cat.name as "categoryName",
      cat.slug as "categorySlug",
      cat."judgingCriteria" as "categoryCriteria",
      cat.eligibility as "categoryEligibility",
      cr."displayName" as "creatorName",
      cr.slug as "creatorSlug",
      cr.pronouns,
      cr."countryCode",
      cr.city,
      cr.headline,
      cr.biography,
      cv.status as "verificationStatus",
      ${isoTs('cv."verifiedAt"')} as "verifiedAt",
      exists(
        select 1 from "JudgingScore" s where s."assignmentId" = ja.id
      ) as "alreadyScored",
      exists(
        select 1 from "JudgeConflict" jc
        where jc."judgeId" = ${judgeId}
          and jc."candidacyId" = c.id
          and jc.status <> 'dismissed'
      ) as "conflictDeclared"
    from "JudgingAssignment" ja
    join "Candidacy" c on c.id = ja."candidacyId"
    join "AwardYear" ay on ay.id = c."awardYearId"
    join "Category" cat on cat.id = ja."categoryId"
    join "Creator" cr on cr.id = c."creatorId"
    left join "CreatorVerification" cv on cv."creatorId" = cr.id
    where ja.id = ${assignmentId}
      and ja."judgeId" = ${judgeId}
    limit 1
  `;

  if (!assignment) return null;

  const [evidence, links, achievements, honours, nominations] = await Promise.all([
    sql<{ id: string; kind: string; label: string; url: string | null; note: string | null }[]>`
      select id, kind, label, url, note
      from "CandidacyEvidence"
      where "candidacyId" = ${assignment.candidacyId}
      order by "createdAt" asc
    `,
    sql<{ label: string; url: string }[]>`
      select label, url
      from "CreatorLink"
      where "creatorId" = (select "creatorId" from "Candidacy" where id = ${assignment.candidacyId})
      order by position asc
    `,
    sql<{ code: string; year: number; categoryName: string }[]>`
      select code, year, "categoryName"
      from "Achievement"
      where "creatorId" = (select "creatorId" from "Candidacy" where id = ${assignment.candidacyId})
    `,
    sql<{ year: number; kind: HonourKind; categoryName: string | null }[]>`
      select ay.year, h.kind, cat.name as "categoryName"
      from "Honour" h
      join "AwardYear" ay on ay.id = h."awardYearId"
      left join "Category" cat on cat.id = h."categoryId"
      where h."creatorId" = (select "creatorId" from "Candidacy" where id = ${assignment.candidacyId})
        and h.state = 'active'
      order by h."createdAt" desc
    `,
    // A handful of nomination reasons, oldest first, with no count and
    // no nominator attached: judges see the argument, not the crowd.
    sql<{ reason: string }[]>`
      select reason
      from "Nomination"
      where "candidacyId" = ${assignment.candidacyId}
        and status = 'counted'
      order by "countedAt" asc
      limit 5
    `,
  ]);

  const openedAt = assignment.nominationsOpenAt;
  const closedAt = assignment.nominationsCloseAt;
  const nominatedAt = assignment.firstNominatedAt ?? assignment.candidacyCreatedAt;
  const withinSubmissionWindow =
    (!openedAt || nominatedAt >= openedAt) && (!closedAt || nominatedAt <= closedAt);

  const eligibility = prepareEligibility({
    verificationStatus: (assignment.verificationStatus ??
      'unverified') as CaseFacts['verificationStatus'],
    verifiedAt: assignment.verifiedAt,
    candidacyStatus: assignment.candidacyStatus as CaseFacts['candidacyStatus'],
    withinSubmissionWindow,
    evidenceCount: evidence.length,
    hasNominationReason: nominations.length > 0,
    integrityFlag: assignment.integrityFlag,
    reviewedAt: assignment.reviewedAt,
  });

  return {
    assignmentId: assignment.assignmentId,
    status: assignment.assignmentStatus,
    candidacyId: assignment.candidacyId,
    reference: assignment.reference,
    year: assignment.year,
    seasonTitle: assignment.seasonTitle,

    category: {
      name: assignment.categoryName,
      slug: assignment.categorySlug,
      criteria: assignment.categoryCriteria,
      eligibility: assignment.categoryEligibility,
    },

    candidate: {
      name: assignment.creatorName,
      slug: assignment.creatorSlug,
      pronouns: assignment.pronouns,
      country: assignment.countryCode,
      city: assignment.city,
      headline: assignment.headline,
      biography: assignment.biography,
      isVerified: assignment.verificationStatus === 'verified',
      verifiedAt: assignment.verifiedAt,
      links,
      palmaRecord: honours.map((honour) => ({
        year: honour.year,
        kind: honour.kind,
        categoryName: honourCategoryName(honour.kind, honour.categoryName),
        code:
          achievements.find(
            (achievement) =>
              achievement.year === honour.year &&
              achievement.categoryName ===
                honourCategoryName(honour.kind, honour.categoryName),
          )?.code ?? null,
      })),
    },

    eligibility,
    isClear: caseIsClear(eligibility),
    screenedAt: assignment.reviewedAt,
    screeningNote: assignment.reviewNote,

    audienceVoices: nominations.map((entry) => entry.reason),

    evidence,

    alreadyScored: assignment.alreadyScored,
    conflictDeclared: assignment.conflictDeclared || assignment.assignmentStatus === 'recused',
  };
}

export type JudgeHistorySeason = {
  year: number;
  title: string;
  categories: { categoryName: string; assigned: number; completed: number }[];
  completed: number;
  assigned: number;
};

/** The judge's institutional record. Not a trophy cabinet — a service record. */
export async function getJudgeHistory(judgeId: string): Promise<JudgeHistorySeason[]> {
  const assignments = await sql<
    { status: string; year: number; title: string; categoryName: string }[]
  >`
    select
      ja.status,
      ay.year,
      ay.title,
      cat.name as "categoryName"
    from "JudgingAssignment" ja
    join "Candidacy" c on c.id = ja."candidacyId"
    join "AwardYear" ay on ay.id = c."awardYearId"
    join "Category" cat on cat.id = ja."categoryId"
    where ja."judgeId" = ${judgeId}
      and ja.status in ('assigned', 'in_progress', 'completed')
  `;

  const seasons = new Map<
    number,
    JudgeHistorySeason & { byCategory: Map<string, [number, number]> }
  >();

  for (const assignment of assignments) {
    const { year, title } = assignment;
    const season = seasons.get(year) ?? {
      year,
      title,
      categories: [],
      completed: 0,
      assigned: 0,
      byCategory: new Map<string, [number, number]>(),
    };

    season.assigned += 1;
    if (assignment.status === 'completed') season.completed += 1;

    const [assigned, completed] = season.byCategory.get(assignment.categoryName) ?? [0, 0];
    season.byCategory.set(assignment.categoryName, [
      assigned + 1,
      completed + (assignment.status === 'completed' ? 1 : 0),
    ]);

    seasons.set(year, season);
  }

  return [...seasons.values()]
    .map((season) => ({
      year: season.year,
      title: season.title,
      assigned: season.assigned,
      completed: season.completed,
      categories: [...season.byCategory.entries()]
        .map(([categoryName, [assigned, completed]]) => ({ categoryName, assigned, completed }))
        .sort((a, b) => a.categoryName.localeCompare(b.categoryName)),
    }))
    .sort((a, b) => b.year - a.year);
}

export type JudgeAccount = {
  displayName: string;
  title: string | null;
  organisation: string | null;
  biography: string | null;
  countryCode: string | null;
  email: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  seatedSince: string;
  seasons: { year: number; isChair: boolean }[];
  sessions: {
    id: string;
    userAgent: string | null;
    createdAt: string;
    expiresAt: string;
    isCurrent: boolean;
  }[];
};

export async function getJudgeAccount(
  judgeId: string,
  userId: string,
  currentSessionId: string | null,
): Promise<JudgeAccount | null> {
  const [judge] = await sql<
    {
      displayName: string;
      title: string | null;
      organisation: string | null;
      biography: string | null;
      countryCode: string | null;
      createdAt: string;
      email: string;
      emailVerifiedAt: Date | null;
      lastLoginAt: string | null;
    }[]
  >`
    select
      j."displayName",
      j.title,
      j.organisation,
      j.biography,
      j."countryCode",
      ${isoTs('j."createdAt"')} as "createdAt",
      u.email,
      u."emailVerifiedAt",
      ${isoTs('u."lastLoginAt"')} as "lastLoginAt"
    from "Judge" j
    join "User" u on u.id = j."userId"
    where j.id = ${judgeId}
    limit 1
  `;

  if (!judge) return null;

  const [memberships, sessions] = await Promise.all([
    sql<{ year: number; isChair: boolean }[]>`
      select ay.year, m."isChair"
      from "JudgePanelMembership" m
      join "AwardYear" ay on ay.id = m."awardYearId"
      where m."judgeId" = ${judgeId}
    `,
    sql<{ id: string; userAgent: string | null; createdAt: string; expiresAt: string }[]>`
      select
        id,
        "userAgent",
        ${isoTs('"createdAt"')} as "createdAt",
        ${isoTs('"expiresAt"')} as "expiresAt"
      from "AuthSession"
      where "userId" = ${userId}
        and "revokedAt" is null
        and "expiresAt" > ${new Date()}
      order by "createdAt" desc
      limit 10
    `,
  ]);

  return {
    displayName: judge.displayName,
    title: judge.title,
    organisation: judge.organisation,
    biography: judge.biography,
    countryCode: judge.countryCode,
    email: judge.email,
    emailVerified: Boolean(judge.emailVerifiedAt),
    lastLoginAt: judge.lastLoginAt,
    seatedSince: judge.createdAt,
    seasons: memberships
      .map((membership) => ({ year: membership.year, isChair: membership.isChair }))
      .sort((a, b) => b.year - a.year),
    sessions: sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: session.id === currentSessionId,
    })),
  };
}
