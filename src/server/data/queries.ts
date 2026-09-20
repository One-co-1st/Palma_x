import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { sql } from '@/server/db/sql';
import type { SeasonStage } from '@/domain/season';
import { finalistsArePublic, winnersArePublic } from '@/domain/season';
import {
  honourCategoryName,
  honourCategorySlug,
  HONOUR_STANDING,
  matchesAchievementSlug,
} from '@/domain/honours';
import type {
  AchievementRecord,
  ArticleDetail,
  ArticleSummary,
  CategoryOutcome,
  PalmaLaureate,
  CategoryView,
  CreatorProfile,
  CreatorSummary,
  FinalistView,
  HonourEntry,
  JudgeView,
  RollOfHonourYear,
  SeasonStats,
  SeasonView,
  SponsorView,
} from './types';

/**
 * The read surface of PALMA.
 *
 * Every public page reads through this module, and every one of these queries
 * goes to PostgreSQL. There is no second source: a name on this site is there
 * because it is in the database, and nowhere else. The seed dataset exists
 * only to populate that database — it is never read at runtime.
 */

/**
 * DateTime columns are `timestamp(3)` without time zone, holding UTC wall
 * clock. Render the same wall-clock UTC ISO string straight out of Postgres so the
 * DTOs do not depend on the session time zone. Returns a raw SQL fragment;
 * only ever called with static, quoted column references.
 */
const isoTs = (ref: string) =>
  sql.unsafe(`to_char(${ref}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);

const iso = (value: Date | string | null | undefined) => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

/**
 * A substring filter escapes LIKE metacharacters before matching; ILIKE with
 * the default backslash escape behaves the same way.
 */
const likePattern = (value: string) => `%${value.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;

/**
 * Public read cache.
 *
 * React `cache` dedupes inside one render; `unstable_cache` carries the same
 * public answer across requests and serverless isolates. These are all
 * anonymous reads — no session, cookie or request header reaches this module.
 */
const publicData = <Args extends unknown[], Result>(
  key: string,
  read: (...args: Args) => Promise<Result>,
  revalidate = 900,
) => cache(unstable_cache(read, [`palma:${key}`], { revalidate }));

// ── Seasons ──────────────────────────────────────────────────────────────────

type SeasonRow = {
  id: string;
  year: number;
  title: string;
  stage: string;
  tagline: string | null;
  summary: string | null;
  nominationsOpenAt: string | null;
  nominationsCloseAt: string | null;
  shortlistAt: string | null;
  finalistsAt: string | null;
  ceremonyAt: string | null;
  isCurrent: boolean;
  categoryCount: number;
};

export const listSeasons = publicData('seasons', async (): Promise<SeasonView[]> => {
  const rows = await sql<SeasonRow[]>`
    SELECT
      ay."id",
      ay."year",
      ay."title",
      ay."stage",
      ay."tagline",
      ay."summary",
      ${isoTs('ay."nominationsOpenAt"')} AS "nominationsOpenAt",
      ${isoTs('ay."nominationsCloseAt"')} AS "nominationsCloseAt",
      ${isoTs('ay."shortlistAt"')} AS "shortlistAt",
      ${isoTs('ay."finalistsAt"')} AS "finalistsAt",
      ${isoTs('ay."ceremonyAt"')} AS "ceremonyAt",
      ay."isCurrent",
      (SELECT count(*)::int FROM "Category" c WHERE c."awardYearId" = ay."id") AS "categoryCount"
    FROM "AwardYear" ay
    ORDER BY ay."year" DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    year: row.year,
    title: row.title,
    stage: row.stage as SeasonStage,
    tagline: row.tagline,
    summary: row.summary,
    nominationsOpenAt: iso(row.nominationsOpenAt),
    nominationsCloseAt: iso(row.nominationsCloseAt),
    shortlistAt: iso(row.shortlistAt),
    finalistsAt: iso(row.finalistsAt),
    ceremonyAt: iso(row.ceremonyAt),
    isCurrent: row.isCurrent,
    categoryCount: row.categoryCount,
  }));
});

export const getSeason = cache(async (year: number): Promise<SeasonView | null> => {
  const all = await listSeasons();
  return all.find((season) => season.year === year) ?? null;
});

export const getCurrentSeason = cache(async (): Promise<SeasonView> => {
  const all = await listSeasons();
  return all.find((season) => season.isCurrent) ?? all[0]!;
});

// ── Categories ───────────────────────────────────────────────────────────────

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  strapline: string | null;
  description: string;
  eligibility: string;
  judgingCriteria: string;
  isOpen: boolean;
  position: number;
  year: number;
  stage: string;
  partner: { name: string; slug: string } | null;
};

export const listCategories = publicData('categories', async (year: number): Promise<CategoryView[]> => {
  const rows = await sql<CategoryRow[]>`
    SELECT
      c."id",
      c."slug",
      c."name",
      c."strapline",
      c."description",
      c."eligibility",
      c."judgingCriteria",
      c."isOpen",
      c."position",
      ay."year",
      ay."stage",
      -- Only an approved association, with a live sponsor, and only a category
      -- placement. An unapproved sponsorship is a conversation, and a logo on
      -- the strength of one is a claim PALMA cannot support.
      (
        SELECT json_build_object('name', s."name", 'slug', s."slug")
        FROM "Sponsorship" sp
        JOIN "Sponsor" s ON s."id" = sp."sponsorId"
        WHERE sp."categoryId" = c."id"
          AND sp."isApproved"
          AND sp."placement" = 'category'
          AND s."status" = 'active'
          AND s."isActive"
        LIMIT 1
      ) AS "partner"
    FROM "Category" c
    JOIN "AwardYear" ay ON ay."id" = c."awardYearId"
    WHERE ay."year" = ${year}
    ORDER BY c."position" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    strapline: row.strapline,
    description: row.description,
    eligibility: row.eligibility,
    judgingCriteria: row.judgingCriteria,
    isOpen: row.isOpen,
    position: row.position,
    year: row.year,
    stage: row.stage as SeasonStage,
    partner: row.partner ? { name: row.partner.name, slug: row.partner.slug } : null,
  }));
});

