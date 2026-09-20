'use server';

import { revalidatePath } from 'next/cache';
import { authorise } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/session';
import { planAssignments } from '@/domain/conflicts';
import { canAdvance, SEASON_STAGES, type SeasonStage } from '@/domain/season';
import { proposeFinalists, proposeWinner, DEFAULT_FINALIST_COUNT } from '@/domain/selection';
import { SCORING_CRITERIA, totalScore, validateScoreCard } from '@/domain/judging';
import { scoreCorrectionSchema } from '@/lib/validation/judging';
import { recordAudit } from '@/server/audit';
import { sendCandidacyUpdate, sendPanelAssignment } from '@/server/email/messages';
import { createId } from '@/server/db/ids';
import { sql } from '@/server/db/sql';
import { conferHonour, conferThePalma, revokeHonour } from '@/server/services/honours';
import { conferralObjections, nameObjections } from '@/domain/the-palma';

export type AdminState = { status: 'idle' | 'error' | 'success'; message?: string };

const JUDGES_PER_CANDIDACY = 3;

/**
 * Rule on a candidacy after human review.
 *
 * This is the screening layer between the audience and the panel: it decides
 * whether a creator's candidacy is eligible to be judged at all. It never reads
 * the nomination count.
 */
export async function reviewCandidacy(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:review_nominations');
  } catch {
    return { status: 'error', message: 'You are not authorised to review candidacies.' };
  }

  const candidacyId = String(formData.get('candidacyId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '').trim();

  if (!['eligible', 'ineligible', 'withdrawn', 'under_review'].includes(decision)) {
    return { status: 'error', message: 'Unknown decision.' };
  }
  if (decision !== 'eligible' && note.length < 10) {
    return { status: 'error', message: 'Record a reason of at least 10 characters.' };
  }

  const [before] = await sql<
    {
      status: string;
      reference: string;
      creatorId: string;
      displayName: string;
      holderId: string | null;
      holderEmail: string | null;
      categoryName: string;
      year: number;
    }[]
  >`
    select
      c.status,
      c.reference,
      c."creatorId",
      cr."displayName",
      u.id as "holderId",
      u.email as "holderEmail",
      cat.name as "categoryName",
      ay.year
    from "Candidacy" c
    join "Creator" cr on cr.id = c."creatorId"
    left join "User" u on u.id = cr."userId"
    join "Category" cat on cat.id = c."categoryId"
    join "AwardYear" ay on ay.id = c."awardYearId"
    where c.id = ${candidacyId}
    limit 1
  `;
  if (!before) return { status: 'error', message: 'That candidacy does not exist.' };

  if (decision === 'eligible') {
    await sql`
      update "Candidacy"
      set
        status = ${decision},
        "reviewedAt" = ${new Date()},
        "reviewedById" = ${session.user.id},
        "reviewNote" = ${note || null},
        -- Ruling on it resolves whatever the integrity screen raised.
        "integrityFlag" = false
      where id = ${candidacyId}
    `;
  } else {
    await sql`
      update "Candidacy"
      set
        status = ${decision},
        "reviewedAt" = ${new Date()},
        "reviewedById" = ${session.user.id},
        "reviewNote" = ${note || null}
      where id = ${candidacyId}
    `;
  }

  await recordAudit({
    action: 'candidacy.eligibility_changed',
    entityType: 'Candidacy',
    entityId: candidacyId,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${before.reference} → ${decision}`,
    before: { status: before.status },
    after: { status: decision, note: note || null },
  });

  // Only the two outcomes a creator can act on. "Under review" is PALMA's
  // internal state and telling somebody their case is being looked at, twice,
  // is noise rather than transparency.
  if (before.holderId && before.holderEmail && (decision === 'eligible' || decision === 'ineligible')) {
    await sendCandidacyUpdate({
      to: before.holderEmail,
      userId: before.holderId,
      creatorId: before.creatorId,
      creatorName: before.displayName,
      categoryName: before.categoryName,
      year: before.year,
      status: decision === 'eligible' ? 'in_contention' : 'ineligible',
      reason: note || null,
    });
  }

  revalidatePath('/portal/nominations');
  return { status: 'success', message: `Candidacy marked ${decision.replace('_', ' ')}.` };
}

/**
 * Assign the panel for a category.
 *
 * Assignment is deterministic and conflict-aware: the same inputs produce the
 * same panel, so a placement can be explained after the fact.
 */
export async function assignJudges(_previous: AdminState, formData: FormData): Promise<AdminState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:assign_judging');
  } catch {
    return { status: 'error', message: 'You are not authorised to assign judging.' };
  }

  const categoryId = String(formData.get('categoryId') ?? '');

  const [category] = await sql<{ id: string; name: string; awardYearId: string; year: number }[]>`
    select cat.id, cat.name, cat."awardYearId", ay.year
    from "Category" cat
    join "AwardYear" ay on ay.id = cat."awardYearId"
    where cat.id = ${categoryId}
    limit 1
  `;

  if (!category) return { status: 'error', message: 'That category does not exist.' };

  const candidacies = await sql<{ id: string; creatorId: string }[]>`
    select id, "creatorId"
    from "Candidacy"
    where "categoryId" = ${categoryId} and status = 'eligible'
  `;

  if (candidacies.length === 0) {
    return { status: 'error', message: 'No eligible candidacies to assign in this category.' };
  }

  const memberships = await sql<{ judgeId: string; isActive: boolean }[]>`
    select m."judgeId", j."isActive"
    from "JudgePanelMembership" m
    join "Judge" j on j.id = m."judgeId"
    where m."awardYearId" = ${category.awardYearId}
  `;

  const judgeIds = memberships
    .filter((membership) => membership.isActive)
    .map((membership) => membership.judgeId);

  if (judgeIds.length === 0) {
    return { status: 'error', message: 'No active judges are seated on this season’s panel.' };
  }

  const conflicts = await sql<
    {
      judgeId: string;
      creatorId: string | null;
      candidacyId: string | null;
      status: 'declared' | 'upheld' | 'dismissed';
    }[]
  >`
    select "judgeId", "creatorId", "candidacyId", status
    from "JudgeConflict"
    where "judgeId" in ${sql(judgeIds)} and status <> 'dismissed'
  `;

  const existing = await sql<{ judgeId: string; candidacyId: string }[]>`
    select "judgeId", "candidacyId"
    from "JudgingAssignment"
    where "categoryId" = ${categoryId}
  `;
  const alreadyAssigned = new Set(existing.map((row) => `${row.judgeId}:${row.candidacyId}`));

  const plan = planAssignments({
    candidacies,
    judgeIds,
    conflicts: conflicts.map((conflict) => ({
      judgeId: conflict.judgeId,
      creatorId: conflict.creatorId,
      candidacyId: conflict.candidacyId,
      status: conflict.status,
    })),
    judgesPerCandidacy: JUDGES_PER_CANDIDACY,
  });

  const fresh = plan.assignments.filter(
    (assignment) => !alreadyAssigned.has(`${assignment.judgeId}:${assignment.candidacyId}`),
  );

  if (fresh.length === 0) {
    return { status: 'success', message: 'Every eligible candidacy is already assigned.' };
  }

  await sql`
    insert into "JudgingAssignment" ${sql(
      fresh.map((assignment) => ({
        id: createId(),
        judgeId: assignment.judgeId,
        candidacyId: assignment.candidacyId,
        categoryId,
      })),
    )}
    on conflict do nothing
  `;

  // One message per judge naming how many cases they have, rather than one per
  // case. A panel member who opens fourteen identical emails learns nothing
  // from the second one.
  const perJudge = new Map<string, number>();
  for (const assignment of fresh) {
    perJudge.set(assignment.judgeId, (perJudge.get(assignment.judgeId) ?? 0) + 1);
  }

  const seated = await sql<
    { id: string; displayName: string; userId: string | null; userEmail: string | null }[]
  >`
    select j.id, j."displayName", u.id as "userId", u.email as "userEmail"
    from "Judge" j
    left join "User" u on u.id = j."userId"
    where j.id in ${sql([...perJudge.keys()])}
  `;

  for (const judge of seated) {
    if (!judge.userId || !judge.userEmail) continue;
    await sendPanelAssignment({
      to: judge.userEmail,
      userId: judge.userId,
      judgeName: judge.displayName,
      categoryName: category.name,
      year: category.year,
      caseCount: perJudge.get(judge.id) ?? 0,
    });
  }

  await recordAudit({
    action: 'judge.assigned',
    entityType: 'Category',
    entityId: categoryId,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${fresh.length} assignments created in ${category.name}`,
    after: { assignments: fresh.length, understaffed: plan.understaffed },
  });

  revalidatePath('/admin/judging');
  return {
    status: 'success',
    message:
      plan.understaffed.length > 0
        ? `${fresh.length} assignments created. ${plan.understaffed.length} candidacy(ies) could not be fully covered without a conflict.`
        : `${fresh.length} assignments created.`,
  };
}

/** Confirm the panel's ranking as this category's finalists. */
export async function confirmFinalists(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:select_finalists');
  } catch {
    return { status: 'error', message: 'You are not authorised to select finalists.' };
  }

  const categoryId = String(formData.get('categoryId') ?? '');

  const [category] = await sql<{ id: string; name: string }[]>`
    select id, name
    from "Category"
    where id = ${categoryId}
    limit 1
  `;

  if (!category) return { status: 'error', message: 'That category does not exist.' };

  const candidacies = await sql<
    {
      id: string;
      creatorId: string;
      isSuspended: boolean;
      verificationStatus: string | null;
    }[]
  >`
    select
      c.id,
      c."creatorId",
      cr."isSuspended",
      cv.status as "verificationStatus"
    from "Candidacy" c
    join "Creator" cr on cr.id = c."creatorId"
    left join "CreatorVerification" cv on cv."creatorId" = c."creatorId"
    where c."categoryId" = ${categoryId} and c.status not in ('withdrawn', 'ineligible')
  `;

  const scores = candidacies.length
    ? await sql<{ candidacyId: string; total: number }[]>`
        select "candidacyId", total
        from "JudgingScore"
        where "candidacyId" in ${sql(candidacies.map((candidacy) => candidacy.id))}
      `
    : [];
  const totalsByCandidacy = new Map<string, number[]>();
  for (const score of scores) {
    const totals = totalsByCandidacy.get(score.candidacyId) ?? [];
    totals.push(score.total);
    totalsByCandidacy.set(score.candidacyId, totals);
  }

  const proposal = proposeFinalists(
    candidacies.map((candidacy) => ({
      candidacyId: candidacy.id,
      creatorId: candidacy.creatorId,
      totals: totalsByCandidacy.get(candidacy.id) ?? [],
      eligible: !candidacy.isSuspended && candidacy.verificationStatus === 'verified',
    })),
    DEFAULT_FINALIST_COUNT,
  );

  if (proposal.selected.length === 0) {
    return { status: 'error', message: 'No eligible candidacies can be advanced.' };
  }

  const results = [];
  for (const finalist of proposal.selected) {
    results.push(
      await conferHonour({
        candidacyId: finalist.candidacyId,
        kind: 'finalist',
        position: finalist.position,
        actor: { id: session.user.id, role: session.user.role, label: session.user.email },
      }),
    );
  }

  const conferred = results.filter((result) => result.ok).length;

  revalidatePath('/admin/selection');
  revalidatePath('/finalists');

  return {
    status: 'success',
    message: [
      `${conferred} finalist honour(s) conferred in ${category.name}.`,
      ...proposal.warnings,
    ].join(' '),
  };
}

