# Are we ready for production?

Written after an audit of the running system on 14 September 2026, against a
first season opening for nominations.

**Short answer: the software is ready. PALMA the institution is not, and most of
what is left is not code.**

Nothing below is a bug. It is the list of things that are true about a system
built in a development environment against a domain nobody has bought yet.

---

## What is actually finished

Verified by running it, not by reading it.

|                         |                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Tests                   | 288 unit, 7 integration, all passing                                                                                   |
| Build                   | Clean production build                                                                                                 |
| Lint, types, formatting | Clean                                                                                                                  |
| Migrations              | Baselined at `0_init`; `npm run db:deploy` is the production path                                                      |
| The four surfaces       | `/creator`, `/judge`, `/portal`, `/admin` — door and dashboard at one path each                                        |
| The award engine        | Nomination → verification → screening → assignment → scoring → selection → conferral → verification record, end to end |
| Two-administrator rule  | Proven: a proposer cannot approve their own consequential action                                                       |
| Email                   | 19 templates, four mailboxes, delivery record, bounce webhook, suppression list                                        |
| Lists                   | Five, independently opt-in, double opt-in, one-click out                                                               |
| Commercial rails        | Eleven, all off, audited, season-scoped                                                                                |
| Privacy                 | Data minimisation enforced in code with tests; Article 14 notice; objection route                                      |
| Responsive              | Swept at 375 / 768 / 1280 / 1600 across 26 pages                                                                       |

---

## Blocking — cannot launch without these

### 1. The domain

`palmaawards.com` is not registered. Everything below waits on it.

### 2. A real `AUTH_SECRET`

`AUTH_SECRET` is PALMA's own secret and has nothing to do with the mail
provider or any other third party. It is a random string this application
generates for itself, and it signs session cookies, CSRF tokens **and every
verification record**. The development value is in `.env.local` and in this
repository's history.

Generate with `openssl rand -base64 48`. Set it once, in the production
environment, and never anywhere else.

> **Rotating it invalidates every verification signature ever issued.** After
> the first honour is conferred, a rotation requires re-signing every record in
> the same operation. Treat it as the most sensitive value in the deployment.

The application refuses to start in production without it.

### 3. Verify the sending domain

The Resend key works; `palmaawards.com` is not verified with the provider, so
nothing can send as `laurels@`. Add the domain at the provider, publish the
SPF and DKIM records, then **unset `EMAIL_SANDBOX_FROM`**.

Also publish a DMARC record. `p=none` to start, with a reporting address, then
tighten once you can see what is being sent in your name.

### 4. The four mailboxes must exist and be read

`laurels@`, `concierge@`, `security@`, `concerns@`. PALMA publishes all four and
promises a person reads them. Publishing an address nobody opens is worse than
publishing none.

### 5. `RESEND_WEBHOOK_SECRET` and `CRON_SECRET`

Without the first, a message reads "sent" for ever and a dead address never
suppresses. Without the second, retention is never applied and the privacy
notice describes something that does not happen.

Both routes fail closed, so the failure is silent rather than loud.

### 6. Operator accounts

The seeded cast exists with a shared password from a config file. **Never run
`npm run db:seed` against production** — besides the password, it reconciles the
cast by deleting palmaawards.com accounts that are not in it.

Create production operators by hand, each with their own password.

### 7. The company, and the ICO fee

`ENTITY.companyNumber`, `registeredOffice` and `icoRegistration` are all null,
and the site says so rather than inventing them. Fill them in at
`src/lib/legal.ts` and they appear everywhere at once — the register, the
privacy notice, the well-known files, `llms.txt`.

The **ICO** is the Information Commissioner's Office, the UK's data protection
regulator. Under the Data Protection (Charges and Information) Regulations 2018
most organisations that process personal data must pay it an annual data
protection fee — tier 1, the small-organisation tier, is £52 a year paid direct
to the ICO. Registering produces a reference (`ZA…`) which goes in
`ENTITY.icoRegistration`. It is a registration and a fee, not an inspection:
nothing about PALMA waits on it beyond the fifteen minutes it takes.

