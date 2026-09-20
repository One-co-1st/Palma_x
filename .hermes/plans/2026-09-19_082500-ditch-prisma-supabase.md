# Ditch Prisma for Supabase Implementation Plan

> **For Hermes:** Planning only for this turn. Do not implement yet.

**Goal:** Remove Prisma completely from PALMA while keeping the current Supabase Postgres database, public behaviour, admin desks, and deployment flow intact.

**Architecture:** Replace Prisma with a small explicit SQL data layer over Supabase Postgres using `postgres.js`. Keep custom auth/RBAC, Next.js server actions, public data caching, Resend email, and R2 portraits unchanged in phase 1. Do **not** move to Supabase Auth/PostgREST/Storage in the first migration; that is where a clean ORM removal turns into a product rewrite.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase Postgres, `postgres` (postgres.js), SQL migrations, Vitest.

---

## Current Prisma blast radius

Measured from the repo:

- `prisma/schema.prisma`: **56 models**, **38 enums**, **84 relations**, **47 unique fields**, **185 defaults**, **25 `@updatedAt` fields**, **78 indexes**, **13 compound uniques**, **1 Bytes field**, **45 Text fields**
- Migrations: **10**, from `0_init` through `20260918160000_freeze_creator_slug_on_achievement`
- Source impact: **48 files** touching Prisma, **281 Prisma call sites**
- Top call-site models: `creator` 26, `emailSubscription` 18, `sponsor` 15, `honour` 13, `notification` 13, `user` 12, `awardYear` 12, `emailDelivery` 12, `creatorClaim` 11, `candidacy` 11
- Higher-risk patterns: **28 `$transaction`**, **37 `deleteMany`**, **21 `updateMany`**, **14 `upsert`**, **19 nested create/connect sites**, **2 `createMany`**, **1 raw query**
- Package coupling: `@prisma/client`, `prisma`, `postinstall: prisma generate`, `db:*` scripts, `prisma.seed`

## Non-negotiable safety constraints

1. **No `pg_dump` cutover.** Last time dump/restore thinking created connection pain. This migration should not move data at all.
2. **Same Supabase project remains source of truth.** No new database, no restore, no dual-write.
3. **No Big Bang.** Replace Prisma by vertical slices with the app still running.
4. **Supabase Auth is not phase 1.** PALMA has custom users, sessions, RBAC, creator/judge/moderator/admin entrances. Moving auth is a separate project.
5. **PostgREST-only is not phase 1.** 281 call sites and 28 transactions would become RPC sprawl.
6. **Portraits stay as-is.** R2/DB-byte portrait behaviour remains unchanged until the app is Prisma-free.

## Hidden Prisma behaviours we must explicitly replace

These are the places where "just use SQL" loses precision if missed:

1. **`@default(cuid())` IDs are Prisma-client generated.** Postgres does not necessarily generate them. The new data layer must mint IDs with a `createId()` helper on insert, or we must intentionally migrate to DB-generated IDs. Do not silently change ID format.
2. **`@updatedAt` is Prisma-client managed.** Removing Prisma without triggers means `updatedAt` quietly stops updating. Add a Postgres `set_updated_at()` trigger to every table with `updatedAt`, or set `updatedAt = now()` in every update path. Trigger is safer.
3. **Enum values are Postgres enums.** SQL reads/writes need consistent string mapping and casts. Keep domain unions in `src/domain/*` as the app-level source of truth.
4. **Nested writes become multi-statement transactions.** Prisma `verification: { create: ... }`, `notificationPrefs: { create: {} }`, etc. must become explicit ordered inserts inside `sql.begin`.
5. **Upserts become `INSERT ... ON CONFLICT`.** Especially rate limits, settings, subscriptions, measurement counters, nomination verification, creator imports.
6. **Relation filters become explicit SQL joins/subqueries.** Current public queries were already tightened; keep the same DTO contracts from `src/server/data/types.ts`.
7. **Prisma Studio disappears.** Use Supabase Table Editor / SQL editor instead.
8. **`prisma generate` disappears from install/build.** Build gets simpler, but type safety must come from hand-written row types/mappers and tests.