export const getCategory = cache(
  async (year: number, slug: string): Promise<CategoryView | null> => {
    const all = await listCategories(year);
    return all.find((category) => category.slug === slug) ?? null;
  },
);

/** The canonical, season-independent list of category slugs and names. */
export const listCategoryIndex = cache(
  async (): Promise<{ slug: string; name: string; strapline: string | null }[]> => {
    const season = await getCurrentSeason();
    const all = await listCategories(season.year);
    return all.map((category) => ({
      slug: category.slug,
      name: category.name,
      strapline: category.strapline,
    }));
  },
);

// ── Creators ─────────────────────────────────────────────────────────────────

export type CreatorFilter = {
  query?: string;
  country?: string;
  honoursOnly?: boolean;
  limit?: number;
};

type CreatorSummaryRow = {
  id: string;
  slug: string;
  displayName: string;
  countryCode: string;
  headline: string | null;
  portraitUrl: string | null;
  portraitAlt: string | null;
  verificationStatus: string | null;
  honourCount: number;
  winCount: number;
};

export const listCreators = publicData('creators', async (filter: CreatorFilter = {}): Promise<CreatorSummary[]> => {
  const rows = await sql<CreatorSummaryRow[]>`
    SELECT
      c."id",
      c."slug",
      c."displayName",
      c."countryCode",
      c."headline",
      c."portraitUrl",
      c."portraitAlt",
      v."status" AS "verificationStatus",
      (SELECT count(*)::int FROM "Honour" h
        WHERE h."creatorId" = c."id" AND h."state" = 'active') AS "honourCount",
      (SELECT count(*)::int FROM "Honour" h
        WHERE h."creatorId" = c."id" AND h."state" = 'active' AND h."kind" = 'winner') AS "winCount"
    FROM "Creator" c
    LEFT JOIN "CreatorVerification" v ON v."creatorId" = c."id"
    WHERE c."isPublished"
      AND NOT c."isSuspended"
      ${filter.country ? sql`AND c."countryCode" = ${filter.country.toUpperCase()}` : sql``}
      ${filter.query
        ? sql`AND (
            c."displayName" ILIKE ${likePattern(filter.query)}
            OR c."headline" ILIKE ${likePattern(filter.query)}
          )`
        : sql``}
      ${filter.honoursOnly
        ? sql`AND EXISTS (SELECT 1 FROM "Honour" h WHERE h."creatorId" = c."id" AND h."state" = 'active')`
        : sql``}
    ORDER BY c."displayName" ASC
    LIMIT ${filter.limit ?? 60}
  `;

  return rows
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      displayName: row.displayName,
      countryCode: row.countryCode,
      headline: row.headline,
      portraitUrl: row.portraitUrl,
      portraitAlt: row.portraitAlt,
      verificationStatus: (row.verificationStatus ??
        'unverified') as CreatorSummary['verificationStatus'],
      honourCount: row.honourCount,
      winCount: row.winCount,
    }))
    .sort((a, b) =>
      b.winCount !== a.winCount ? b.winCount - a.winCount : b.honourCount - a.honourCount,
    );
});

