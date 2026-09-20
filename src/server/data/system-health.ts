import 'server-only';
import { sql } from '@/server/db/sql';
import { env } from '@/lib/env';
import { getVerificationConfig } from '@/server/settings';
import { RETENTION_RULES, lastRetentionSweep } from '@/server/services/retention';

/**
 * System health.
 *
 * The part that makes this an administration dashboard rather than a CMS with
 * charts. Every check here either measures something real or says plainly that
 * it is not wired up — a green tick for a service PALMA cannot actually reach
 * is worse than no panel at all, because it is believed.
 */

export type ServiceState = 'operational' | 'degraded' | 'down' | 'not_configured';

export type ServiceCheck = {
  name: string;
  state: ServiceState;
  detail: string;
  /** Round trip in milliseconds, where the check measured one. */
  latencyMs?: number;
};

export const STATE_LABEL: Record<ServiceState, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
  not_configured: 'Not configured',
};

export type SystemHealth = {
  checkedAt: string;
  services: ServiceCheck[];
  /** Work PALMA does on a schedule, and whether it has run. */
  jobs: { name: string; detail: string; state: ServiceState }[];
  storage: { table: string; rows: number }[];
  recentFailures: { action: string; summary: string | null; createdAt: string }[];
};

/**
 * DateTime columns are `timestamp(3)` without time zone, holding UTC wall
 * clock. Render the same wall-clock UTC ISO string straight out of Postgres so
 * the DTOs do not depend on the session time zone. Returns a raw SQL fragment;
 * only ever called with static, quoted column references.
 */