/** Confer the PALMA itself. The single most consequential action in the system. */
export async function confirmWinner(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:select_winners');
  } catch {
    return { status: 'error', message: 'You are not authorised to select winners.' };
  }

  const categoryId = String(formData.get('categoryId') ?? '');
  const citation = String(formData.get('citation') ?? '').trim() || null;

  const finalists = await sql<
    {
      id: string;
      candidacyId: string;
      creatorId: string;
      isSuspended: boolean;
      verificationStatus: string | null;
    }[]
  >`
    select
      h.id,
      c.id as "candidacyId",
      h."creatorId",
      cr."isSuspended",
      cv.status as "verificationStatus"
    from "Honour" h
    join "Candidacy" c on c.id = h."candidacyId"
    join "Creator" cr on cr.id = c."creatorId"
    left join "CreatorVerification" cv on cv."creatorId" = c."creatorId"
    where h."categoryId" = ${categoryId} and h.kind = 'finalist' and h.state = 'active'
  `;

  if (finalists.length === 0) {
    return { status: 'error', message: 'Confirm the finalists before selecting a winner.' };
  }

  const scores = await sql<{ candidacyId: string; total: number }[]>`
    select "candidacyId", total
    from "JudgingScore"
    where "candidacyId" in ${sql(finalists.map((honour) => honour.candidacyId))}
  `;
  const totalsByCandidacy = new Map<string, number[]>();
  for (const score of scores) {
    const totals = totalsByCandidacy.get(score.candidacyId) ?? [];
    totals.push(score.total);
    totalsByCandidacy.set(score.candidacyId, totals);
  }

  const proposal = proposeWinner(
    finalists.map((honour) => ({
      candidacyId: honour.candidacyId,
      creatorId: honour.creatorId,
      totals: totalsByCandidacy.get(honour.candidacyId) ?? [],
      eligible: !honour.isSuspended && honour.verificationStatus === 'verified',
    })),
  );

  const winner = proposal.selected[0];
  if (!winner) {
    return { status: 'error', message: proposal.warnings.join(' ') || 'No eligible winner.' };
  }

  const result = await conferHonour({
    candidacyId: winner.candidacyId,
    kind: 'winner',
    position: 1,
    citation,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
  });

  if (!result.ok) return { status: 'error', message: result.reason };

  revalidatePath('/admin/selection');
  revalidatePath('/winners');
  revalidatePath('/paroh');

  return {
    status: 'success',
    message: [`PALMA conferred. Verification code ${result.code}.`, ...proposal.warnings].join(' '),
  };
}

