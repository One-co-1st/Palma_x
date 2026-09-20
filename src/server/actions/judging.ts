'use server';

import { revalidatePath } from 'next/cache';
import { authorise } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/session';
import {
  SCORING_CRITERIA,
  totalScore,
  validateRationale,
  validateScoreCard,
  type ScoreCard,
} from '@/domain/judging';
import { conflictSchema, scoreSchema } from '@/lib/validation/judging';
import { recordAudit } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql, withTransaction } from '@/server/db/sql';

export type JudgingState = { status: 'idle' | 'error' | 'success'; message?: string };

/**
 * Open a case.
 *
 * The judge confirms they have no conflict before they see the assessment. That
 * confirmation is what moves an assignment from assigned to in progress — the
 * three states in the judge's workspace are real, not cosmetic — and it is
 * written to the audit log, because a declaration that nobody recorded is not a
 * declaration.
 */
export async function confirmNoConflict(
  _previous: JudgingState,
  formData: FormData,
): Promise<JudgingState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('judging:submit_score');
  } catch {
    return { status: 'error', message: 'You are not authorised to open this case.' };
  }

  const judgeId = session.user.judgeId;
  if (!judgeId) return { status: 'error', message: 'This account is not on a PALMA panel.' };

  const assignmentId = String(formData.get('assignmentId') ?? '');
  if (!assignmentId) return { status: 'error', message: 'That assignment does not exist.' };

  const [assignment] = await sql<{ id: string; status: string; candidacyId: string }[]>`
    select id, status, "candidacyId"
    from "JudgingAssignment"
    where id = ${assignmentId} and "judgeId" = ${judgeId}
    limit 1
  `;

  if (!assignment) return { status: 'error', message: 'That assignment is not yours.' };
  if (assignment.status === 'recused') {
    return { status: 'error', message: 'You have recused yourself from this candidacy.' };
  }
  if (assignment.status === 'completed') {
    return { status: 'error', message: 'This assessment has already been submitted.' };
  }

  if (assignment.status === 'assigned') {
    await sql`
      update "JudgingAssignment"
      set status = 'in_progress'
      where id = ${assignment.id}
    `;

    await recordAudit({
      action: 'judge.no_conflict_confirmed',
      entityType: 'JudgingAssignment',
      entityId: assignment.id,
      actor: { id: session.user.id, role: session.user.role, label: session.user.email },
      summary: `No conflict declared on candidacy ${assignment.candidacyId}`,
    });
  }

  revalidatePath('/judge');
  revalidatePath(`/judge/${assignment.id}`);
  return { status: 'success', message: 'No conflict declared. The assessment is open.' };
}

/**
 * Submit a score.
 *
 * Scores are immutable: a second submission against the same assignment is
 * refused rather than overwritten. Corrections are an administrative act with
 * their own audit trail.
 */
