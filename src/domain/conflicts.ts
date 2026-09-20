export const CONFLICT_KINDS = [
  { key: 'personal_relationship', label: 'Personal relationship' },
  { key: 'commercial_relationship', label: 'Commercial relationship' },
  { key: 'representation', label: 'Representation or management' },
  { key: 'employment', label: 'Employment' },
  { key: 'competitor', label: 'Direct competitor' },
  { key: 'other', label: 'Other' },
] as const;

export type ConflictKind = (typeof CONFLICT_KINDS)[number]['key'];

export type ConflictRecord = {
  judgeId: string;
  creatorId?: string | null;
  candidacyId?: string | null;
  status: 'declared' | 'upheld' | 'dismissed';
};

/**
 * A declared conflict removes a judge from the nomination immediately — it is
 * not held pending review. Only an explicit dismissal restores eligibility.
 */
export function isJudgeEligible(
  judgeId: string,
  candidacy: { id: string; creatorId: string },
  conflicts: ConflictRecord[],
): boolean {
  return !conflicts.some(
    (conflict) =>
      conflict.judgeId === judgeId &&
      conflict.status !== 'dismissed' &&
      (conflict.candidacyId === candidacy.id || conflict.creatorId === candidacy.creatorId),
  );
}

export type AssignmentPlanInput = {
  candidacies: { id: string; creatorId: string }[];
  judgeIds: string[];
  conflicts: ConflictRecord[];
  /** How many judges should score each candidacy. */
  judgesPerCandidacy: number;
};

export type AssignmentPlan = {
  assignments: { candidacyId: string; judgeId: string }[];
  /** Candidacies that could not be fully covered without a conflict. */
  understaffed: { candidacyId: string; assigned: number }[];
};

/**
 * Deterministic round-robin assignment that respects conflicts and spreads
 * load evenly across the panel. Deterministic on purpose: the same inputs must
 * produce the same panel, so an assignment can be explained after the fact.
 */
export function planAssignments(input: AssignmentPlanInput): AssignmentPlan {
  const assignments: { candidacyId: string; judgeId: string }[] = [];
  const understaffed: { candidacyId: string; assigned: number }[] = [];
  const load = new Map<string, number>(input.judgeIds.map((id) => [id, 0]));

  for (const candidacy of input.candidacies) {
    const eligible = input.judgeIds
      .filter((judgeId) => isJudgeEligible(judgeId, candidacy, input.conflicts))
      .sort((a, b) => {
        const loadDiff = (load.get(a) ?? 0) - (load.get(b) ?? 0);
        return loadDiff !== 0 ? loadDiff : a.localeCompare(b);
      });

    const chosen = eligible.slice(0, input.judgesPerCandidacy);
    for (const judgeId of chosen) {
      assignments.push({ candidacyId: candidacy.id, judgeId });
      load.set(judgeId, (load.get(judgeId) ?? 0) + 1);
    }

    if (chosen.length < input.judgesPerCandidacy) {
      understaffed.push({ candidacyId: candidacy.id, assigned: chosen.length });
    }
  }

  return { assignments, understaffed };
}
