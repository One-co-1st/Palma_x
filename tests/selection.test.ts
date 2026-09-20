import { describe, expect, it } from 'vitest';
import { proposeFinalists, proposeWinner, type SelectionCandidate } from '@/domain/selection';
import { SHARP_DISAGREEMENT } from '@/domain/judging';

/**
 * Totals are weighted marks in tenths of a point out of 100, so 820 is 82.0.
 * They were written on the old unweighted 0–50 scale, and a 40-point spread
 * that used to mean a divided panel now means three judges agreeing closely —
 * which is exactly what the disagreement test caught when the scale changed.
 */
const candidate = (id: string, totals: number[], eligible = true): SelectionCandidate => ({
  candidacyId: id,
  creatorId: `creator-${id}`,
  totals,
  eligible,
});

describe('finalist selection', () => {
  it('proposes the top four eligible candidacies, in order', () => {
    const result = proposeFinalists([
      candidate('a', [800, 820, 840]),
      candidate('b', [600, 620, 640]),
      candidate('c', [900, 920, 940]),
      candidate('d', [400, 420, 440]),
      candidate('e', [200, 220, 240]),
    ]);

    expect(result.selected.map((entry) => entry.candidacyId)).toEqual(['c', 'a', 'b', 'd']);
    expect(result.selected[0]?.position).toBe(1);
  });

  it('excludes ineligible candidacies and says so', () => {
    const result = proposeFinalists([
      candidate('a', [960, 960, 960], false),
      candidate('b', [600, 620, 640]),
    ]);

    expect(result.selected.map((entry) => entry.candidacyId)).toEqual(['b']);
    expect(result.warnings.join(' ')).toContain('excluded as ineligible');
  });

  it('warns when candidacies are under-judged', () => {
    const result = proposeFinalists([candidate('a', [800]), candidate('b', [600, 620, 640])]);
    expect(result.warnings.join(' ')).toContain('fewer than 3 completed scores');
  });

  it('warns on a tie at the cut line', () => {
    const result = proposeFinalists(
      [
        candidate('a', [1000, 1000, 1000]),
        candidate('b', [900, 900, 900]),
        candidate('c', [800, 800, 800]),
        candidate('d', [600, 600, 600]),
        candidate('e', [600, 600, 600]),
      ],
      4,
    );
    expect(result.warnings.join(' ')).toContain('tie exists at the finalist cut line');
  });
});

describe('winner selection', () => {
  it('proposes the highest-ranked eligible finalist', () => {
    const result = proposeWinner([
      candidate('a', [800, 820, 840]),
      candidate('b', [960, 940, 980]),
    ]);
    expect(result.selected[0]?.candidacyId).toBe('b');
    expect(result.warnings).toHaveLength(0);
  });

  it('refuses when no finalist is eligible', () => {
    const result = proposeWinner([candidate('a', [800, 820, 840], false)]);
    expect(result.selected).toHaveLength(0);
    expect(result.warnings.join(' ')).toContain('No eligible finalists');
  });

  it('flags a tie at the top for chair adjudication', () => {
    const result = proposeWinner([
      candidate('a', [800, 800, 800]),
      candidate('b', [800, 800, 800]),
    ]);
    expect(result.warnings.join(' ')).toContain('tied');
  });

  it('flags sharply divided panels', () => {
    // A spread at the threshold, expressed against the constant rather than as
    // a number that quietly stops meaning anything if the scale moves again.
    const result = proposeWinner([candidate('a', [200, 500, 200 + SHARP_DISAGREEMENT])]);
    expect(result.warnings.join(' ')).toContain('disagree sharply');
  });

  it('does not cry disagreement over a close panel', () => {
    const result = proposeWinner([candidate('a', [820, 840, 860])]);
    expect(result.warnings.join(' ')).not.toContain('disagree sharply');
  });
});