## Functionality affected

### Changed internals, same behaviour

- Public pages: `/`, `/creators`, `/creators/[slug]`, `/paroh`, `/awards`, `/categories`, `/journal`, `/winners`, `/finalists`, `/verify`
- Auth/session: sign-in, register, sign-out, CSRF/session cookie, password reset
- Nomination flow: code request, verification, counted nomination, referral path
- Creator flows: profile edit, links, portrait upload/delete, claim, verification case
- Judging: assignments, score submit, conflicts, history
- Admin/portal: creators, import, sponsorships, honours, THE PALMA desk, reports, objections, settings, communications, audience, business, audit, health
- Email: subscriptions, dispatches, suppression, Resend webhook updates
- Measurement: page counter, search counting, audience stats
- Rate limiting: same buckets, but implemented with atomic SQL upsert
- Scripts: `grant-admin`, `retention`, `reseal-honours`, seed/dev tooling, integration tests

### Removed

- `@prisma/client`
- `prisma` CLI
- `prisma/schema.prisma` as the live schema authority
- `prisma/migrations` as the migration runner
- `postinstall: prisma generate`
- `npm run db:generate|push|migrate|deploy|status|studio`
- Prisma Studio workflow

### Created

- `src/server/db/sql.ts` — postgres.js client, pooled runtime connection, direct migration connection, transaction helper
- `src/server/db/ids.ts` — cuid-compatible ID generation for inserts
- `src/server/db/rows.ts` — row types and row→DTO mappers
- `supabase/migrations/` — SQL migration files
- `scripts/db-migrate.ts` — advisory-locked SQL migration runner using `DIRECT_URL`
- `scripts/db-baseline.ts` — marks the existing Supabase schema as baseline-applied without running DDL
- `scripts/check-no-prisma.ts` — CI guardrail that fails if `@prisma/client`, `prisma.`, or Prisma scripts return
- Optional: `scripts/supabase-rest-backup.sh` — data-only REST backup for pre-change safety, not a cutover mechanism

## Migration strategy: same DB, no dump

The smooth path is **schema authority handoff**, not database migration.

1. Keep production data exactly where it is.
2. Add a new migration ledger table, e.g. `app_schema_migrations`.
3. Baseline the current schema as already applied.
4. Future schema changes go through SQL migrations.
5. Replace Prisma access code slice by slice.
6. Delete Prisma only after the guardrail proves zero references.

No data export is required. For pre-change insurance, use Supabase dashboard backup/PITR or a service-key REST data dump. Do not use `pg_dump` in the cutover path.

## Step-by-step plan

### Phase 0 — Freeze, evidence, safety

1. Create branch `chore/ditch-prisma-supabase`.
2. Record current state:
   - `git log --oneline -5`
   - `npm run build`
   - `npm test`
   - live header check on `https://palma-rouge.vercel.app/`
3. Confirm Supabase backup/PITR availability in the dashboard.
4. Optional no-dump backup: service-key REST dump of public tables to local encrypted storage. Data-only, no schema restore expectations.
5. Write a schema inventory from `information_schema`: tables, columns, defaults, enums, indexes, constraints, triggers. Save to `.hermes/plans/supabase-schema-inventory.md`.

### Phase 1 — SQL foundation

6. Add dependency: `postgres`.
7. Create `src/server/db/sql.ts`:
   - runtime `sql` using pooled `DATABASE_URL`
   - migration `sqlDirect` using `DIRECT_URL`
   - `withTransaction<T>(fn)` wrapper around `sql.begin`
   - query timing log helper for development
8. Create `src/server/db/ids.ts` with cuid-compatible `createId()`.
9. Create `src/server/db/rows.ts` with row types for the first slice only.
10. Create SQL migration infrastructure:
    - `supabase/migrations/0000_baseline.sql`
    - `supabase/migrations/0001_app_schema_migrations.sql`
    - `supabase/migrations/0002_updated_at_triggers.sql`
