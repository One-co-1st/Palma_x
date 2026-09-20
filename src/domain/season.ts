export const SEASON_STAGES = [
  'announced',
  'nominations_open',
  'nominations_closed',
  'shortlisting',
  'shortlist_announced',
  'judging',
  'finalists_announced',
  'winners_announced',
  'archived',
] as const;

export type SeasonStage = (typeof SEASON_STAGES)[number];

export const STAGE_LABEL: Record<SeasonStage, string> = {
  announced: 'Announced',
  nominations_open: 'Nominations open',
  nominations_closed: 'Nominations closed',
  shortlisting: 'Shortlisting',
  shortlist_announced: 'Shortlist announced',
  judging: 'Judging',
  finalists_announced: 'Finalists announced',
  winners_announced: 'Winners announced',
  archived: 'Archived',
};

/** The four public beats of a PALMA season, as shown on the season progress rail. */
export const PUBLIC_PHASES = [
  { key: 'nominate', label: 'Nominate' },
  { key: 'shortlist', label: 'Shortlist' },
  { key: 'finalists', label: 'Finalists' },
  { key: 'winners', label: 'Winners' },
] as const;

export type PublicPhase = (typeof PUBLIC_PHASES)[number]['key'];

const STAGE_TO_PHASE_INDEX: Record<SeasonStage, number> = {
  announced: 0,
  nominations_open: 0,
  nominations_closed: 1,
  shortlisting: 1,
  shortlist_announced: 1,
  judging: 2,
  finalists_announced: 2,
  winners_announced: 3,
  archived: 3,
};

export function phaseIndex(stage: SeasonStage): number {
  return STAGE_TO_PHASE_INDEX[stage];
}

export function phaseState(stage: SeasonStage, index: number): 'complete' | 'current' | 'upcoming' {
  const active = phaseIndex(stage);
  if (stage === 'archived' || stage === 'winners_announced') {
    return index <= active ? 'complete' : 'upcoming';
  }
  if (index < active) return 'complete';
  if (index === active) return 'current';
  return 'upcoming';
}

const ORDER = new Map(SEASON_STAGES.map((stage, index) => [stage, index] as const));

/** Seasons move forward. Going backwards is a controlled administrative act. */
export function canAdvance(from: SeasonStage, to: SeasonStage): boolean {
  const a = ORDER.get(from);
  const b = ORDER.get(to);
  if (a === undefined || b === undefined) return false;
  return b === a + 1;
}

export function acceptsNominations(stage: SeasonStage): boolean {
  return stage === 'nominations_open';
}

export function shortlistIsPublic(stage: SeasonStage): boolean {
  return phaseIndex(stage) >= 1 && stage !== 'nominations_closed' && stage !== 'shortlisting';
}

export function finalistsArePublic(stage: SeasonStage): boolean {
  return stage === 'finalists_announced' || stage === 'winners_announced' || stage === 'archived';
}

export function winnersArePublic(stage: SeasonStage): boolean {
  return stage === 'winners_announced' || stage === 'archived';
}