/**
 * One honour, addressed by its quotable slug.
 *
 * Built on `getCreator` rather than its own query, so the credential page and
 * the creator's record can never disagree about what somebody holds: they read
 * the same rows through the same cache.
 *
 * Revoked honours resolve deliberately. A link a creator has already put in a
 * press kit must not 404 the day an honour is withdrawn — the page has to be
 * able to say it was revoked, which is the whole reason the record keeps
 * revoked rows rather than deleting them.
 */
export const getCreatorAchievement = cache(
  async (
    creatorSlug: string,
    honourSlug: string,
  ): Promise<{ creator: CreatorProfile; honour: HonourEntry } | null> => {
    const creator = await getCreator(creatorSlug);
    if (!creator) return null;

    const matches = creator.record.filter((honour) =>
      matchesAchievementSlug(
        { kind: honour.kind, categorySlug: honour.categorySlug, year: honour.year },
        honourSlug,
      ),
    );
    if (matches.length === 0) return null;

    // Highest standing wins where a creator holds more than one honour in the
    // same contest: pointing somebody at a finalist record when they won it is
    // the worse of the two mistakes.
    const honour = [...matches].sort(
      (a, b) => HONOUR_STANDING[b.kind] - HONOUR_STANDING[a.kind],
    )[0]!;

    return { creator, honour };
  },
);

type CreatorHonourJson = {
  id: string;
  kind: HonourEntry['kind'];
  state: HonourEntry['state'];
  citation: string | null;
  announcedAt: string | null;
  position: number;
  categoryName: string | null;
  categorySlug: string | null;
  year: number;
  stage: string;
  code: string | null;
};

type CreatorRow = {
  id: string;
  slug: string;
  displayName: string;
  countryCode: string;
  city: string | null;
  pronouns: string | null;
  headline: string | null;
  biography: string | null;
  portraitUrl: string | null;
  portraitAlt: string | null;
  websiteUrl: string | null;
  isPublished: boolean;
  userId: string | null;
  verificationStatus: string | null;
  links: { label: string; url: string }[];
  honours: CreatorHonourJson[];
};