export async function submitScore(
  _previous: JudgingState,
  formData: FormData,
): Promise<JudgingState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('judging:submit_score');
  } catch {
    return { status: 'error', message: 'You are not authorised to submit scores.' };
  }

  const judgeId = session.user.judgeId;
  if (!judgeId) return { status: 'error', message: 'This account is not on a PALMA panel.' };

  const parsed = scoreSchema.safeParse({
    assignmentId: formData.get('assignmentId'),
    ...Object.fromEntries(
      SCORING_CRITERIA.map((criterion) => [criterion.key, formData.get(criterion.key)]),
    ),
    remarks: formData.get('remarks') ?? '',
    conflictDeclared: formData.get('conflictDeclared') === 'on',
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Every criterion must be scored from 0 to 10.' };
  }

  const [assignment] = await sql<
    {
      id: string;
      status: string;
      candidacyId: string;
      scoreId: string | null;
      creatorId: string;
    }[]
  >`
    select
      ja.id,
      ja.status,
      ja."candidacyId",
      js.id as "scoreId",
      c."creatorId"
    from "JudgingAssignment" ja
    left join "JudgingScore" js on js."assignmentId" = ja.id
    join "Candidacy" c on c.id = ja."candidacyId"
    where ja.id = ${parsed.data.assignmentId} and ja."judgeId" = ${judgeId}
    limit 1
  `;

  if (!assignment) return { status: 'error', message: 'That assignment is not yours.' };
  if (assignment.scoreId) {
    return { status: 'error', message: 'A score has already been submitted for this nomination.' };
  }
  if (assignment.status === 'recused') {
    return { status: 'error', message: 'You have recused yourself from this candidacy.' };
  }

  // A conflict declared at the point of scoring removes the judge immediately.
  if (parsed.data.conflictDeclared) {
    return declareConflictInternal({
      judgeId,
      candidacyId: assignment.candidacyId,
      creatorId: assignment.creatorId,
      kind: 'other',
      note: 'Declared while scoring.',
      actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    });
  }

  const rationale = validateRationale(parsed.data.remarks ?? '');
  if (!rationale.ok) return { status: 'error', message: rationale.message };

  const card = validateScoreCard(
    Object.fromEntries(
      SCORING_CRITERIA.map((criterion) => [
        criterion.key,
        (parsed.data as Record<string, unknown>)[criterion.key],
      ]),
    ) as Partial<ScoreCard>,
  );

  if (!card.ok)
    return { status: 'error', message: Object.values(card.errors)[0] ?? 'Invalid score.' };

  const total = totalScore(card.card);

  const score = await withTransaction(async (tx) => {
    const [created] = await tx<{ id: string }[]>`
      insert into "JudgingScore" (
        id,
        "assignmentId",
        "judgeId",
        "candidacyId",
        achievement,
        quality,
        impact,
        consistency,
        audience,
        fit,
        total,
        remarks
      )
      values (
        ${createId()},
        ${assignment.id},
        ${judgeId},
        ${assignment.candidacyId},
        ${card.card.achievement},
        ${card.card.quality},
        ${card.card.impact},
        ${card.card.consistency},
        ${card.card.audience},
        ${card.card.fit},
        ${total},
        ${parsed.data.remarks || null}
      )
      returning id
    `;

    await tx`
      update "JudgingAssignment"
      set status = 'completed', "completedAt" = ${new Date()}
      where id = ${assignment.id}
    `;

    return created!;
  });

  await recordAudit({
    action: 'score.submitted',
    entityType: 'JudgingScore',
    entityId: score.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Score submitted for candidacy ${assignment.candidacyId}`,
    // The score itself is recorded in the audit log but never surfaced publicly.
    after: { total, criteria: card.card },
  });

  revalidatePath('/judge');
  revalidatePath(`/judge/${assignment.id}`);
  return { status: 'success', message: 'Assessment recorded. It cannot be changed.' };
}

export async function declareConflict(
  _previous: JudgingState,
  formData: FormData,
): Promise<JudgingState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('judging:declare_conflict');
  } catch {
    return { status: 'error', message: 'You are not authorised to declare conflicts.' };
  }

  const judgeId = session.user.judgeId;
  if (!judgeId) return { status: 'error', message: 'This account is not on a PALMA panel.' };

  const parsed = conflictSchema.safeParse({
    candidacyId: formData.get('candidacyId'),
    kind: formData.get('kind'),
    note: formData.get('note') ?? '',
  });

  if (!parsed.success) return { status: 'error', message: 'Choose the kind of conflict.' };

  const [candidacy] = await sql<{ id: string; creatorId: string }[]>`
    select id, "creatorId"
    from "Candidacy"
    where id = ${parsed.data.candidacyId}
    limit 1
  `;
  if (!candidacy) return { status: 'error', message: 'That candidacy does not exist.' };

  return declareConflictInternal({
    judgeId,
    candidacyId: candidacy.id,
    creatorId: candidacy.creatorId,
    kind: parsed.data.kind,
    note: parsed.data.note || null,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
  });
}

async function declareConflictInternal(input: {
  judgeId: string;
  candidacyId: string;
  creatorId: string;
  kind: string;
  note: string | null;
  actor: { id: string; role: string; label: string };
}): Promise<JudgingState> {
  const conflict = await withTransaction(async (tx) => {
    const [created] = await tx<{ id: string }[]>`
      insert into "JudgeConflict" (id, "judgeId", "candidacyId", "creatorId", kind, note)
      values (
        ${createId()},
        ${input.judgeId},
        ${input.candidacyId},
        ${input.creatorId},
        ${input.kind},
        ${input.note}
      )
      returning id
    `;

    // Declaring removes the judge now. Only an explicit dismissal restores them.
    await tx`
      update "JudgingAssignment"
      set status = 'recused', "recusedAt" = ${new Date()}
      where "judgeId" = ${input.judgeId} and "candidacyId" = ${input.candidacyId}
    `;

    return created!;
  });

  await recordAudit({
    action: 'judge.conflict_declared',
    entityType: 'JudgeConflict',
    entityId: conflict.id,
    actor: { id: input.actor.id, role: input.actor.role as 'judge', label: input.actor.label },
    summary: `Conflict declared on candidacy ${input.candidacyId}`,
    after: { kind: input.kind },
  });

  revalidatePath('/judge');
  return {
    status: 'success',
    message: 'Conflict declared. You have been removed from this candidacy.',
  };
}