A data controller also has to be identifiable, which is what the registered
name, office and company number on the register are for.

**The ICO registration is done.** `ENTITY.icoRegistered` is `true`. The ZA
reference has not been recorded yet, so the register reads "Registered;
reference to follow" rather than claiming an application is still pending.
Put the reference in `ENTITY.icoRegistration` and it replaces that line.

**The parent company is recorded and not published.** PALMA is a One Cō Ltd
company; `ENTITY.parent` holds it, the settings screen shows it behind a login,
and no public surface names it. Nothing requires it to: UK law makes the
operator and the data controller identifiable, and both are Palma Awards Ltd.
Note what this does not do. Companies House publishes officers and persons of
significant control for every registered company on its own register, and a
website saying nothing does not change that.

**The legal register itself is settled.** The terms and the privacy notice are
the solicitor-drafted documents, in force as written, and the rest of the
register is consistent with them. Superseded versions stay at their own address
rather than being deleted.

---

## Required before the first honour is conferred — not before launch

### Age assurance

`AGE_VERIFICATION_PROVIDER` is `stub`, which performs no assurance at all.
Manual review at `/portal/verification` is in force and works, and that is a
legitimate configuration — but the environment variable should name `manual`
rather than `stub` so `/admin/health` stops reporting a stub in production.

PALMA's own rule is that no honour is conferred without assurance. Manual review
satisfies it; the stub does not.

### Backups, and a restore you have actually performed

PALMA's entire value is the accuracy of a permanent record. A backup nobody has
restored is a belief, not a backup. Before the first honour: take one, restore
it somewhere else, confirm a verification code still resolves.

---

## Known gaps, honestly

Not blocking, and each is a decision rather than an oversight.

| Gap                           | Position                                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Two-factor authentication** | Not offered, by your decision. `/account` says so plainly rather than showing a switch that does nothing. Worth revisiting before accounts exist that can revoke an honour. |
| **Portrait storage**          | Portraits are re-encoded WebP in Postgres. Correct at a few hundred creators; move to object storage above a few thousand. One file.                                        |
| **No staging environment**    | Everything here was verified against a local production build. A staging deployment against the real database shape is worth having before the season opens.                |
| **No error tracking**         | A failure in production is currently a line in a log nobody is watching.                                                                                                    |
| **Single administrator**      | The two-administrator rule needs two administrators. With one, the most consequential actions cannot be performed at all — which is safe, and also a dead end.              |

---

## The order I would do it in

1. Buy the domain.
2. Create the Supabase project. Set `DATABASE_URL` (pooled, 6543) and
   `DIRECT_URL` (direct, 5432).
3. `npm run db:deploy`. **Do not seed.**
4. Create production operator accounts by hand.
5. Generate `AUTH_SECRET`. Set it once.
6. Verify the domain with Resend. Publish SPF, DKIM, DMARC. Unset
   `EMAIL_SANDBOX_FROM`.
7. Create the four mailboxes. Confirm each one reaches a person.
8. Create the Resend webhook; set `RESEND_WEBHOOK_SECRET`.
9. Generate `CRON_SECRET`; schedule `POST /api/cron/retention` daily.
10. Set `AGE_VERIFICATION_PROVIDER=manual`.
11. Deploy to Vercel from GitHub.
12. Take a backup. Restore it somewhere else. Check a verification code.
13. Register with the ICO; put the reference in `ENTITY.icoRegistration`.
14. Walk `/admin/health` and confirm every row reads what you expect.
15. Open nominations.

Once the domain exists this is a day's work.

---

## What I would not do

**Do not seed production.** Twice, because it is the mistake with the worst
consequences: a known password on a super administrator account, and a
reconciliation pass that deletes operators it does not recognise.

**Do not turn a commercial rail on to see what it does.** They are off because
nothing behind them exists. A feature switched on before its prerequisite is
how a public page advertises something that is not real — and the switch asks
for a written reason precisely so that this shows up in the audit log.

**Do not rotate `AUTH_SECRET` after the first honour** without re-signing every
verification record in the same operation.