const isoTs = (ref: string) =>
  sql.unsafe(`to_char(${ref}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);

async function checkDatabase(): Promise<ServiceCheck> {
  const started = Date.now();
  try {
    await sql`select 1`;
    const latencyMs = Date.now() - started;
    return {
      name: 'PostgreSQL',
      state: latencyMs > 500 ? 'degraded' : 'operational',
      detail:
        latencyMs > 500
          ? 'Responding, but slowly. Every page on PALMA reads from here.'
          : 'Responding. The single source of truth for the whole institution.',
      latencyMs,
    };
  } catch (error) {
    return {
      name: 'PostgreSQL',
      state: 'down',
      detail: error instanceof Error ? error.message : 'Unreachable.',
      latencyMs: Date.now() - started,
    };
  }
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const [database, [counts], failures] = await Promise.all([
    checkDatabase(),
    sql<
      [
        {
          creators: number;
          users: number;
          nominations: number;
          candidacies: number;
          honours: number;
          auditRows: number;
          sessions: number;
          records: number;
        },
      ]
    >`
      select
        (select count(*)::int from "Creator") as "creators",
        (select count(*)::int from "User") as "users",
        (select count(*)::int from "Nomination") as "nominations",
        (select count(*)::int from "Candidacy") as "candidacies",
        (select count(*)::int from "Honour") as "honours",
        (select count(*)::int from "AuditLog") as "auditRows",
        (select count(*)::int from "AuthSession") as "sessions",
        (select count(*)::int from "VerificationRecord") as "records"
    `,
    sql<{ action: string; summary: string | null; createdAt: string }[]>`
      select action, summary, ${isoTs('"createdAt"')} as "createdAt"
      from "AuditLog"
      where action in ('claim.rejected', 'verification.case_decided', 'honour.revoked')
      order by "createdAt" desc
      limit 8
    `,
  ]);

  const email: ServiceCheck = env.RESEND_API_KEY
    ? {
        name: 'Email, Resend',
        state: 'operational',
        detail: `Configured. Sending as ${env.EMAIL_FROM}.`,
      }
    : {
        name: 'Email, Resend',
        state: 'not_configured',
        detail:
          'No RESEND_API_KEY. Verification codes and receipts are written to the server log instead of sent, which is correct in development and fatal in production.',
      };

  // Manual assurance is a working mode, not a failure. The old check called it
  // "not configured", which is how a deployment ends up believing something is
  // broken while moderators are settling every case correctly by hand.
  const verificationConfig = await getVerificationConfig();

  // "The job ran and found nothing" and "the job has never run" must not read
  // the same, so this reports the last sweep rather than merely its existence.
  const sweep = await lastRetentionSweep();
  const sweptRecently =
    sweep && Date.now() - new Date(sweep.at).getTime() < 8 * 24 * 60 * 60 * 1000;

  const retentionDetail = sweep
    ? `${RETENTION_RULES.length} rules. Last run ${new Date(sweep.at).toISOString().slice(0, 10)}, ${sweep.summary}`
    : `${RETENTION_RULES.length} rules are defined and the sweep has never run. Schedule it, or run it from Settings.`;

  const retentionState: ServiceCheck['state'] = !sweep
    ? 'not_configured'
    : sweptRecently
      ? 'operational'
      : 'degraded';

  const verification: ServiceCheck =
    verificationConfig.effective === 'automatic'
      ? {
          name: 'Age assurance',
          state: 'operational',
          detail: `Automatic, through ${verificationConfig.provider}. PALMA stores only a status, a reference and a date. Cases the provider cannot settle are referred to the desk.`,
        }
      : verificationConfig.mode === 'automatic'
        ? {
            name: 'Age assurance',
            state: 'degraded',
            detail: `Automatic is selected but cannot run. Provider "${verificationConfig.provider}"${verificationConfig.hasApiKey ? '' : ', no API key'}. Every check is going to the moderation desk instead, which is the safe failure.`,
          }
        : {
            name: 'Age assurance',
            state: 'operational',
            detail: verificationConfig.automaticAvailable
              ? 'Manual review at the moderation desk. A provider is configured and can be switched on in Settings whenever you want it.'
              : 'Manual review at the moderation desk. No third-party provider is contracted yet; add a provider key and switch it on in Settings when one is.',
          };

  const auth: ServiceCheck = env.AUTH_SECRET
    ? {
        name: 'Authentication & signing',
        state: 'operational',
        detail: 'AUTH_SECRET present. Sessions, CSRF tokens and honour signatures are signed.',
      }
    : {
        name: 'Authentication & signing',
        state: 'down',
        detail: 'No AUTH_SECRET. Verification records cannot be signed or checked.',
      };

  const { creators, users, nominations, candidacies, honours, auditRows, sessions, records } =
    counts;

  const [pendingVerificationRows, unverifiedNominationRows] = await Promise.all([
    sql<[{ n: number }]>`
      select count(*)::int as n
      from "VerificationCase"
      where status in ('open', 'awaiting_information')
    `,
    sql<[{ n: number }]>`
      select count(*)::int as n
      from "Nomination"
      where status = 'pending_verification'
        and "createdAt" < ${new Date(Date.now() - 86_400_000)}
    `,
  ]);

  const pendingVerification = pendingVerificationRows[0]?.n ?? 0;
  const unverifiedNominations = unverifiedNominationRows[0]?.n ?? 0;

  return {
    checkedAt: new Date().toISOString(),
    services: [database, auth, email, verification],
    jobs: [
      {
        name: 'Nomination verification expiry',
        detail:
          unverifiedNominations > 0
            ? `${unverifiedNominations} nomination${unverifiedNominations === 1 ? '' : 's'} older than a day still awaiting a code. Retention deletes these at 30 days.`
            : 'Nothing older than a day is waiting on a verification code.',
        state: unverifiedNominations > 50 ? 'degraded' : 'operational',
      },
      {
        name: 'Manual verification queue',
        detail:
          pendingVerification > 0
            ? `${pendingVerification} case${pendingVerification === 1 ? '' : 's'} open. These do not clear themselves.`
            : 'Empty.',
        state: pendingVerification > 10 ? 'degraded' : 'operational',
      },
      {
        name: 'Statistics aggregation',
        detail:
          'Not a job. Every figure in this dashboard is counted live against PostgreSQL, so there is no rollup to fall behind.',
        state: 'operational',
      },
      {
        name: 'Scheduled retention deletion',
        detail: retentionDetail,
        state: retentionState,
      },
    ],
    storage: [
      { table: 'Creator', rows: creators },
      { table: 'User', rows: users },
      { table: 'Nomination', rows: nominations },
      { table: 'Candidacy', rows: candidacies },
      { table: 'Honour', rows: honours },
      { table: 'VerificationRecord', rows: records },
      { table: 'AuthSession', rows: sessions },
      { table: 'AuditLog', rows: auditRows },
    ],
    recentFailures: failures.map((entry) => ({
      action: entry.action,
      summary: entry.summary,
      createdAt: entry.createdAt,
    })),
  };
}