export const getCreator = publicData('creator', async (slug: string): Promise<CreatorProfile | null> => {
  const rows = await sql<CreatorRow[]>`
    SELECT
      c."id",
      c."slug",
      c."displayName",
      c."countryCode",
      c."city",
      c."pronouns",
      c."headline",
      c."biography",
      c."portraitUrl",
      c."portraitAlt",
      c."websiteUrl",
      c."isPublished",
      c."userId",
      v."status" AS "verificationStatus",
      (
        SELECT COALESCE(
          json_agg(json_build_object('label', l."label", 'url', l."url") ORDER BY l."position" ASC),
          '[]'::json
        )
        FROM "CreatorLink" l
        WHERE l."creatorId" = c."id"
      ) AS "links",
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', h."id",
              'kind', h."kind",
              'state', h."state",
              'citation', h."citation",
              'announcedAt', ${isoTs('h."announcedAt"')},
              'position', h."position",
              'categoryName', cat."name",
              'categorySlug', cat."slug",
              'year', ay."year",
              'stage', ay."stage",
              'code', ach."code"
            )
            ORDER BY h."createdAt" DESC
          ),
          '[]'::json
        )
        FROM "Honour" h
        JOIN "AwardYear" ay ON ay."id" = h."awardYearId"
        LEFT JOIN "Category" cat ON cat."id" = h."categoryId"
        LEFT JOIN "Achievement" ach ON ach."honourId" = h."id"
        WHERE h."creatorId" = c."id"
      ) AS "honours"
    FROM "Creator" c
    LEFT JOIN "CreatorVerification" v ON v."creatorId" = c."id"
    WHERE c."slug" = ${slug}
  `;

  const row = rows[0];
  if (!row || !row.isPublished) return null;

  const record: HonourEntry[] = row.honours
    .filter(
      (honour) =>
        winnersArePublic(honour.stage as SeasonStage) || honour.kind !== 'winner',
    )
    .map((honour) => ({
      id: honour.id,
      kind: honour.kind,
      state: honour.state,
      year: honour.year,
      categoryName: honourCategoryName(honour.kind, honour.categoryName),
      categorySlug: honourCategorySlug(honour.kind, honour.categorySlug),
      citation: honour.citation,
      announcedAt: iso(honour.announcedAt),
      code: honour.code,
      position: honour.position,
    }))
    .sort((a, b) => b.year - a.year);

  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    countryCode: row.countryCode,
    city: row.city,
    pronouns: row.pronouns,
    headline: row.headline,
    biography: row.biography,
    portraitUrl: row.portraitUrl,
    portraitAlt: row.portraitAlt,
    websiteUrl: row.websiteUrl,
    links: row.links.map((link) => ({ label: link.label, url: link.url })),
    verificationStatus: (row.verificationStatus ??
      'unverified') as CreatorSummary['verificationStatus'],
    // `userId` is the truth about who holds a record. The `isClaimed` column is
    // a denormalised convenience written on approval, and a boolean that can
    // drift from the relation it summarises is not a source of truth.
    isClaimed: row.userId !== null,
    record,
    honourCount: record.filter((entry) => entry.state === 'active').length,
    winCount: record.filter((entry) => entry.kind === 'winner' && entry.state === 'active').length,
  };
});

// ── Honours ──────────────────────────────────────────────────────────────────

type HonourRow = {
  kind: HonourEntry['kind'];
  year: number;
  categorySlug: string;
  categoryName: string;
  creatorSlug: string;
  citation: string | null;
  code: string | null;
  position: number;
  announcedAt: string | null;
};

type HonourQueryRow = {
  kind: string;
  citation: string | null;
  position: number;
  announcedAt: string | null;
  year: number;
  stage: string;
  categoryName: string | null;
  categorySlug: string | null;
  creatorSlug: string;
  code: string | null;
};

const honourRows = cache(async (year?: number, kind?: HonourEntry['kind']): Promise<HonourRow[]> => {
  const rows = await sql<HonourQueryRow[]>`
    SELECT
      h."kind",
      h."citation",
      h."position",
      ${isoTs('h."announcedAt"')} AS "announcedAt",
      ay."year",
      ay."stage",
      cat."name" AS "categoryName",
      cat."slug" AS "categorySlug",
      cr."slug" AS "creatorSlug",
      ach."code"
    FROM "Honour" h
    JOIN "AwardYear" ay ON ay."id" = h."awardYearId"
    LEFT JOIN "Category" cat ON cat."id" = h."categoryId"
    JOIN "Creator" cr ON cr."id" = h."creatorId"
    LEFT JOIN "Achievement" ach ON ach."honourId" = h."id"
    WHERE h."state" = 'active'
      ${kind ? sql`AND h."kind" = ${kind}` : sql``}
      ${year ? sql`AND ay."year" = ${year}` : sql``}
    ORDER BY h."position" ASC
  `;

  return rows
    .filter((row) =>
      row.kind === 'winner'
        ? winnersArePublic(row.stage as SeasonStage)
        : finalistsArePublic(row.stage as SeasonStage),
    )
    .map((row) => ({
      kind: row.kind as HonourEntry['kind'],
      year: row.year,
      categorySlug: honourCategorySlug(row.kind as HonourEntry['kind'], row.categorySlug),
      categoryName: honourCategoryName(row.kind as HonourEntry['kind'], row.categoryName),
      creatorSlug: row.creatorSlug,
      citation: row.citation,
      code: row.code,
      position: row.position,
      announcedAt: iso(row.announcedAt),
    }));
});

