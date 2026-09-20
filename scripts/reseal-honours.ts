/**
 * Re-sealing honours whose seal this server cannot read.
 *
 * Every PALMA honour carries two things beside it: an HMAC signature over its
 * identity fields, and a keyless SHA-256 digest of the same fields. The
 * signature proves the honour was issued by PALMA; the digest, needing no key,
 * says whether the fields are still the ones that were sealed. Between them
 * the verify page can tell an altered record from a server holding the wrong
 * key, which matters enormously — one is a forgery and the other is a typo in
 * an environment variable, and a public page must never call the second the
 * first.
 *
 *   npx tsx scripts/reseal-honours.ts            # report, change nothing
 *   npx tsx scripts/reseal-honours.ts --apply    # re-seal what it can explain
 *
 * It reports by default and never writes without --apply. Records whose
 * signature and digest both fail are listed separately and only written with
 * --force as well, because re-sealing those would bless whatever is in the row.
 */
import { loadEnvConfig } from '@next/env';
import type { HonourKind } from '../src/domain/honours';

loadEnvConfig(process.cwd());

const apply = process.argv.includes('--apply');
const force = process.argv.includes('--force');

type Verdict = 'sealed' | 'wrong-key' | 'stale-digest' | 'unexplained';

type RecordRow = {
  id: string;
  achievementId: string;
  code: string;
  signature: string;
  payloadDigest: string;
  achievementCode: string;
  creatorSlug: string;
  creatorName: string;
  categoryName: string;
  year: number;
  kind: HonourKind;
  issuedAt: Date;
};

async function main() {
  const { signingSecret } = await import('../src/lib/env');
  const { payloadDigest, signAchievement, verifyAchievement } =
    await import('../src/lib/verification');
  const { createId } = await import('../src/server/db/ids');
  const { sql, withTransaction, closeSql } = await import('../src/server/db/sql');

  const secret = signingSecret();

  const records = await sql<RecordRow[]>`
    select
      v.id,
      v."achievementId",
      v.code,
      v.signature,
      v."payloadDigest",
      a.code as "achievementCode",
      a."creatorSlug",
      a."creatorName",
      a."categoryName",
      a.year,
      a.kind,
      a."issuedAt"
    from "VerificationRecord" v
    join "Achievement" a on a.id = v."achievementId"
    order by v."issuedAt" asc
  `;

  if (records.length === 0) {
    console.log('\n  No honours in this database. Nothing to check.\n');
    return;
  }

  const findings = records.map((row) => {
    const payload = {
      code: row.achievementCode,
      // The frozen slug, not the live one: see the schema comment on the
      // column. Reading it live is what broke these seals in the first place.
      creatorSlug: row.creatorSlug,
      creatorName: row.creatorName,
      categoryName: row.categoryName,
      year: row.year,
      kind: row.kind,
      issuedAt: row.issuedAt.toISOString(),
    };

    const signatureValid = verifyAchievement(secret, payload, row.signature);
    const digestValid = payloadDigest(payload) === row.payloadDigest;

    const verdict: Verdict = signatureValid
      ? digestValid
        ? 'sealed'
        : 'stale-digest'
      : digestValid
        ? 'wrong-key'
        : 'unexplained';

    return { row, payload, verdict, signatureValid, digestValid };
  });

  const by = (verdict: Verdict) => findings.filter((finding) => finding.verdict === verdict);

  console.log(`\n  ${records.length} honours, sealed with a ${secret.length}-character key.\n`);
  report('Verify correctly', by('sealed'));
  report('Signed with a different key, contents provably unchanged', by('wrong-key'));
  report('Correctly signed, digest written wrong', by('stale-digest'));
  report('Neither the signature nor the digest can be explained', by('unexplained'));

  const explainable = [...by('wrong-key'), ...by('stale-digest')];
  const unexplained = by('unexplained');

  if (unexplained.length > 0) {
    console.log('\n  The unexplained ones, in full:\n');
    for (const finding of unexplained) {
      console.log(
        `    ${finding.row.code}  ${finding.payload.creatorName} · ${finding.payload.categoryName} ${finding.payload.year}`,
      );
    }
    console.log(
      '\n  Either these were altered after they were sealed, or they were sealed by an\n' +
        '  installation whose key this server has never held. Re-sealing them writes the\n' +
        '  current contents in as authentic, whatever they are. Look at them first.\n',
    );
  }

  if (explainable.length === 0 && unexplained.length === 0) {
    console.log('\n  Every honour verifies. Nothing to do.\n');
    return;
  }

  if (!apply) {
    console.log(
      `\n  Nothing was written. Run again with --apply to re-seal the ${explainable.length} ` +
        `explainable ${explainable.length === 1 ? 'record' : 'records'}` +
        (unexplained.length > 0 ? ', and --force as well to include the unexplained ones.' : '.') +
        '\n',
    );
    return;
  }

  const targets = force ? [...explainable, ...unexplained] : explainable;

  if (targets.length === 0) {
    console.log('\n  Nothing to re-seal without --force.\n');
    return;
  }

  for (const finding of targets) {
    await withTransaction(async (tx) => {
      await tx`
        update "VerificationRecord"
        set
          signature = ${signAchievement(secret, finding.payload)},
          "payloadDigest" = ${payloadDigest(finding.payload)}
        where id = ${finding.row.id}
      `;

      await tx`
        insert into "AuditLog" (
          id, "actorRole", "actorLabel", action, "entityType", "entityId", summary, before, after
        ) values (
          ${createId()},
          'super_admin',
          'scripts/reseal-honours.ts',
          'honour.resealed',
          'Achievement',
          ${finding.row.achievementId},
          ${`${finding.row.code} re-sealed from the command line (${finding.verdict})`},
          ${tx.json({ verdict: finding.verdict })},
          ${tx.json({ verdict: 'sealed' })}
        )
      `;
    });
  }

  console.log(`\n  Re-sealed ${targets.length}. Every one is in the audit log.\n`);

  await closeSql();
}

function report(label: string, findings: unknown[]) {
  if (findings.length === 0) return;
  console.log(`    ${String(findings.length).padStart(4)}  ${label}`);
}

main().catch((error) => {
  console.error('\n  Failed:', error instanceof Error ? error.message : error);
  console.error('  If this is a connection error against Supabase, check that DIRECT_URL');
  console.error('  is set to the direct connection on port 5432.\n');
  process.exitCode = 1;
});
