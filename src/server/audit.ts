import 'server-only';
import { headers } from 'next/headers';
import { hashIdentifier } from '@/lib/crypto';
import { signingSecret } from '@/lib/env';
import { createId } from '@/server/db/ids';
import { sql } from '@/server/db/sql';
import type { Role } from '@/lib/auth/rbac';

/**
 * The audited vocabulary. Adding an action here is a deliberate act: if an
 * operation changes the institutional record, it belongs in this list.
 */
export const AUDIT_ACTIONS = [
  'nomination.counted',
  'nomination.rejected',
  'nomination.withdrawn',
  'nominator.blocked',
  'candidacy.created',
  'candidacy.eligibility_changed',
  'candidacy.integrity_flagged',
  'candidacy.evidence_added',
  'judge.assigned',
  'judge.unassigned',
  'judge.conflict_declared',
  'judge.no_conflict_confirmed',
  'judge.conflict_resolved',
  'score.submitted',
  'score.corrected',
  'honour.shortlisted',
  'honour.finalist_selected',
  'honour.winner_selected',
  'honour.the_palma_conferred',
  'honour.revoked',
  /// A seal rewritten from the command line, after a key rotation or a
  /// database whose digests were written by older, drifted code.
  'honour.resealed',
  'achievement.issued',
  'creator.record_created',
  'creator.record_requested',
  'creator.record_updated',
  'creator.internal_note_added',
  'creator.profile_claimed',
  'creator.profile_updated',
  'creator.verification_updated',
  'claim.requested',
  'claim.information_requested',
  'claim.escalated',
  'claim.approved',
  'claim.rejected',
  'claim.invitation_issued',
  'verification.case_opened',
  'verification.case_decided',
  'verification.media_deleted',
  'moderation.action_taken',
  'report.filed',
  'report.resolved',
  'season.stage_changed',
  'category.created',
  'category.updated',
  'sponsor.created',
  'sponsorship.created',
  'article.published',
  'user.role_changed',
  'user.suspended',
  'user.restored',
  'user.sessions_revoked',
  'action.proposed',
  'action.approved',
  'action.cancelled',
  'user.signed_in',
  'user.signed_out',
  'user.registered',
  'user.operator_invited',
  'user.operator_reset_issued',
  'user.wrong_entrance',
  'user.password_reset_requested',
  'user.password_reset',
  'user.password_changed',
  'user.email_change_requested',
  'user.email_changed',
  'user.account_closed',
  'subscription.requested',
  'subscription.confirmed',
  'subscription.unsubscribed',
  'subscription.preferences_changed',
  'dispatch.sent',
  'commercial.sponsor_saved',
  'commercial.sponsorship_assigned',
  'commercial.sponsorship_removed',
  'commercial.package_saved',
  'feature.enabled',
  'feature.disabled',
  'feature.configured',
  'creators.imported',
  'retention.swept',
  'settings.changed',
  'record.objection_received',
  'record.objection_upheld',
  'record.objection_refused',
  'creator.portrait_published',
  'creator.portrait_withdrawn',
  'creator.portrait_removed',

  // The Product Library. The sponsorship entries are separate from the
  // editorial ones on purpose: "who paid" and "who wrote the verdict" must be
  // two different lines in the log, or the log cannot answer the only question
  // anybody will ever ask of it.
  'product.created',
  'product.updated',
  'product.sponsored',
  'product.sponsorship_cleared',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditActor = {
  id?: string | null;
  role?: Role | null;
  label?: string | null;
};

export type AuditInput = {
  action: AuditAction;
  entityType: string;
  entityId: string;
  actor?: AuditActor;
  summary?: string;
  before?: unknown;
  after?: unknown;
};

/**
 * Append-only. Audit failures must never take down the action being audited,
 * but they are loud in the server log — a silent audit gap is a governance bug.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  let ipHash: string | null = null;
  let userAgent: string | null = null;
  try {
    const headerList = await headers();
    const forwarded = headerList.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? '';
    ipHash = ip ? hashIdentifier(ip, signingSecret()) : null;
    userAgent = headerList.get('user-agent')?.slice(0, 255) ?? null;
  } catch {
    // Outside a request scope (scripts, jobs) — metadata is simply absent.
  }

  const before = serialise(input.before);
  const after = serialise(input.after);

  try {
    await sql`
      insert into "AuditLog" (
        id, action, "entityType", "entityId", "actorId", "actorRole", "actorLabel",
        summary, before, after, "ipHash", "userAgent"
      ) values (
        ${createId()},
        ${input.action},
        ${input.entityType},
        ${input.entityId},
        ${input.actor?.id ?? null},
        ${input.actor?.role ?? null},
        ${input.actor?.label ?? null},
        ${input.summary ?? null},
        ${before === undefined ? null : sql.json(before)},
        ${after === undefined ? null : sql.json(after)},
        ${ipHash},
        ${userAgent}
      )
    `;
  } catch (error) {
    console.error('[palma:audit] failed to write audit entry', input.action, error);
  }
}

function serialise(value: unknown): Parameters<typeof sql.json>[0] | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Parameters<typeof sql.json>[0];
}