export async function revokeHonourAction(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:revoke_honour');
  } catch {
    return { status: 'error', message: 'You are not authorised to revoke honours.' };
  }

  const result = await revokeHonour({
    honourId: String(formData.get('honourId') ?? ''),
    reason: String(formData.get('reason') ?? ''),
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
  });

  if (!result.ok) return { status: 'error', message: result.reason ?? 'Could not revoke.' };

  revalidatePath('/paroh');
  return {
    status: 'success',
    message: 'Honour revoked. The verification record now reads revoked.',
  };
}

/**
 * Controlled score correction.
 *
 * Judges cannot edit a submitted score. An administrator can, once, with a
 * written reason — and both the original and the correction are preserved.
 */
export async function correctScore(_previous: AdminState, formData: FormData): Promise<AdminState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:correct_score');
  } catch {
    return { status: 'error', message: 'You are not authorised to correct scores.' };
  }

  const parsed = scoreCorrectionSchema.safeParse(
    Object.fromEntries([
      ['scoreId', formData.get('scoreId')],
      ['correctionNote', formData.get('correctionNote')],
      ...SCORING_CRITERIA.map((criterion) => [criterion.key, formData.get(criterion.key)] as const),
    ]),
  );

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the correction.' };
  }

  const [existing] = await sql<
    {
      id: string;
      achievement: number;
      quality: number;
      impact: number;
      consistency: number;
      audience: number;
      fit: number;
      total: number;
    }[]
  >`
    select id, achievement, quality, impact, consistency, audience, fit, total
    from "JudgingScore"
    where id = ${parsed.data.scoreId}
    limit 1
  `;
  if (!existing) return { status: 'error', message: 'That score does not exist.' };

  const card = validateScoreCard(
    Object.fromEntries(
      SCORING_CRITERIA.map((criterion) => [
        criterion.key,
        (parsed.data as Record<string, unknown>)[criterion.key],
      ]),
    ),
  );
  if (!card.ok) return { status: 'error', message: 'Every criterion must be 0 to 10.' };

  const total = totalScore(card.card);

  await sql`
    update "JudgingScore"
    set
      achievement = ${card.card.achievement},
      quality = ${card.card.quality},
      impact = ${card.card.impact},
      consistency = ${card.card.consistency},
      audience = ${card.card.audience},
      fit = ${card.card.fit},
      total = ${total},
      "correctedAt" = ${new Date()},
      "correctedById" = ${session.user.id},
      "correctionNote" = ${parsed.data.correctionNote}
    where id = ${existing.id}
  `;

  await recordAudit({
    action: 'score.corrected',
    entityType: 'JudgingScore',
    entityId: existing.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: parsed.data.correctionNote,
    before: {
      ...Object.fromEntries(
        SCORING_CRITERIA.map((criterion) => [
          criterion.key,
          (existing as unknown as Record<string, number>)[criterion.key],
        ]),
      ),
      total: existing.total,
    },
    after: { ...card.card, total },
  });

  revalidatePath('/admin');
  return { status: 'success', message: 'Score corrected and recorded in the audit log.' };
}

