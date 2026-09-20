import { describe, expect, it } from 'vitest';
import {
  assessEligibility,
  canReceiveHonour,
  MIN_STATEMENT_LENGTH,
  type EligibilityInput,
} from '@/domain/eligibility';

const base: EligibilityInput = {
  stage: 'nominations_open',
  categoryIsOpen: true,
  creatorIsSuspended: false,
  creatorVerificationStatus: 'verified',
  ageConfirmed: true,
  eligibilityConfirmed: true,
  contentPolicyConfirmed: true,
  hasExistingNomination: false,
  evidenceCount: 2,
  statementLength: 400,
};

describe('nomination eligibility', () => {
  it('accepts a complete nomination in an open season', () => {
    const result = assessEligibility(base);
    expect(result.eligible).toBe(true);
    expect(result.requiresReview).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it('refuses nominations once the season has closed', () => {
    const result = assessEligibility({ ...base, stage: 'judging' });
    expect(result.eligible).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain('season_closed');
  });

  it('refuses without every declaration', () => {
    for (const key of ['ageConfirmed', 'eligibilityConfirmed', 'contentPolicyConfirmed'] as const) {
      const result = assessEligibility({ ...base, [key]: false });
      expect(result.eligible, key).toBe(false);
    }
  });

  it('refuses a second nomination of the same creator in the same category', () => {
    const result = assessEligibility({ ...base, hasExistingNomination: true });
    expect(result.eligible).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain('duplicate_nomination');
  });

  it('requires evidence and a substantive statement', () => {
    expect(assessEligibility({ ...base, evidenceCount: 0 }).eligible).toBe(false);
    expect(assessEligibility({ ...base, statementLength: MIN_STATEMENT_LENGTH - 1 }).eligible).toBe(
      false,
    );
    expect(assessEligibility({ ...base, statementLength: 9999 }).eligible).toBe(false);
  });

  it('accepts an unverified creator but routes the nomination to review', () => {
    const result = assessEligibility({ ...base, creatorVerificationStatus: 'unverified' });
    expect(result.eligible).toBe(true);
    expect(result.requiresReview).toBe(true);
    expect(result.findings.map((f) => f.code)).toContain('verification_outstanding');
  });

  it('refuses a nomination of a suspended creator', () => {
    expect(assessEligibility({ ...base, creatorIsSuspended: true }).eligible).toBe(false);
  });
});

describe('conferring an honour', () => {
  it('requires a verified creator in good standing', () => {
    expect(
      canReceiveHonour({ creatorIsSuspended: false, creatorVerificationStatus: 'verified' }).ok,
    ).toBe(true);
    expect(
      canReceiveHonour({ creatorIsSuspended: false, creatorVerificationStatus: 'pending' }).ok,
    ).toBe(false);
    expect(
      canReceiveHonour({ creatorIsSuspended: true, creatorVerificationStatus: 'verified' }).ok,
    ).toBe(false);
  });
});
