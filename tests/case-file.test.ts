import { describe, expect, it } from 'vitest';
import {
  caseIsClear,
  ELIGIBILITY_CHECKS,
  prepareEligibility,
  type CaseFacts,
} from '@/domain/case-file';

const clear: CaseFacts = {
  verificationStatus: 'verified',
  verifiedAt: '2027-09-14T00:00:00.000Z',
  candidacyStatus: 'eligible',
  withinSubmissionWindow: true,
  evidenceCount: 3,
  hasNominationReason: true,
  integrityFlag: false,
  reviewedAt: '2027-09-14T00:00:00.000Z',
};

function check(facts: Partial<CaseFacts>, key: (typeof ELIGIBILITY_CHECKS)[number]) {
  return prepareEligibility({ ...clear, ...facts }).find((entry) => entry.key === key)!;
}

describe('case preparation', () => {
  it('returns every check, in a stable order', () => {
    const checks = prepareEligibility(clear);
    expect(checks.map((entry) => entry.key)).toEqual([...ELIGIBILITY_CHECKS]);
  });

  it('clears a fully screened case', () => {
    expect(caseIsClear(prepareEligibility(clear))).toBe(true);
  });

  it('fails verification and age together, because age comes from verification', () => {
    expect(check({ verificationStatus: 'pending' }, 'creator_verification').state).toBe(
      'attention',
    );
    expect(check({ verificationStatus: 'pending' }, 'age_requirement').state).toBe('attention');
  });

  it('treats an advanced candidacy as having passed eligibility', () => {
    for (const status of ['eligible', 'shortlisted', 'finalist', 'winner'] as const) {
      expect(check({ candidacyStatus: status }, 'category_eligibility').state).toBe('passed');
    }
  });

  it('flags a candidacy that never cleared screening', () => {
    for (const status of ['under_review', 'ineligible', 'withdrawn'] as const) {
      expect(check({ candidacyStatus: status }, 'category_eligibility').state).toBe('attention');
    }
  });

  it('flags a nomination recorded outside the window', () => {
    expect(check({ withinSubmissionWindow: false }, 'submission_period').state).toBe('attention');
  });

  it('flags an incomplete case file', () => {
    expect(check({ evidenceCount: 0 }, 'required_information').state).toBe('attention');
    expect(check({ hasNominationReason: false }, 'required_information').state).toBe('attention');
  });

  it('flags an open integrity issue and nothing else', () => {
    const checks = prepareEligibility({ ...clear, integrityFlag: true });
    expect(caseIsClear(checks)).toBe(false);
    expect(checks.filter((entry) => entry.state === 'attention')).toHaveLength(1);
  });

  it('passes the open-issue check without a screening sign-off, but says so', () => {
    const entry = check({ reviewedAt: null }, 'open_issue');
    expect(entry.state).toBe('passed');
    expect(entry.detail).toContain('not yet logged');
  });

  it('gives every check a label and a detail a judge can read', () => {
    for (const entry of prepareEligibility(clear)) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.detail.length).toBeGreaterThan(0);
    }
  });
});