11. Create `scripts/db-migrate.ts` and `scripts/db-baseline.ts`.
12. Baseline local DB, then staging/preview DB if present. Production baseline only after code review because it writes one ledger row, not DDL.

### Phase 2 — Public read slice first

13. Convert `src/server/data/queries.ts` public reads to SQL:
    - `listSeasons`, `getSeason`, `getCurrentSeason`
    - `listCategories`, `getCategory`, `listCategoryIndex`
    - `listCreators`, `getCreator`
    - `honourRows`, `creatorIndex`, `getThePalma`, `getCategoryOutcome`, `listSeasonOutcomes`, `getRollOfHonour`, `listRecentHonours`
    - `getAchievementByCode`
    - `listArticles`, `getArticle`, `listArticleCategories`, `listSponsors`, `listJudges`, `getSeasonStats`, `listCountries`
14. Keep `publicData` / `unstable_cache` exactly as-is.
15. Verification for this slice:
    - `npm test`
    - `npm run build`
    - local `next start` smoke for `/`, `/creators`, `/paroh`, one creator page, one verification page
    - compare rendered HTML/DTO snapshots before and after where practical

### Phase 3 — Small shared write slices

16. Convert session/auth DB access in `src/lib/auth/session.ts`.
17. Convert rate limiting in `src/server/rate-limit.ts` to one atomic statement:
    - `INSERT ... ON CONFLICT (bucket, identity) DO UPDATE ... RETURNING count, window_ends_at`
18. Convert measurement in `src/server/services/measurement.ts`.
19. Convert email suppression and Resend webhook updates:
    - `src/server/email/suppression.ts`
    - `src/app/api/webhooks/resend/route.ts`
20. Verification: unit tests plus focused concurrency test for rate limiter.

### Phase 4 — Account and low-risk actions

21. Convert password flows in `src/server/actions/password.ts`.
22. Convert account flows in `src/server/actions/account.ts`.
23. Convert subscriptions in `src/server/actions/subscriptions.ts` and list pages under `src/app/(public)/lists`.
24. Convert simple creator profile/link edits in `src/server/actions/creator.ts`, leaving portrait and claim flows for the transactional phase.
25. Verification: tests + manual smoke of register/sign-in/reset/subscribe/unsubscribe.

### Phase 5 — Transactional core

26. Convert nomination flow in `src/server/actions/nomination.ts`.
27. Convert claim flows in `src/server/actions/claims.ts` and related pages.
28. Convert portrait flows in `src/server/actions/portrait.ts`, `src/server/services/portrait*.ts`, and portrait route.
29. Convert objection/report flows in `src/server/actions/objection.ts`, `src/server/actions/report.ts`, and portal pages.
30. Convert honours services in `src/server/services/honours.ts`.
31. Convert THE PALMA conferral path in operations components/actions.
32. Verification: integration tests, honours integration test rewritten to SQL helper, audit-log assertions, email dispatch assertions.

### Phase 6 — Admin/portal data modules

33. Convert remaining `src/server/data/*` modules:
    - `admin.ts`, `audience.ts`, `business.ts`, `command-centre.ts`, `communications.ts`, `dossier.ts`, `judging.ts`, `operations.ts`, `people.ts`, `portal.ts`, `product-library.ts`, `sponsorship.ts`, `system-health.ts`
34. Convert remaining components that import Prisma directly:
    - `src/components/operations/ThePalmaDesk.tsx`
    - `src/components/operations/FeaturePanel.tsx`
    - affected portal/admin pages
35. Verification: admin/portal smoke matrix with test users for admin, moderator, judge, creator.

### Phase 7 — Scripts, seed, tests

36. Convert `scripts/grant-admin.ts`.
37. Convert `scripts/retention.ts` and `src/server/services/retention.ts`.
38. Convert `scripts/reseal-honours.ts`.
39. Rewrite or retire `scripts/profile-public-reads.ts` using postgres.js query events/timing.
40. Rewrite `tests/integration/honours.integration.test.ts` to use the SQL data layer.
41. Replace `prisma/seed.ts` with a dev-only SQL seed script. Never run it against production.

