import { describe, expect, it } from 'vitest';
import {
  acceptsNominations,
  canAdvance,
  finalistsArePublic,
  phaseIndex,
  phaseState,
  SEASON_STAGES,
  winnersArePublic,
} from '@/domain/season';

describe('season stages', () => {
  it('accepts nominations in exactly one stage', () => {
    expect(SEASON_STAGES.filter(acceptsNominations)).toEqual(['nominations_open']);
  });

  it('advances one stage at a time, forwards only', () => {
    expect(canAdvance('nominations_open', 'nominations_closed')).toBe(true);
    expect(canAdvance('nominations_open', 'judging')).toBe(false);
    expect(canAdvance('judging', 'nominations_open')).toBe(false);
    expect(canAdvance('archived', 'announced')).toBe(false);
  });

  it('keeps finalists private until they are announced', () => {
    expect(finalistsArePublic('judging')).toBe(false);
    expect(finalistsArePublic('finalists_announced')).toBe(true);
    expect(finalistsArePublic('winners_announced')).toBe(true);
    expect(finalistsArePublic('archived')).toBe(true);
  });

  it('keeps winners private until the ceremony', () => {
    expect(winnersArePublic('finalists_announced')).toBe(false);
    expect(winnersArePublic('winners_announced')).toBe(true);
    expect(winnersArePublic('archived')).toBe(true);
  });

  it('marks the public phase rail correctly', () => {
    expect(phaseIndex('nominations_open')).toBe(0);
    expect(phaseState('nominations_open', 0)).toBe('current');
    expect(phaseState('nominations_open', 1)).toBe('upcoming');
    expect(phaseState('judging', 0)).toBe('complete');
    // An archived season has no current step — everything is done.
    expect(phaseState('archived', 3)).toBe('complete');
  });
});