/** Seasons move one stage at a time, and always forwards. */
export async function advanceSeason(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('admin:manage_seasons');
  } catch {
    return { status: 'error', message: 'You are not authorised to manage seasons.' };
  }

  const year = Number(formData.get('year'));
  const target = String(formData.get('stage') ?? '') as SeasonStage;
  if (!SEASON_STAGES.includes(target)) return { status: 'error', message: 'Unknown stage.' };

  const [season] = await sql<{ id: string; title: string; stage: string }[]>`
    select id, title, stage
    from "AwardYear"
    where year = ${year}
    limit 1
  `;
  if (!season) return { status: 'error', message: 'That season does not exist.' };

  if (!canAdvance(season.stage as SeasonStage, target)) {
    return {
      status: 'error',
      message: 'A season advances one stage at a time. Going back is a controlled correction.',
    };
  }

  await sql`
    update "AwardYear"
    set stage = ${target}
    where year = ${year}
  `;

  await recordAudit({
    action: 'season.stage_changed',
    entityType: 'AwardYear',
    entityId: season.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${season.title}: ${season.stage} → ${target}`,
    before: { stage: season.stage },
    after: { stage: target },
  });

  revalidatePath('/admin');
  revalidatePath('/awards');
  return {
    status: 'success',
    message: `${season.title} advanced to ${target.replace(/_/g, ' ')}.`,
  };
}

/**
 * Propose THE PALMA.
 *
 * The desk's half. It writes a proposal and nothing else: no honour, no
 * achievement, no verification record. The panel decides who receives THE
 * PALMA, the desk records that decision and the citation, and a second person
 * with `honours:confer_the_palma` completes it.
 *
 * This split is why the desk can own the work without the firewall moving. A
 * moderator can edit a creator's record; if the same moderator could also
 * confer the institution's highest honour on that creator, one person would
 * hold both halves of the only story PALMA sells.
 */
export async function proposeThePalmaAction(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('honours:propose_the_palma');
  } catch {
    return { status: 'error', message: 'You are not authorised to propose THE PALMA.' };
  }

  const awardYearId = String(formData.get('awardYearId') ?? '').trim();
  const creatorId = String(formData.get('creatorId') ?? '').trim();
  const citation = String(formData.get('citation') ?? '').trim();

  if (!awardYearId) return { status: 'error', message: 'Choose a season.' };
  if (!creatorId) return { status: 'error', message: 'Name a creator.' };

  // The naming rules apply to the citation before it is stored, not after.
  const naming = nameObjections(citation);
  if (naming.length > 0) return { status: 'error', message: naming.join(' ') };

  const [[awardYear], [creator]] = await Promise.all([
    sql<{ year: number }[]>`
      select year
      from "AwardYear"
      where id = ${awardYearId}
      limit 1
    `,
    sql<
      {
        displayName: string;
        isPublished: boolean;
        isSuspended: boolean;
        verificationStatus: string | null;
      }[]
    >`
      select
        c."displayName",
        c."isPublished",
        c."isSuspended",
        cv.status as "verificationStatus"
      from "Creator" c
      left join "CreatorVerification" cv on cv."creatorId" = c.id
      where c.id = ${creatorId}
      limit 1
    `,
  ]);

  if (!awardYear) return { status: 'error', message: 'That season does not exist.' };
  if (!creator) return { status: 'error', message: 'That creator does not exist.' };

  // Everything the conferral will check, checked now, so the desk finds out
  // at the point of writing rather than the approver finding out days later.
  const [countRows, held] = await Promise.all([
    sql<{ count: number }[]>`
      select count(*)::int as count
      from "Honour"
      where "awardYearId" = ${awardYearId} and kind = 'the_palma' and state = 'active'
    `,
    sql<{ year: number }[]>`
      select ay.year
      from "Honour" h
      join "AwardYear" ay on ay.id = h."awardYearId"
      where h."creatorId" = ${creatorId} and h.kind = 'the_palma' and h.state = 'active'
    `,
  ]);
  const existingThisSeason = countRows[0]?.count ?? 0;

  // Checked here as well as at conferral, and with the real status rather than
  // an assumed one. A proposal that can never be conferred is worse than a
  // refusal: the desk believes it has done the work, and the person signing it
  // off days later is the one who discovers it cannot be done.
  const objections = conferralObjections({
    existingThisSeason,
    creatorHeldIn: held.map((honour) => honour.year),
    creatorIsVerified: creator.verificationStatus === 'verified',
    creatorIsPublished: creator.isPublished && !creator.isSuspended,
    citation,
  });
  if (objections.length > 0) return { status: 'error', message: objections.join(' ') };

  // A proposal names two things, a season and a creator, and this table has
  // one id column. They are stored joined, with the type saying so, rather than
  // the approver re-deriving the creator by matching the subject line against
  // names — which breaks the first time two creators share a prefix.
  const entityId = `${awardYearId}:${creatorId}`;

  const [pending] = await sql<{ id: string }[]>`
    select id
    from "ConsequentialAction"
    where
      kind = 'the_palma_conferral'
      and "entityId" like ${`${awardYearId}:%`}
      and "executedAt" is null
      and "cancelledAt" is null
    limit 1
  `;
  if (pending) {
    return { status: 'error', message: 'THE PALMA is already proposed for that season.' };
  }

  const [proposal] = await sql<{ id: string }[]>`
    insert into "ConsequentialAction" (
      id, kind, "entityType", "entityId", subject, reason, "requestedById"
    )
    values (
      ${createId()},
      'the_palma_conferral',
      'AwardYear:Creator',
      ${entityId},
      ${`${creator.displayName}, THE PALMA ${awardYear.year}`},
      ${citation},
      ${session.user.id}
    )
    returning id
  `;

  // The creator is carried on the audit entry rather than a column, because
  // ConsequentialAction has no field for it and inventing one for a single
  // kind would be worse than writing it down where it is already written.
  await recordAudit({
    action: 'action.proposed',
    entityType: 'ConsequentialAction',
    entityId: proposal!.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `THE PALMA ${awardYear.year} proposed for ${creator.displayName}`,
    after: { creatorId, citation },
  });

  revalidatePath('/portal/the-palma');
  revalidatePath('/admin/the-palma');

  return {
    status: 'success',
    message: 'Proposed. It is conferred when a second person approves it.',
  };
}

/**
 * Confer or decline a proposed PALMA.
 *
 * The second signature. The approver may not be the proposer, which is the
 * whole point of a two-person rule and is enforced here rather than trusted.
 */
export async function decideThePalmaAction(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await assertSameOrigin();

  let session;
  try {
    session = await authorise('honours:confer_the_palma');
  } catch {
    return { status: 'error', message: 'You are not authorised to confer THE PALMA.' };
  }

  const id = String(formData.get('actionId') ?? '').trim();
  const decision = String(formData.get('decision') ?? '').trim();

  const [proposal] = await sql<
    {
      id: string;
      kind: string;
      entityId: string;
      subject: string;
      reason: string;
      requestedById: string;
      executedAt: Date | null;
      cancelledAt: Date | null;
    }[]
  >`
    select id, kind, "entityId", subject, reason, "requestedById", "executedAt", "cancelledAt"
    from "ConsequentialAction"
    where id = ${id}
    limit 1
  `;

  if (!proposal || proposal.kind !== 'the_palma_conferral') {
    return { status: 'error', message: 'That proposal does not exist.' };
  }
  if (proposal.executedAt || proposal.cancelledAt) {
    return { status: 'error', message: 'That proposal has already been settled.' };
  }

  if (decision === 'decline') {
    await sql`
      update "ConsequentialAction"
      set "cancelledAt" = ${new Date()}, "cancelledReason" = 'Declined before conferral.'
      where id = ${id}
    `;
    await recordAudit({
      action: 'action.cancelled',
      entityType: 'ConsequentialAction',
      entityId: id,
      actor: { id: session.user.id, role: session.user.role, label: session.user.email },
      summary: `${proposal.subject} declined. No PALMA was conferred.`,
    });
    revalidatePath('/portal/the-palma');
    revalidatePath('/admin/the-palma');
    return { status: 'success', message: 'Declined. Nothing was conferred.' };
  }

  if (proposal.requestedById === session.user.id) {
    return {
      status: 'error',
      message:
        'You proposed this. A second person has to confer it. That is the point of the rule.',
    };
  }

  const [awardYearId, creatorId] = proposal.entityId.split(':');
  if (!awardYearId || !creatorId) {
    return { status: 'error', message: 'That proposal is malformed and cannot be conferred.' };
  }

  const result = await conferThePalma({
    awardYearId,
    creatorId,
    citation: proposal.reason,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
  });

  if (!result.ok) return { status: 'error', message: result.reason };

  await sql`
    update "ConsequentialAction"
    set
      "approvedById" = ${session.user.id},
      "approvedAt" = ${new Date()},
      "executedAt" = ${new Date()}
    where id = ${id}
  `;

  revalidatePath('/portal/the-palma');
  revalidatePath('/admin/the-palma');
  revalidatePath('/the-palma');
  revalidatePath('/winners');
  revalidatePath('/paroh');

  return {
    status: 'success',
    message: `THE PALMA conferred. Verification code ${result.code}.`,
  };
}
