# PALMA — The Creator Honours

PALMA is a UK creator-industry awards institution. It recognises achievement and
keeps the permanent record of it: nominations, judging, honours, and a public
archive — the **PALMA Roll of Honour (PaROH)** — that is designed to still be
citable a decade from now.

PALMA is not a content platform, a social network, a subscription service or a
marketplace. It hosts no creator work and brokers nothing.

> PALMA is not the event. PALMA is the record. The event is one expression of it.

---

## Quick start

```bash
npm install
cp .env.example .env.local          # DATABASE_URL and AUTH_SECRET are required
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

Nomination emails go through **Resend**. Without `RESEND_API_KEY` the
development server writes the verification code to its own log so the flow can
be exercised offline; in production the nomination is refused rather than the
code silently dropped.

### The seeded cast

Nine people, declared once in `prisma/seed-data.ts`. Each account signs in at
its own path with the password in `SEED_PASSWORD` (default
`Palma-Development-2027`) — a correct password at the wrong one creates no
session.

Four paths, one per role, and each is both the sign-in and the dashboard behind
it: signed out you get that role's panel, signed in you get its desk, signed in
as somebody else you are sent to your own.

| Account                   | Role          | Path       |
| ------------------------- | ------------- | ---------- |
| `sarah@palmaawards.com`   | `super_admin` | `/admin`   |
| `tom@palmaawards.com`     | `moderator`   | `/portal`  |
| `nadia@palmaawards.com`   | `moderator`   | `/portal`  |
| `adaeze@palmaawards.com`  | `judge`       | `/judge`   |
| `frances@palmaawards.com` | `judge`       | `/judge`   |
| `marcus@palmaawards.com`  | `judge`       | `/judge`   |
| `maya@example.com`        | `creator`     | `/creator` |
| `jordan@example.com`      | `creator`     | `/creator` |

Everybody who registers is a `creator`; a role beyond that is granted by PALMA
and reached by typing its path.

The ninth is **Noor Haddad**, a creator record with no account: PALMA wrote it
when she was first nominated and nobody holds it. That is what `/creator/claim`
and the moderation claim queue exist to resolve.

The seed is authoritative rather than additive — it clears what it owns before
writing, so running it twice leaves exactly the dataset its file describes.

## Scripts

| Script                     | What it does                                            |
| -------------------------- | ------------------------------------------------------- |
| `npm run dev`              | Development server                                      |
| `npm run build` / `start`  | Production build and server                             |
| `npm run verify`           | Typecheck, lint and unit tests — run before committing  |
| `npm test`                 | Unit tests (no database required)                       |
| `npm run test:integration` | Awards-engine tests against PostgreSQL                  |
| `npm run db:push`          | Push the schema without a migration — development only  |
| `npm run db:migrate`       | Create a migration from a schema change                 |
| `npm run db:deploy`        | Apply pending migrations — this is what production runs |
| `npm run db:status`        | What is applied and what is pending                     |
| `npm run db:seed`          | Load the seed dataset into PostgreSQL                   |
| `npm run retention`        | Run the data-retention sweep by hand                    |

## One source of truth

**PostgreSQL, and nothing else.** There is no fallback dataset, no fixture file
and no in-memory mode behind the read layer: a name on this site is there
because it is in the database. `prisma/seed-data.ts` exists only to populate
that database and is imported by the seed script alone — never at runtime.

`DATABASE_URL` is therefore required everywhere, **including at build time**,
where the season, categories, creators and Journal are read to generate static
pages. If the database is unavailable the page fails loudly, which is the right
behaviour for an institution whose whole value is the accuracy of its record.

## Architecture

```
src/
  app/            Routes. Public record, the four role surfaces (/creator,
                  /judge, /portal, /admin), verification, share cards,
                  sitemap and robots.
  components/
    brand/        Wordmark, palm mark, institutional seal
    ui/           Design-system primitives
    palma/        Editorial components (creator cards, winner reveal, PaROH…)
  domain/         Pure institutional logic — no I/O, fully unit-tested:
                  season stages, eligibility, judging and aggregation,
                  conflict-aware assignment, selection, integrity, policy
  lib/            Crypto, env validation, RBAC, verification codes, SEO
  server/
    actions/      Server Actions (the only write path)
    data/         Read layer — Prisma, and only Prisma
    email/        Resend client and the two messages PALMA sends
    services/     Honours: conferral, verification records, revocation
    audit.ts      Append-only audit service
