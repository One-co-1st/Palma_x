import 'server-only';
import { recordAudit, type AuditActor } from '@/server/audit';
import { sql } from '@/server/db/sql';
import { RETENTION_RULES, retentionDays, type RetentionRule } from '@/domain/retention-schedule';

export { RETENTION_RULES, type RetentionRule };

/**
 * Retention, applied rather than published.
 *
 * PALMA's privacy notice states how long things are kept. A period nobody
 * enforces is not a retention policy, it is a sentence — so this is the job
 * that makes the notice true.
 *
 * What it deliberately does *not* touch: the institutional record. Creator
 * records, honours, achievements, verification records and the audit log are
 * permanent by design, because an award that expires after two years was not
 * an award. Everything here is operational exhaust — tokens that have been
 * spent, sessions that have ended, counters that have rolled over, and
 * personal data PALMA has no remaining reason to hold.
 */

export type RetentionResult = {
  ranAt: string;
  removed: Record<string, number>;
  total: number;
};

const DAY = 24 * 60 * 60 * 1000;

function cutoff(days: number): Date {
  return new Date(Date.now() - days * DAY);
}

const ruleDays = retentionDays;

/**
 * Run the sweep.
 *
 * Idempotent and safe to run as often as you like — every rule is "older than
 * N days", so a second run in the same hour removes nothing. It is written to
 * be run from a scheduler, from the admin dashboard, or by hand.
 */
export async function runRetentionSweep(actor?: AuditActor): Promise<RetentionResult> {
  const removed: Record<string, number> = {};

  // Sessions that have ended. A live session is untouched however old it is.
  removed.auth_sessions = (
    await sql`
      delete from "AuthSession"
      where "expiresAt" < ${cutoff(ruleDays('auth_sessions'))}
         or "revokedAt" < ${cutoff(ruleDays('auth_sessions'))}
    `
  ).count;

  removed.password_resets = (
    await sql`
      delete from "PasswordResetToken"
      where "usedAt" < ${cutoff(ruleDays('password_resets'))}
         or "expiresAt" < ${cutoff(ruleDays('password_resets'))}
    `
  ).count;

  removed.email_changes = (
    await sql`
      delete from "EmailChangeRequest"
      where "confirmedAt" < ${cutoff(ruleDays('email_changes'))}
         or "cancelledAt" < ${cutoff(ruleDays('email_changes'))}
         or "expiresAt" < ${cutoff(ruleDays('email_changes'))}
    `
  ).count;

  removed.rate_limits = (
    await sql`
      delete from "RateLimitCounter"
      where "windowEndsAt" < ${cutoff(ruleDays('rate_limits'))}
    `
  ).count;

  removed.subscriptions_left = (
    await sql`
      delete from "EmailSubscription"
      where status = 'unsubscribed'
        and "unsubscribedAt" < ${cutoff(ruleDays('subscriptions_left'))}
    `
  ).count;

  removed.email_deliveries = (
    await sql`
      delete from "EmailDelivery"
      where status in ('sent', 'suppressed')
        and "createdAt" < ${cutoff(ruleDays('email_deliveries'))}
    `
  ).count;

  removed.email_deliveries_failed = (
    await sql`
      delete from "EmailDelivery"
      where status = 'failed'
        and "createdAt" < ${cutoff(ruleDays('email_deliveries_failed'))}
    `
  ).count;

  removed.dossier_archived = (
    await sql`
      delete from "Notification"
      where "isImportant" = false
        and "archivedAt" < ${cutoff(ruleDays('dossier_archived'))}
    `
  ).count;

  const total = Object.values(removed).reduce((sum, count) => sum + count, 0);
  const ranAt = new Date().toISOString();

  // Always audited, including a sweep that removed nothing: "the job ran and
  // found nothing" and "the job did not run" must not look the same.
  await recordAudit({
    action: 'retention.swept',
    entityType: 'System',
    entityId: 'retention',
    actor: actor ?? { label: 'scheduler' },
    summary: `Retention sweep removed ${total} row${total === 1 ? '' : 's'}`,
    after: removed,
  });

  return { ranAt, removed, total };
}

/** When the sweep last ran, from the audit log rather than a second table. */
export async function lastRetentionSweep(): Promise<{ at: string; summary: string } | null> {
  const [entry] = await sql<{ createdAt: Date; summary: string | null }[]>`
    select "createdAt", summary
    from "AuditLog"
    where action = 'retention.swept'
    order by "createdAt" desc
    limit 1
  `;

  if (!entry) return null;
  return { at: entry.createdAt.toISOString(), summary: entry.summary ?? '' };
}
