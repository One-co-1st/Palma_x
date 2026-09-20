import { describe, expect, it } from 'vitest';
import {
  assessCandidacyPattern,
  assessIntegrity,
  isDisposableEmail,
  looksLikeDuplicate,
} from '@/domain/integrity';

const clean = {
  honeypot: '',
  elapsedMs: 40_000,
  reason:
    'Maya has published a researched essay every month for six years without an agency behind her, and her work changed how other creators publish their numbers.',
  email: 'someone@example.com',
  recentByNominator: 0,
  recentForCandidacy: 3,
};

describe('nomination integrity', () => {
  it('passes an ordinary human nomination', () => {
    const result = assessIntegrity(clean);
    expect(result.score).toBe(0);
    expect(result.reject).toBe(false);
    expect(result.flagForReview).toBe(false);
  });

  it('rejects only a filled honeypot', () => {
    const result = assessIntegrity({ ...clean, honeypot: 'http://spam' });
    expect(result.reject).toBe(true);
    expect(result.signals).toContain('honeypot_filled');
  });

  it('flags a form completed faster than a person could read it', () => {
    const result = assessIntegrity({ ...clean, elapsedMs: 400 });
    expect(result.signals).toContain('submitted_too_quickly');
    expect(result.flagForReview).toBe(true);
    expect(result.reject).toBe(false);
  });

  it('flags repetitive and link-stuffed reasons', () => {
    expect(
      assessIntegrity({
        ...clean,
        reason: Array.from({ length: 30 }, () => 'best creator').join(' '),
      }).signals,
    ).toContain('repetitive_reason');

    expect(
      assessIntegrity({ ...clean, reason: 'see https://a.example https://b.example now' }).signals,
    ).toContain('link_stuffed_reason');
  });

  it('flags disposable addresses without refusing them', () => {
    const result = assessIntegrity({ ...clean, email: 'burner@mailinator.com' });
    expect(result.signals).toContain('disposable_email');
    expect(result.flagForReview).toBe(true);
    expect(result.reject).toBe(false);
    expect(isDisposableEmail('burner@mailinator.com')).toBe(true);
    expect(isDisposableEmail('someone@example.com')).toBe(false);
  });

  /**
   * The central calibration: a creator sharing their link produces exactly this
   * shape, and it must not be treated as fraud.
   */
  it('does not punish a legitimate burst of audience nominations', () => {
    const result = assessIntegrity({ ...clean, recentForCandidacy: 35 });
    expect(result.reject).toBe(false);
    expect(result.flagForReview).toBe(false);
    expect(result.score).toBe(0);
  });

  it('flags — never rejects — an implausible burst against one candidacy', () => {
    const result = assessIntegrity({ ...clean, recentForCandidacy: 200 });
    expect(result.signals).toContain('candidacy_burst');
    expect(result.reject).toBe(false);
  });

  it('escalates for one address nominating many times in an hour', () => {
    expect(assessIntegrity({ ...clean, recentByNominator: 3 }).score).toBe(0);
    const heavy = assessIntegrity({ ...clean, recentByNominator: 9 });
    expect(heavy.signals).toContain('high_nominator_rate');
    expect(heavy.flagForReview).toBe(true);
  });

  it('caps the score at 100', () => {
    const result = assessIntegrity({
      ...clean,
      honeypot: 'x',
      elapsedMs: 10,
      recentByNominator: 40,
    });
    expect(result.score).toBe(100);
  });
});

describe('duplicate detection', () => {
  it('catches identical wording regardless of punctuation and case', () => {
    expect(looksLikeDuplicate('Great work, all year!', 'great work all year')).toBe(true);
  });

  it('catches near-identical resubmissions', () => {
    const a = 'She published every single month this year without an agency behind her at all';
    const b = 'She published every single month this year without an agency behind her';
    expect(looksLikeDuplicate(a, b)).toBe(true);
  });

  it('does not flag genuinely different reasons', () => {
    expect(
      looksLikeDuplicate(
        'His preservation work has been cited by two national archives.',
        'She records the recipes of Birmingham kitchens before they are lost.',
      ),
    ).toBe(false);
  });
});

describe('coordinated activity', () => {
  it('says nothing about a small candidacy', () => {
    expect(
      assessCandidacyPattern({
        nominationCount: 6,
        distinctReasons: 2,
        windowMinutes: 5,
        disposableEmailCount: 3,
      }),
    ).toBeNull();
  });

  it('leaves a healthy audience alone', () => {
    expect(
      assessCandidacyPattern({
        nominationCount: 120,
        distinctReasons: 112,
        windowMinutes: 2880,
        disposableEmailCount: 2,
      }),
    ).toBeNull();
  });

  it('describes what it saw, for a human to judge', () => {
    const note = assessCandidacyPattern({
      nominationCount: 200,
      distinctReasons: 12,
      windowMinutes: 4,
      disposableEmailCount: 120,
    });
    expect(note).toContain('near-identical wording');
    expect(note).toContain('faster than an audience plausibly acts');
    expect(note).toContain('disposable addresses');
  });
});