prisma/           Schema and seed
tests/            Unit tests; tests/integration needs PostgreSQL
```

The rule that shapes the layout: **`domain/` never touches I/O.** Eligibility,
score aggregation, conflict handling and selection are pure functions, so the
rules of the institution can be read, reasoned about and tested without a
database.

## Audience nominates. PALMA judges.

Two different things are kept apart in the data model, and that separation is
the whole design:

|                |                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| **Nomination** | One person's signal that a creator deserves consideration.                                               |
| **Candidacy**  | A creator's candidacy in one category of one season. This is what is judged, and what carries an honour. |

Many nominations point at one candidacy. **Nothing in the judging path reads the
count** — judges never see it, it is never published, and no ranking derives
from it. Popularity brings a creator to PALMA's attention and stops there.

### Nominating

Under a minute, no account, no evidence, no essay. Someone names a creator, says
why in a sentence, confirms their email, and leaves.

```
Search creator → category → a sentence → email → six-digit code → submit
```

Creators with a claimed, verified profile get their own link —
`palmaawards.com/nominate/maya-rivers` — which pre-selects them and changes
nothing else. It says "this is my nomination page", not "vote for me", and a
nomination made through it counts exactly as one made any other way.

Rules, enforced in the database rather than the form:

- One nomination per person, per creator, per category, per season.
- The same person may nominate other creators, and the same creator in other
  categories, as often as they like.
- A creator cannot nominate themselves, whichever alias of their address
  they use.
- A nomination does not exist until its email is verified. The submit button
  stays disabled, and the server refuses an unverified submission regardless.

### The season

Four public beats — **Nominate → Shortlist → Finalists → Winners** — advancing
one stage at a time.

1. **Nomination.** Free, open to anyone. Runs rate limit → validation →
   integrity assessment → verified email → counted, with an audit entry.
2. **Screening.** A person rules on each _candidacy_ — eligible, ineligible or
   withdrawn — before it reaches a judge. PALMA gathers the evidence itself.
3. **Judging.** At least three judges score each candidacy independently against
   five published criteria out of ten. Audience size is not a criterion, and
   nomination counts are not shown. Scores are immutable once submitted.
4. **Selection.** Once four or more judges have scored, the highest and lowest
   are trimmed before ranking. The ranking is a recommendation; an administrator
   confirms it, and that act is what confers an honour.
5. **The record.** Conferring mints an `Achievement` and a signed
   `VerificationRecord` in the same transaction, and the creator's profile
   becomes public.

## Verification

Every honour has a permanent URL: `/verify/PM-2027-XXXXXX`.

The code is derived (`HMAC(secret, year + honourId)`), so it is unguessable and
reveals nothing about how many honours exist. The record is signed over its
identity fields — code, creator, category, season, kind, issue date — and the
signature is re-checked on **every request**. Altering any stored field breaks
the signature and the page refuses to present the record as verified. This is
covered by unit tests and verified end to end against PostgreSQL.

Revocation never deletes. A revoked honour, its achievement and its verification
page all remain, marked revoked — an institution that quietly erases its
mistakes cannot be trusted about its successes.

## Integrity and security

- Server-side authorisation for every privileged action, from a single
  permission matrix (`src/lib/auth/rbac.ts`). Client components hide UI; they
  never grant it.
- scrypt password hashing, hashed session tokens, double-submit CSRF plus
  same-origin checks, and secure headers including a strict CSP.
- Durable rate limiting, honeypot and completion-timing signals, duplicate and
  near-duplicate detection, disposable-address screening, and human review of
  every candidacy before judging.
- Integrity safeguards are calibrated for legitimate mobilisation: a creator
  sharing their link and an audience answering is expected behaviour. Only a
  filled honeypot refuses outright; everything else flags a candidacy for a
  moderator rather than rejecting the person in front of us. IP address is never
  a basis for refusal on its own.
- IP addresses are never stored — only a salted one-way digest.
- Age and identity assurance is delegated to a third-party provider. PALMA
  stores the status, the provider reference and the date. Never a document.
- Sponsors hold **no role in the permission matrix at all**. Sponsorship is
  recorded against a season or category and grants nothing.
- Append-only audit log covering nominations, eligibility, assignment,
  conflicts, scores, honours, revocations, moderation and role changes.

## Design

| Token       | Value     | Use                                   |
| ----------- | --------- | ------------------------------------- |
| Ink         | `#161719` | Dark surfaces, typography, navigation |
| Warm Ivory  | `#F4F0E8` | Primary light background              |
| Stone       | `#D8D3C9` | Cards, borders, secondary surfaces    |
| Muted Taupe | `#AAA397` | Secondary typography, subdued UI      |
| Deep Olive  | `#4A5148` | Institutional accent                  |
| Champagne   | `#C9B58A` | Ceremonial accent — used sparingly    |

Display serif (Fraunces) for the wordmark, titles and honours; contemporary sans
(Inter) for navigation, forms and data. Motion is ceremonial rather than
decorative, and `prefers-reduced-motion` removes it entirely — the winner reveal
stays a complete, still composition.

Motion is a layered system, not scattered animation: CSS owns hover, focus and
press at zero hydration cost; Motion owns entrances, exits and shared-element
layout; GSAP owns the scroll choreography of a season; Three.js owns the trophy.
GSAP and Three.js are in no route's first load, and neither is fetched at all
under `prefers-reduced-motion`.

See [`docs/DESIGN.md`](docs/DESIGN.md) for the visual system,
[`docs/MOTION.md`](docs/MOTION.md) for the interaction language, and
[`docs/OPERATIONS.md`](docs/OPERATIONS.md) for running a season.

## Before launch

[`docs/LAUNCH.md`](docs/LAUNCH.md) is the full readiness assessment — what is
finished, what blocks a launch, and the order to do it in. The two areas that
are staged rather than finished:

- **Age verification.** The architecture is in place (status, provider
  reference, `verified_at`, no documents stored) but no third-party provider is
  integrated. Manual review at `/portal/verification` is in force and works;
  the mode is switched at `/admin/settings`, and adding a provider is a key
  and a toggle rather than a rewrite.
- **The company.** `ENTITY.companyNumber`, `registeredOffice` and
  `icoRegistration` in `src/lib/legal.ts` are null, and the site says so rather
  than inventing them. They appear everywhere at once when filled in.

The legal register is settled: every document is in force as written, and a
document that is one day replaced stays at its own address marked superseded.
