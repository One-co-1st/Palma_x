import 'server-only';
import { sql } from '@/server/db/sql';
import type { Role } from '@/lib/auth/rbac';

/**
 * Accounts, as distinct from creators.
 *
 *     User ≠ Creator
 *
 * A user is somebody who signs in. A creator is a record in the archive. One
 * may hold the other, and most do not: PALMA has creators with no account at
 * all, and staff accounts attached to no creator. Managing them on one screen
 * would quietly merge two things the institution keeps apart.
 */

export type AccountSummary = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  activeSessions: number;
  /** The creator record this account holds, if any. */
  creator: { slug: string; displayName: string } | null;
  isJudge: boolean;
};

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

export async function listAccounts(filter?: {
  query?: string;
  role?: Role;
  state?: 'active' | 'suspended';
}): Promise<AccountSummary[]> {
  const rows = await sql<
    {
      id: string;
      email: string;
      name: string;
      role: Role;
      isActive: boolean;
      emailVerified: boolean;
      createdAt: string;
      lastLoginAt: string | null;
      activeSessions: number;
      creatorSlug: string | null;
      creatorName: string | null;
      isJudge: boolean;
    }[]
  >`
    select
      u.id,
      u.email,
      u.name,
      u.role,
      u."isActive",
      (u."emailVerifiedAt" is not null) as "emailVerified",
      ${isoTs('u."createdAt"')} as "createdAt",
      ${isoTs('u."lastLoginAt"')} as "lastLoginAt",
      (select count(*)::int from "AuthSession" s
        where s."userId" = u.id
          and s."revokedAt" is null
          and s."expiresAt" > ${new Date()}) as "activeSessions",
      c.slug as "creatorSlug",
      c."displayName" as "creatorName",
      (j.id is not null) as "isJudge"
    from "User" u
    left join "Creator" c on c."userId" = u.id
    left join "Judge" j on j."userId" = u.id
    where true
      ${filter?.query
        ? sql`and (u.email ilike ${likePattern(filter.query)} or u.name ilike ${likePattern(filter.query)})`
        : sql``}
      ${filter?.role ? sql`and u.role = ${filter.role}` : sql``}
      ${filter?.state === 'active' ? sql`and u."isActive"` : sql``}
      ${filter?.state === 'suspended' ? sql`and not u."isActive"` : sql``}
    order by u.role asc, u."createdAt" desc
    limit 200
  `;

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: row.isActive,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt,
    lastLoginAt: row.lastLoginAt,
    activeSessions: row.activeSessions,
    creator:
      row.creatorSlug !== null && row.creatorName !== null
        ? { slug: row.creatorSlug, displayName: row.creatorName }
        : null,
    isJudge: row.isJudge,
  }));
}

export type PendingAction = {
  id: string;
  kind: string;
  subject: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy: string | null;
  executedAt: string | null;
  cancelledAt: string | null;
};

export async function listConsequentialActions(
  scope: 'pending' | 'all' = 'pending',
): Promise<PendingAction[]> {
  const rows = await sql<
    {
      id: string;
      kind: string;
      subject: string;
      reason: string;
      requestedBy: string;
      requestedAt: string;
      approvedBy: string | null;
      executedAt: string | null;
      cancelledAt: string | null;
    }[]
  >`
    select
      a.id,
      a.kind,
      a.subject,
      a.reason,
      rb.email as "requestedBy",
      ${isoTs('a."createdAt"')} as "requestedAt",
      ab.email as "approvedBy",
      ${isoTs('a."executedAt"')} as "executedAt",
      ${isoTs('a."cancelledAt"')} as "cancelledAt"
    from "ConsequentialAction" a
    join "User" rb on rb.id = a."requestedById"
    left join "User" ab on ab.id = a."approvedById"
    ${scope === 'pending' ? sql`where a."executedAt" is null and a."cancelledAt" is null` : sql``}
    order by a."createdAt" desc
    limit 60
  `;

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    subject: row.subject,
    reason: row.reason,
    requestedBy: row.requestedBy,
    requestedAt: row.requestedAt,
    approvedBy: row.approvedBy,
    executedAt: row.executedAt,
    cancelledAt: row.cancelledAt,
  }));
}

export type EnforcementRecord = {
  id: string;
  kind: string;
  entityType: string;
  entityId: string;
  rationale: string;
  actor: string;
  createdAt: string;
};

export async function listEnforcement(): Promise<EnforcementRecord[]> {
  const rows = await sql<
    {
      id: string;
      kind: string;
      entityType: string;
      entityId: string;
      rationale: string;
      actor: string;
      createdAt: string;
    }[]
  >`
    select
      m.id,
      m.kind,
      m."entityType",
      m."entityId",
      m.rationale,
      u.email as actor,
      ${isoTs('m."createdAt"')} as "createdAt"
    from "ModerationAction" m
    join "User" u on u.id = m."actorId"
    order by m."createdAt" desc
    limit 60
  `;

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    entityType: row.entityType,
    entityId: row.entityId,
    rationale: row.rationale,
    actor: row.actor,
    createdAt: row.createdAt,
  }));
}

