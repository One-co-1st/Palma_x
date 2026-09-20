/**
 * Integration coverage for conferring and revoking an honour.
 *
 * Runs only when DATABASE_URL is set. Everything it creates is namespaced and
 * removed again, in FK-safe order: honours first, then candidacies, seasons,
 * creators, and the integration audit rows.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { conferHonour, revokeHonour } from '@/server/services/honours';
import { verifyAchievement } from '@/lib/verification';
import { signingSecret } from '@/lib/env';
import { createId } from '@/server/db/ids';
import { closeSql, sql } from '@/server/db/sql';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const SUFFIX = `it-${Date.now()}`;
const actor = { id: null, role: 'super_admin' as const, label: 'integration-test' };

let seasonId = '';
let categoryId = '';
let verifiedCreatorId = '';
let unverifiedCreatorId = '';
let candidacyId = '';
let unverifiedCandidacyId = '';

describe.skipIf(!hasDatabase)('conferring an honour (integration)', () => {
  beforeAll(async () => {
    // Clear anything an interrupted earlier run left behind, so a failed
    // cleanup never leaks a fake season into the public record.
    const stale = await sql<{ id: string }[]>`
      select id from "AwardYear" where title like 'PALMA Integration %'
    `;
    if (stale.length > 0) {
      const ids = stale.map((entry) => entry.id);
      await sql`
        delete from "Honour" where "awardYearId" in ${sql(ids)}
      `;
      await sql`
        delete from "Candidacy" where "awardYearId" in ${sql(ids)}
      `;
      await sql`
        delete from "AwardYear" where id in ${sql(ids)}
      `;
      await sql`
        delete from "Creator"
        where slug like 'verified-it-%' or slug like 'unverified-it-%'
      `;
    }

    seasonId = createId();
    const year = 2900 + (Date.now() % 90);
    await sql`
      insert into "AwardYear" (id, year, title, stage)
      values (${seasonId}, ${year}, ${`PALMA Integration ${SUFFIX}`}, 'judging')
    `;

    categoryId = createId();
    await sql`
      insert into "Category" (
        id, "awardYearId", slug, name, description, eligibility, "judgingCriteria"
      ) values (
        ${categoryId},
        ${seasonId},
        ${`integration-${SUFFIX}`},
        'Integration Category',
        'x',
        'x',
        'x'
      )
    `;

    verifiedCreatorId = createId();
    await sql`
      insert into "Creator" (id, slug, "displayName", "countryCode")
      values (${verifiedCreatorId}, ${`verified-${SUFFIX}`}, 'Verified Creator', 'GB')
    `;
    await sql`
      insert into "CreatorVerification" (id, "creatorId", status, "verifiedAt")
      values (${createId()}, ${verifiedCreatorId}, 'verified', ${new Date()})
    `;

    unverifiedCreatorId = createId();
    await sql`
      insert into "Creator" (id, slug, "displayName", "countryCode")
      values (${unverifiedCreatorId}, ${`unverified-${SUFFIX}`}, 'Unverified Creator', 'GB')
    `;
    await sql`
      insert into "CreatorVerification" (id, "creatorId", status)
      values (${createId()}, ${unverifiedCreatorId}, 'pending')
    `;

    candidacyId = createId();
    await sql`
      insert into "Candidacy" (id, reference, "awardYearId", "categoryId", "creatorId", status)
      values (
        ${candidacyId},
        ${`PC-INT-${SUFFIX}-1`},
        ${seasonId},
        ${categoryId},
        ${verifiedCreatorId},
        'eligible'
      )
    `;

    unverifiedCandidacyId = createId();
    await sql`
      insert into "Candidacy" (id, reference, "awardYearId", "categoryId", "creatorId", status)
      values (
        ${unverifiedCandidacyId},
        ${`PC-INT-${SUFFIX}-2`},
        ${seasonId},
        ${categoryId},
        ${unverifiedCreatorId},
        'eligible'
      )
    `;
  });

  afterAll(async () => {
    // Order matters: a season cannot be deleted while candidacies reference it,
    // which is the behaviour an institution wants — seasons are not disposable.
    await sql`delete from "AuditLog" where "actorLabel" = 'integration-test'`;
    await sql`delete from "Honour" where "categoryId" = ${categoryId}`;
    await sql`delete from "Candidacy" where "awardYearId" = ${seasonId}`;
    await sql`delete from "AwardYear" where id = ${seasonId}`.catch(() => undefined);
    await sql`
      delete from "Creator"
      where id in (${verifiedCreatorId}, ${unverifiedCreatorId})
    `;
    await closeSql();
  });

  it('mints a signed, verifiable record when a PALMA is conferred', async () => {
    const result = await conferHonour({ candidacyId, kind: 'winner', position: 1, actor });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.code).toMatch(/^PM-\d{4}-[0-9A-HJKMNP-TV-Z]{6}$/);

    type RecordRow = {
      code: string;
      signature: string;
      creatorSlug: string;
      creatorName: string;
      categoryName: string;
      year: number;
      issuedAt: Date;
    };
    const [record] = await sql<RecordRow[]>`
      select
        v.code,
        v.signature,
        a."creatorSlug",
        a."creatorName",
        a."categoryName",
        a.year,
        a."issuedAt"
      from "VerificationRecord" v
      join "Achievement" a on a.id = v."achievementId"
      where v.code = ${result.code!}
      limit 1
    `;

    if (!record) throw new Error('Conferral did not mint a verification record.');

    expect(
      verifyAchievement(
        signingSecret(),
        {
          code: record.code,
          creatorSlug: record.creatorSlug,
          creatorName: record.creatorName,
          categoryName: record.categoryName,
          year: record.year,
          kind: 'winner',
          issuedAt: record.issuedAt.toISOString(),
        },
        record.signature,
      ),
    ).toBe(true);
  });

  it('publishes the creator and updates the candidacy status', async () => {
    const [creator] = await sql<{ isPublished: boolean }[]>`
      select "isPublished" from "Creator" where id = ${verifiedCreatorId} limit 1
    `;
    const [candidacy] = await sql<{ status: string }[]>`
      select status from "Candidacy" where id = ${candidacyId} limit 1
    `;
    expect(creator?.isPublished).toBe(true);
    expect(candidacy?.status).toBe('winner');
  });

  it('writes the conferral to the audit log', async () => {
    const entries = await sql<{ id: string }[]>`
      select id from "AuditLog"
      where "actorLabel" = 'integration-test' and action = 'honour.winner_selected'
    `;
    expect(entries.length).toBeGreaterThan(0);
  });

  it('refuses to confer the same honour twice', async () => {
    const again = await conferHonour({ candidacyId, kind: 'winner', actor });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toContain('already been conferred');
  });

  it('refuses to confer an honour on an unverified creator', async () => {
    const result = await conferHonour({
      candidacyId: unverifiedCandidacyId,
      kind: 'winner',
      actor,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('verification');
  });

  it('revokes without deleting, so the record still answers', async () => {
    const [honour] = await sql<{ id: string }[]>`
      select id from "Honour" where "categoryId" = ${categoryId} and kind = 'winner' limit 1
    `;
    const result = await revokeHonour({
      honourId: honour!.id,
      reason: 'Integration test revocation with a sufficiently detailed reason.',
      actor,
    });
    expect(result.ok).toBe(true);

    const [after] = await sql<{ state: string; achievementState: string | null }[]>`
      select h.state, a.state as "achievementState"
      from "Honour" h
      left join "Achievement" a on a."honourId" = h.id
      where h.id = ${honour!.id}
      limit 1
    `;
    expect(after?.state).toBe('revoked');
    expect(after?.achievementState).toBe('revoked');
  });

  it('refuses a revocation without an explanation', async () => {
    const [honour] = await sql<{ id: string }[]>`
      select id from "Honour" where "categoryId" = ${categoryId} limit 1
    `;
    const result = await revokeHonour({ honourId: honour!.id, reason: 'no', actor });
    expect(result.ok).toBe(false);
  });
});
