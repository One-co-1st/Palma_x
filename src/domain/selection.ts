import { rank, SHARP_DISAGREEMENT, type CandidacyScores } from './judging';

export const DEFAULT_FINALIST_COUNT = 4;
export const MIN_JUDGES_PER_CANDIDACY = 3;

export type SelectionCandidate = CandidacyScores & {
  creatorId: string;
  eligible: boolean;
};

export type SelectionResult<T> = {
  selected: T[];
  warnings: string[];
};

/**
 * Finalist selection is a recommendation, never an automatic act: the ranking
 * is produced here and an administrator confirms it, which is what gets audited.
 */
export function proposeFinalists(
  candidates: SelectionCandidate[],
  count = DEFAULT_FINALIST_COUNT,
): SelectionResult<{ candidacyId: string; creatorId: string; position: number }> {
  const warnings: string[] = [];
  const eligible = candidates.filter((candidate) => candidate.eligible);

  const ineligibleCount = candidates.length - eligible.length;
  if (ineligibleCount > 0) {
    warnings.push(`${ineligibleCount} candidacy(ies) excluded as ineligible.`);
  }

  const underJudged = eligible.filter(
    (candidate) => candidate.totals.length < MIN_JUDGES_PER_CANDIDACY,
  );
  if (underJudged.length > 0) {
    warnings.push(
      `${underJudged.length} candidacy(ies) have fewer than ${MIN_JUDGES_PER_CANDIDACY} completed scores.`,
    );
  }

  const byId = new Map(eligible.map((candidate) => [candidate.candidacyId, candidate]));
  const ranked = rank(eligible.map(({ candidacyId, totals }) => ({ candidacyId, totals })));

  const selected = ranked.slice(0, count).map((entry, index) => ({
    candidacyId: entry.candidacyId,
    creatorId: byId.get(entry.candidacyId)?.creatorId ?? '',
    position: index + 1,
  }));

  if (selected.length < count) {
    warnings.push(`Only ${selected.length} eligible candidacy(ies) available for ${count} places.`);
  }

  const tie =
    ranked[count - 1] &&
    ranked[count] &&
    ranked[count - 1]!.trimmedMean === ranked[count]!.trimmedMean;
  if (tie) {
    warnings.push('A tie exists at the finalist cut line. Chair review required.');
  }

  return { selected, warnings };
}

export function proposeWinner(
  finalists: SelectionCandidate[],
): SelectionResult<{ candidacyId: string; creatorId: string }> {
  const warnings: string[] = [];
  const eligible = finalists.filter((candidate) => candidate.eligible);

  if (eligible.length === 0) {
    return { selected: [], warnings: ['No eligible finalists.'] };
  }

  const ranked = rank(eligible.map(({ candidacyId, totals }) => ({ candidacyId, totals })));
  const top = ranked[0]!;
  const runnerUp = ranked[1];

  if (runnerUp && runnerUp.trimmedMean === top.trimmedMean) {
    warnings.push('The leading two finalists are tied. Chair adjudication required.');
  }
  if (top.judgeCount < MIN_JUDGES_PER_CANDIDACY) {
    warnings.push(`The leading finalist has only ${top.judgeCount} completed score(s).`);
  }
  if (top.spread >= SHARP_DISAGREEMENT) {
    warnings.push('Judges disagree sharply on the leading finalist. Review before confirming.');
  }

  const byId = new Map(eligible.map((candidate) => [candidate.candidacyId, candidate]));

  return {
    selected: [
      {
        candidacyId: top.candidacyId,
        creatorId: byId.get(top.candidacyId)?.creatorId ?? '',
      },
    ],
    warnings,
  };
}