const creatorIndex = cache(async (): Promise<Map<string, CreatorSummary>> => {
  const all = await listCreators({ limit: 500 });
  return new Map(all.map((creator) => [creator.slug, creator]));
});

/**
 * THE PALMA of a season, if it has been conferred.
 *
 * Deliberately not part of `listSeasonOutcomes`. That function returns the
 * categories of a season, and THE PALMA is not one of them: a surface that
 * wants it has to ask for it, which is what stops it being rendered through
 * the same loop as the twelve and coming out looking like the thirteenth.
 */
export const getThePalma = publicData('the-palma', async (year: number): Promise<PalmaLaureate | null> => {
  const row = (await honourRows(year)).find((entry) => entry.kind === 'the_palma');
  if (!row) return null;

  const creator = (await creatorIndex()).get(row.creatorSlug);
  if (!creator) return null;

  return {
    year,
    creator,
    citation: row.citation ?? '',
    code: row.code,
    announcedAt: row.announcedAt,
  };
});

export const getCategoryOutcome = publicData(
  'category-outcome',
  async (year: number, categorySlug: string): Promise<CategoryOutcome | null> => {
    const category = await getCategory(year, categorySlug);
    if (!category) return null;

    const rows = (await honourRows(year)).filter((row) => row.categorySlug === categorySlug);
    const index = await creatorIndex();

    const finalists: FinalistView[] = rows
      .filter((row) => row.kind === 'finalist')
      .sort((a, b) => a.position - b.position)
      .map((row, i) => ({
        position: i + 1,
        creator: index.get(row.creatorSlug)!,
        citation: row.citation,
      }))
      .filter((entry) => Boolean(entry.creator));

    const winnerRow = rows.find((row) => row.kind === 'winner');
    const winner =
      winnerRow && index.get(winnerRow.creatorSlug)
        ? {
            position: 1,
            creator: index.get(winnerRow.creatorSlug)!,
            citation: winnerRow.citation,
            code: winnerRow.code,
          }
        : null;

    return { category, finalists, winner };
  },
);

export const listSeasonOutcomes = publicData('season-outcomes', async (year: number): Promise<CategoryOutcome[]> => {
  const categories = await listCategories(year);
  const outcomes = await Promise.all(
    categories.map((category) => getCategoryOutcome(year, category.slug)),
  );
  return outcomes.filter((outcome): outcome is CategoryOutcome => outcome !== null);
});

export type RollFilter = { year?: number; category?: string; country?: string; query?: string };