### Phase 8 — Delete Prisma

42. Run guardrail search:
    - `@prisma/client`
    - `PrismaClient`
    - `prisma.`
    - `requireDb()`
    - `src/server/db.ts`
43. Remove from `package.json`:
    - `@prisma/client`
    - `prisma`
    - `postinstall`
    - `db:generate`, `db:push`, `db:migrate`, `db:deploy`, `db:status`, `db:seed`, `db:studio`
    - `prisma.seed`
44. Delete:
    - `prisma/schema.prisma`
    - `prisma/migrations/`
    - `prisma/seed.ts`
    - `src/server/db.ts`
45. Update `.env.example` wording from Prisma/pooler guidance to SQL/Supabase guidance.
46. Add `scripts/check-no-prisma.ts` to `npm run verify`.
47. Fresh install proof:
    - remove `node_modules` and `package-lock.json` regenerate in a disposable branch or CI
    - `npm ci`
    - `npm run verify`
    - `npm run build`

### Phase 9 — Deploy and rollback

48. Deploy to preview first. Smoke public, auth, nomination, creator, judge, portal, admin.
49. Deploy production once.
50. Verify live:
    - `/` is still `PRERENDER`/`HIT`
    - `/creators`, `/paroh`, creator profile, verify page, sign-in, admin sign-in
    - no Prisma errors in logs
51. Rollback is redeploying the previous Vercel deployment. Database rollback should not be needed because no data migration happened.

## Suggested package/script end state

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --config vitest.config.mts",
    "test:integration": "vitest run --config vitest.config.mts tests/integration",
    "db:migrate": "tsx scripts/db-migrate.ts",
    "db:baseline": "tsx scripts/db-baseline.ts",
    "db:seed": "tsx scripts/seed-dev.ts",
    "check:no-prisma": "tsx scripts/check-no-prisma.ts",
    "verify": "npm run check:no-prisma && npm run typecheck && npm run lint && npm run test"
  },
  "dependencies": {
    "postgres": "^3.x"
  }
}
```

## Risks and mitigations

| Risk | Why it bites | Mitigation |
|---|---|---|
| `@updatedAt` stops updating | Prisma used to manage it client-side | DB trigger `set_updated_at()` on all updatedAt tables |
| IDs missing on insert | Prisma generated cuid client-side | `createId()` helper in data layer; tests assert IDs present |
| Transaction semantics change | Prisma `$transaction` hid connection handling | `withTransaction` wrapper; integration tests around honours/nomination/claims |
| Enum casting errors | SQL drivers return strings, Postgres enums can be strict | Domain-level unions and explicit casts only at boundary |
| Race in rate limiter | Current read-then-write can race | Atomic `INSERT ... ON CONFLICT ... RETURNING` |
| Supabase pooler misuse | Direct DB on serverless exhausts connections | Runtime uses pooler; migrations use direct URL only |
| Big-bang rewrite stalls | 281 call sites is too much for one PR | Vertical slices with guardrail and frequent commits |
| Supabase Auth temptation | Looks like "full Supabase" but rewrites identity | Keep custom auth in phase 1; separate auth migration later if ever desired |

## Open questions for Father

1. Do we keep the same Supabase project forever, or is the end goal also a new Supabase project? I strongly recommend same project for this migration.
2. After Prisma is gone, do you want a later phase for Supabase Storage portraits, or keep R2?
3. Do you want Supabase Auth eventually, or is custom auth/RBAC permanent? My recommendation: keep custom auth; PALMA's RBAC is already better fitted than Supabase Auth would be.

## Recommendation

Do **Supabase Postgres + SQL data layer**, not "Supabase everything." That gets Prisma deleted cleanly, keeps behaviour seamless, avoids the `pg_dump` failure mode entirely, and leaves optional Supabase Auth/Storage as separate later decisions instead of forcing a rewrite today.