// ── Global search ────────────────────────────────────────────────────────────

export type SearchHit = {
  kind: 'Creator' | 'Account' | 'Claim' | 'Verification case' | 'Honour' | 'Audit';
  title: string;
  detail: string;
  href: string;
};

/**
 * One search across the institution.
 *
 * Only possible because there is one record per thing: a creator is a Creator
 * row wherever you meet them, so searching a name reaches their record, the
 * account that holds it, their claims, their cases and the audit trail of all
 * of it at once.
 */
export async function searchEverything(query: string): Promise<SearchHit[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const contains = likePattern(term);

  const [creators, accounts, claims, cases, achievements, audit] = await Promise.all([
    sql<{ slug: string; displayName: string; countryCode: string; userId: string | null }[]>`
      select slug, "displayName", "countryCode", "userId"
      from "Creator"
      where "displayName" ilike ${contains} or slug ilike ${contains}
      limit 10
    `,
    sql<{ id: string; email: string; name: string; role: string }[]>`
      select id, email, name, role
      from "User"
      where email ilike ${contains} or name ilike ${contains}
      limit 10
    `,
    sql<{ id: string; reference: string; status: string; creatorName: string }[]>`
      select cl.id, cl.reference, cl.status, c."displayName" as "creatorName"
      from "CreatorClaim" cl
      join "Creator" c on c.id = cl."creatorId"
      join "User" u on u.id = cl."userId"
      where cl.reference ilike ${contains}
        or c."displayName" ilike ${contains}
        or u.email ilike ${contains}
      limit 10
    `,
    sql<{ id: string; reference: string; status: string; creatorName: string; creatorSlug: string }[]>`
      select vc.id, vc.reference, vc.status,
        c."displayName" as "creatorName", c.slug as "creatorSlug"
      from "VerificationCase" vc
      join "Creator" c on c.id = vc."creatorId"
      where vc.reference ilike ${contains} or c."displayName" ilike ${contains}
      limit 10
    `,
    sql<{ code: string; creatorName: string; categoryName: string; year: number; kind: string }[]>`
      select code, "creatorName", "categoryName", year, kind
      from "Achievement"
      where code ilike ${contains} or "creatorName" ilike ${contains}
      limit 10
    `,
    sql<{ id: string; action: string; summary: string | null; createdAt: string }[]>`
      select id, action, summary, ${isoTs('"createdAt"')} as "createdAt"
      from "AuditLog"
      where summary ilike ${contains}
        or "actorLabel" ilike ${contains}
        or "entityId" = ${term}
      order by "createdAt" desc
      limit 10
    `,
  ]);

  return [
    ...creators.map<SearchHit>((creator) => ({
      kind: 'Creator',
      title: creator.displayName,
      detail: `${creator.countryCode} · ${creator.userId ? 'claimed' : 'unclaimed'}`,
      href: `/portal/creators/${creator.slug}`,
    })),
    ...accounts.map<SearchHit>((account) => ({
      kind: 'Account',
      title: account.email,
      detail: `${account.name} · ${account.role.replace('_', ' ')}`,
      href: `/admin/users?q=${encodeURIComponent(account.email)}`,
    })),
    ...claims.map<SearchHit>((claim) => ({
      kind: 'Claim',
      title: claim.reference,
      detail: `${claim.creatorName} · ${claim.status.replace('_', ' ')}`,
      href: `/portal/claims/${claim.id}`,
    })),
    ...cases.map<SearchHit>((entry) => ({
      kind: 'Verification case',
      title: entry.reference,
      detail: `${entry.creatorName} · ${entry.status.replace('_', ' ')}`,
      href: `/portal/creators/${entry.creatorSlug}`,
    })),
    ...achievements.map<SearchHit>((achievement) => ({
      kind: 'Honour',
      title: achievement.code,
      detail: `${achievement.creatorName} · ${achievement.kind} · ${achievement.categoryName} ${achievement.year}`,
      href: `/verify/${achievement.code}`,
    })),
    ...audit.map<SearchHit>((entry) => ({
      kind: 'Audit',
      title: entry.action.replace(/[._]/g, ' '),
      detail: entry.summary ?? entry.createdAt.slice(0, 10),
      href: '/admin/audit',
    })),
  ];
}

export type ActivityEntry = {
  id: string;
  action: string;
  summary: string | null;
  actor: string | null;
  entityType: string;
  entityId: string;
  createdAt: string;
};

/** The live feed of what PALMA's staff have actually done. */
export async function recentActivity(limit = 40): Promise<ActivityEntry[]> {
  const rows = await sql<
    {
      id: string;
      action: string;
      summary: string | null;
      actorLabel: string | null;
      entityType: string;
      entityId: string;
      createdAt: string;
    }[]
  >`
    select
      id,
      action,
      summary,
      "actorLabel",
      "entityType",
      "entityId",
      ${isoTs('"createdAt"')} as "createdAt"
    from "AuditLog"
    order by "createdAt" desc
    limit ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    summary: row.summary,
    actor: row.actorLabel,
    entityType: row.entityType,
    entityId: row.entityId,
    createdAt: row.createdAt,
  }));
}