export const getRollOfHonour = publicData(
  'roll-of-honour',
  async (filter: RollFilter = {}): Promise<RollOfHonourYear[]> => {
    const rows = await honourRows(filter.year, 'winner');
    const index = await creatorIndex();
    const seasons = await listSeasons();

    const filtered = rows.filter((row) => {
      const creator = index.get(row.creatorSlug);
      if (!creator) return false;
      if (filter.category && row.categorySlug !== filter.category) return false;
      if (filter.country && creator.countryCode !== filter.country.toUpperCase()) return false;
      if (filter.query) {
        const needle = filter.query.toLowerCase();
        if (
          !creator.displayName.toLowerCase().includes(needle) &&
          !row.categoryName.toLowerCase().includes(needle)
        ) {
          return false;
        }
      }
      return true;
    });

    const byYear = new Map<number, RollOfHonourYear>();
    for (const row of filtered) {
      const creator = index.get(row.creatorSlug)!;
      const season = seasons.find((entry) => entry.year === row.year);
      const bucket = byYear.get(row.year) ?? {
        year: row.year,
        title: season?.title ?? `PALMA ${row.year}`,
        laureate: null,
        entries: [],
      };
      bucket.entries.push({
        year: row.year,
        categoryName: row.categoryName,
        categorySlug: row.categorySlug,
        creator,
        code: row.code,
        citation: row.citation,
      });
      byYear.set(row.year, bucket);
    }

    // THE PALMA is attached to its year rather than pushed into `entries`.
    // The PaROH is the permanent record and it belongs there, but a laureate
    // listed among the category winners is exactly the flattening this honour
    // is not supposed to suffer: the page renders it above them, not among
    // them. Filters that narrow to a category or a search term drop it, because
    // it is in no category and a filtered list should not carry a row that does
    // not match.
    const unfiltered = !filter.category && !filter.query && !filter.country;

    const years = [...byYear.values()];
    if (unfiltered) {
      const laureates = new Map(
        (await honourRows(filter.year, 'the_palma')).map((row) => [row.year, row]),
      );
      const index = await creatorIndex();
      for (const entry of years) {
        const row = laureates.get(entry.year);
        const creator = row ? index.get(row.creatorSlug) : undefined;
        entry.laureate = row && creator
          ? {
              year: entry.year,
              creator,
              citation: row.citation ?? '',
              code: row.code,
              announcedAt: row.announcedAt,
            }
          : null;
      }
    }

    return years
      .map((entry) => ({
        ...entry,
        entries: entry.entries.sort((a, b) => a.categoryName.localeCompare(b.categoryName)),
      }))
      .sort((a, b) => b.year - a.year);
  },
);

export const listRecentHonours = publicData('recent-honours', async (limit: number = 6) => {
  const rows = await honourRows();
  const index = await creatorIndex();
  return rows
    .filter((row) => index.has(row.creatorSlug))
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (a.kind !== b.kind) return a.kind === 'winner' ? -1 : 1;
      return a.categoryName.localeCompare(b.categoryName);
    })
    .slice(0, limit)
    .map((row) => ({
      kind: row.kind,
      year: row.year,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      code: row.code,
      creator: index.get(row.creatorSlug)!,
    }));
});

// ── Verification ─────────────────────────────────────────────────────────────

type AchievementRow = {
  signature: string;
  payloadDigest: string;
  code: string;
  kind: string;
  state: string;
  year: number;
  categoryName: string;
  creatorName: string;
  creatorSlug: string;
  issuedAt: string;
  revokedAt: string | null;
  creatorProfileSlug: string;
  creatorCountry: string;
  honourKind: string;
  honourCategorySlug: string | null;
  citation: string | null;
};

