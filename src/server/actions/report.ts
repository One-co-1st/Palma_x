'use server';

import { assertSameOrigin, getSession } from '@/lib/auth/session';
import { reportSchema } from '@/lib/validation/integrity';
import { recordAudit } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql } from '@/server/db/sql';
import { RATE_LIMITS, enforceRateLimit } from '@/server/rate-limit';

export type ReportState = { status: 'idle' | 'error' | 'success'; message?: string };

/**
 * Integrity reports. Open to anyone, signed in or not — a person being
 * impersonated may well not hold a PALMA account.
 */
export async function fileReport(_previous: ReportState, formData: FormData): Promise<ReportState> {
  await assertSameOrigin();

  const limit = await enforceRateLimit(RATE_LIMITS.report);
  if (!limit.allowed) {
    return { status: 'error', message: 'Too many reports from this connection. Try again later.' };
  }

  const parsed = reportSchema.safeParse({
    reason: formData.get('reason'),
    detail: formData.get('detail'),
    creatorSlug: formData.get('creatorSlug') ?? '',
    nominationReference: formData.get('nominationReference') ?? '',
    contactEmail: formData.get('contactEmail') ?? '',
    website: formData.get('website') ?? '',
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the details.' };
  }

  // Honeypot: accept silently rather than teaching an automated client anything.
  if (parsed.data.website) return { status: 'success', message: 'Report received.' };

  const session = await getSession();

  const creator = parsed.data.creatorSlug
    ? (
        await sql<{ id: string }[]>`
          select id from "Creator" where slug = ${parsed.data.creatorSlug} limit 1
        `
      )[0]
    : undefined;
  const candidacy = parsed.data.candidacyReference
    ? (
        await sql<{ id: string }[]>`
          select id from "Candidacy" where reference = ${parsed.data.candidacyReference} limit 1
        `
      )[0]
    : undefined;

  const report = (
    await sql<{ id: string }[]>`
      insert into "Report" (id, reason, detail, "reporterId", "creatorId", "candidacyId", "createdAt")
      values (
        ${createId()}, ${parsed.data.reason}, ${parsed.data.detail},
        ${session?.user.id ?? null}, ${creator?.id ?? null}, ${candidacy?.id ?? null},
        ${new Date()}
      )
      returning id
    `
  )[0]!;

  await recordAudit({
    action: 'report.filed',
    entityType: 'Report',
    entityId: report.id,
    actor: session
      ? { id: session.user.id, role: session.user.role, label: session.user.email }
      : { label: parsed.data.contactEmail || 'anonymous' },
    summary: `Report filed: ${parsed.data.reason}`,
  });

  return {
    status: 'success',
    message:
      'Report received. A moderator will review it. If you left an email address we will tell you the outcome.',
  };
}
