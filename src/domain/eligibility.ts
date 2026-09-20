import type { SeasonStage } from './season';
import { acceptsNominations } from './season';

export type EligibilityInput = {
  stage: SeasonStage;
  categoryIsOpen: boolean;
  creatorIsSuspended: boolean;
  creatorVerificationStatus:
    'unverified' | 'pending' | 'verified' | 'failed' | 'expired' | 'revoked';
  ageConfirmed: boolean;
  eligibilityConfirmed: boolean;
  contentPolicyConfirmed: boolean;
  hasExistingNomination: boolean;
  evidenceCount: number;
  statementLength: number;
};

export type EligibilityFinding = {
  code: string;
  message: string;
  /** `blocking` prevents submission; `review` routes it to manual review. */
  severity: 'blocking' | 'review';
};

export type EligibilityResult = {
  eligible: boolean;
  requiresReview: boolean;
  findings: EligibilityFinding[];
};

export const MIN_STATEMENT_LENGTH = 120;
export const MAX_STATEMENT_LENGTH = 2000;

/**
 * The single source of truth for whether a nomination may be accepted.
 * Called by the nomination action before any write, and again by administrators
 * when a nomination is reviewed.
 */
export function assessEligibility(input: EligibilityInput): EligibilityResult {
  const findings: EligibilityFinding[] = [];

  if (!acceptsNominations(input.stage)) {
    findings.push({
      code: 'season_closed',
      message: 'Nominations are not open for this season.',
      severity: 'blocking',
    });
  }

  if (!input.categoryIsOpen) {
    findings.push({
      code: 'category_closed',
      message: 'This category is not currently accepting nominations.',
      severity: 'blocking',
    });
  }

  if (input.creatorIsSuspended) {
    findings.push({
      code: 'creator_suspended',
      message: 'This creator cannot be nominated at present.',
      severity: 'blocking',
    });
  }

  if (!input.ageConfirmed) {
    findings.push({
      code: 'age_not_confirmed',
      message: 'Every PALMA nominee must be confirmed as 18 or over.',
      severity: 'blocking',
    });
  }

  if (!input.eligibilityConfirmed) {
    findings.push({
      code: 'eligibility_not_confirmed',
      message: 'The eligibility declaration must be accepted.',
      severity: 'blocking',
    });
  }

  if (!input.contentPolicyConfirmed) {
    findings.push({
      code: 'content_policy_not_confirmed',
      message: 'The PALMA content policy must be accepted.',
      severity: 'blocking',
    });
  }

  if (input.hasExistingNomination) {
    findings.push({
      code: 'duplicate_nomination',
      message: 'This creator has already been nominated in this category.',
      severity: 'blocking',
    });
  }

  if (input.statementLength < MIN_STATEMENT_LENGTH) {
    findings.push({
      code: 'statement_too_short',
      message: `The supporting statement must be at least ${MIN_STATEMENT_LENGTH} characters.`,
      severity: 'blocking',
    });
  }

  if (input.statementLength > MAX_STATEMENT_LENGTH) {
    findings.push({
      code: 'statement_too_long',
      message: `The supporting statement must be ${MAX_STATEMENT_LENGTH} characters or fewer.`,
      severity: 'blocking',
    });
  }

  if (input.evidenceCount < 1) {
    findings.push({
      code: 'evidence_missing',
      message: 'At least one piece of supporting evidence is required.',
      severity: 'blocking',
    });
  }

  // Verification is required to *receive* an honour, not to be nominated —
  // but an unverified creator's nomination is always reviewed by a human.
  if (input.creatorVerificationStatus !== 'verified') {
    findings.push({
      code: 'verification_outstanding',
      message: 'Creator verification is outstanding; this nomination will be reviewed.',
      severity: 'review',
    });
  }

  const blocking = findings.filter((finding) => finding.severity === 'blocking');

  return {
    eligible: blocking.length === 0,
    requiresReview: blocking.length === 0 && findings.length > 0,
    findings,
  };
}

/** An honour may only be conferred on a verified creator in good standing. */
export function canReceiveHonour(input: {
  creatorIsSuspended: boolean;
  creatorVerificationStatus: EligibilityInput['creatorVerificationStatus'];
}): { ok: boolean; reason?: string } {
  if (input.creatorIsSuspended) {
    return { ok: false, reason: 'This creator’s profile is suspended.' };
  }
  if (input.creatorVerificationStatus !== 'verified') {
    return { ok: false, reason: 'This creator has not completed PALMA verification.' };
  }
  return { ok: true };
}