export const getAchievementByCode = publicData(
  'achievement-by-code',
  async (code: string): Promise<AchievementRecord | null> => {
    const rows = await sql<AchievementRow[]>`
      SELECT
        vr."signature",
        vr."payloadDigest",
        a."code",
        a."kind",
        a."state",
        a."year",
        a."categoryName",
        a."creatorName",
        a."creatorSlug",
        ${isoTs('a."issuedAt"')} AS "issuedAt",
        ${isoTs('a."revokedAt"')} AS "revokedAt",
        cr."slug" AS "creatorProfileSlug",
        cr."countryCode" AS "creatorCountry",
        h."kind" AS "honourKind",
        cat."slug" AS "honourCategorySlug",
        h."citation"
      FROM "VerificationRecord" vr
      JOIN "Achievement" a ON a."id" = vr."achievementId"
      JOIN "Creator" cr ON cr."id" = a."creatorId"
      JOIN "Honour" h ON h."id" = a."honourId"
      LEFT JOIN "Category" cat ON cat."id" = h."categoryId"
      WHERE vr."code" = ${code}
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      code: row.code,
      kind: row.kind as AchievementRecord['kind'],
      state: row.state as AchievementRecord['state'],
      year: row.year,
      categoryName: row.categoryName,
      categorySlug: honourCategorySlug(
        row.honourKind as AchievementRecord['kind'],
        row.honourCategorySlug,
      ),
      creatorName: row.creatorName,
      // What was sealed, not where the person lives now. These are the same
      // string today and must not be assumed to be tomorrow: one is part of
      // the signature and the other is a link.
      creatorSlug: row.creatorSlug,
      creatorProfileSlug: row.creatorProfileSlug,
      creatorCountry: row.creatorCountry,
      citation: row.citation,
      issuedAt: iso(row.issuedAt)!,
      revokedAt: iso(row.revokedAt),
      signature: row.signature,
      payloadDigest: row.payloadDigest,
    };
  },
);

// ── Journal ──────────────────────────────────────────────────────────────────

type ArticleSummaryRow = {
  slug: string;
  title: string;
  standfirst: string;
  authorName: string;
  publishedAt: string | null;
  readingMinutes: number;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  category: string | null;
  categorySlug: string | null;
};

export const listArticles = publicData(
  'articles',
  async (options: { category?: string; limit?: number } = {}): Promise<ArticleSummary[]> => {
    const rows = await sql<ArticleSummaryRow[]>`
      SELECT
        a."slug",
        a."title",
        a."standfirst",
        a."authorName",
        ${isoTs('a."publishedAt"')} AS "publishedAt",
        a."readingMinutes",
        a."heroImageUrl",
        a."heroImageAlt",
        ac."name" AS "category",
        ac."slug" AS "categorySlug"
      FROM "Article" a
      LEFT JOIN "ArticleCategory" ac ON ac."id" = a."categoryId"
      WHERE a."status" = 'published'
        AND a."publishedAt" <= timezone('UTC', now())
        ${options.category ? sql`AND ac."slug" = ${options.category}` : sql``}
      ORDER BY a."publishedAt" DESC
      LIMIT ${options.limit ?? 24}
    `;

    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      standfirst: row.standfirst,
      category: row.category,
      categorySlug: row.categorySlug,
      authorName: row.authorName,
      publishedAt: iso(row.publishedAt),
      readingMinutes: row.readingMinutes,
      heroImageUrl: row.heroImageUrl,
      heroImageAlt: row.heroImageAlt,
    }));
  },
);

export const getArticle = cache(async (slug: string): Promise<ArticleDetail | null> => {
  const rows = await sql<(ArticleSummaryRow & { body: string; status: string })[]>`
    SELECT
      a."slug",
      a."title",
      a."standfirst",
      a."body",
      a."status",
      a."authorName",
      ${isoTs('a."publishedAt"')} AS "publishedAt",
      a."readingMinutes",
      a."heroImageUrl",
      a."heroImageAlt",
      ac."name" AS "category",
      ac."slug" AS "categorySlug"
    FROM "Article" a
    LEFT JOIN "ArticleCategory" ac ON ac."id" = a."categoryId"
    WHERE a."slug" = ${slug}
  `;

  const row = rows[0];
  if (!row || row.status !== 'published') return null;

  return {
    slug: row.slug,
    title: row.title,
    standfirst: row.standfirst,
    body: row.body,
    category: row.category,
    categorySlug: row.categorySlug,
    authorName: row.authorName,
    publishedAt: iso(row.publishedAt),
    readingMinutes: row.readingMinutes,
    heroImageUrl: row.heroImageUrl,
    heroImageAlt: row.heroImageAlt,
  };
});

export const listArticleCategories = cache(async () => {
  const rows = await sql<{ slug: string; name: string }[]>`
    SELECT ac."slug", ac."name"
    FROM "ArticleCategory" ac
    ORDER BY ac."position" ASC
  `;
  return rows.map((row) => ({ slug: row.slug, name: row.name }));
});

// ── Sponsors & operational stats ─────────────────────────────────────────────

type SponsorshipRow = {
  tier: string;
  slug: string;
  name: string;
  summary: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  categoryName: string | null;
};

export const listSponsors = cache(async (): Promise<SponsorView[]> => {
  const rows = await sql<SponsorshipRow[]>`
    SELECT
      sp."tier",
      s."slug",
      s."name",
      s."summary",
      s."websiteUrl",
      s."isActive",
      cat."name" AS "categoryName"
    FROM "Sponsorship" sp
    JOIN "Sponsor" s ON s."id" = sp."sponsorId"
    LEFT JOIN "Category" cat ON cat."id" = sp."categoryId"
    ORDER BY sp."createdAt" ASC
  `;

  return rows
    .filter((row) => row.isActive)
    .map((row) => ({
      slug: row.slug,
      name: row.name,
      summary: row.summary,
      websiteUrl: row.websiteUrl,
      tier: row.tier as SponsorView['tier'],
      categoryName: row.categoryName,
    }));
});

/**
 * The panel, as the public sees it.
 *
 * Judges are published because a panel nobody can name is not independent, it
 * is merely anonymous. What is never published is anything a judge *did*: no
 * scores, no assignments, no conflict declarations. Who sat is public; how they
 * voted is not, permanently.
 */
type JudgeRow = {
  id: string;
  displayName: string;
  title: string | null;
  organisation: string | null;
  biography: string | null;
  countryCode: string | null;
  memberships: { year: number; isChair: boolean }[];
};

export const listJudges = cache(async (): Promise<JudgeView[]> => {
  const rows = await sql<JudgeRow[]>`
    SELECT
      j."id",
      j."displayName",
      j."title",
      j."organisation",
      j."biography",
      j."countryCode",
      (
        SELECT COALESCE(
          json_agg(
            json_build_object('year', ay."year", 'isChair', m."isChair")
          ),
          '[]'::json
        )
        FROM "JudgePanelMembership" m
        JOIN "AwardYear" ay ON ay."id" = m."awardYearId"
        WHERE m."judgeId" = j."id"
      ) AS "memberships"
    FROM "Judge" j
    WHERE j."isActive"
    ORDER BY j."displayName" ASC
  `;

  return rows.map((row) => {
    const seasons = row.memberships
      .map((membership) => ({
        year: membership.year,
        isChair: membership.isChair,
      }))
      .sort((a, b) => b.year - a.year);

    return {
      id: row.id,
      displayName: row.displayName,
      title: row.title,
      organisation: row.organisation,
      biography: row.biography,
      countryCode: row.countryCode,
      seasons,
      isChair: seasons.some((season) => season.isChair),
    };
  });
});

export const getSeasonStats = cache(async (year: number): Promise<SeasonStats> => {
  const rows = await sql<SeasonStats[]>`
    SELECT
      (SELECT count(*)::int
        FROM "Nomination" n
        JOIN "Candidacy" ca ON ca."id" = n."candidacyId"
        JOIN "AwardYear" ay ON ay."id" = ca."awardYearId"
        WHERE ay."year" = ${year} AND n."status" = 'counted') AS "nominations",
      (SELECT count(*)::int
        FROM "Candidacy" ca
        JOIN "AwardYear" ay ON ay."id" = ca."awardYearId"
        WHERE ay."year" = ${year} AND ca."status" = 'under_review') AS "underReview",
      (SELECT count(*)::int
        FROM "Candidacy" ca
        JOIN "AwardYear" ay ON ay."id" = ca."awardYearId"
        WHERE ay."year" = ${year} AND ca."status" = 'eligible') AS "eligible",
      (SELECT count(*)::int
        FROM "JudgingAssignment" ja
        JOIN "Candidacy" ca ON ca."id" = ja."candidacyId"
        JOIN "AwardYear" ay ON ay."id" = ca."awardYearId"
        WHERE ay."year" = ${year} AND ja."status" IN ('assigned', 'in_progress')) AS "judging",
      (SELECT count(*)::int
        FROM "Honour" h
        JOIN "AwardYear" ay ON ay."id" = h."awardYearId"
        WHERE ay."year" = ${year} AND h."kind" = 'finalist' AND h."state" = 'active') AS "finalists",
      (SELECT count(*)::int
        FROM "Honour" h
        JOIN "AwardYear" ay ON ay."id" = h."awardYearId"
        WHERE ay."year" = ${year} AND h."kind" = 'winner' AND h."state" = 'active') AS "winners"
  `;

  const stats = rows[0]!;
  return {
    nominations: stats.nominations,
    underReview: stats.underReview,
    eligible: stats.eligible,
    judging: stats.judging,
    finalists: stats.finalists,
    winners: stats.winners,
  };
});

export const listCountries = cache(async (): Promise<string[]> => {
  const all = await listCreators({ limit: 500 });
  return [...new Set(all.map((creator) => creator.countryCode))].sort();
});
