/**
 * Case preparation.
 *
 * A judge should never have to ask "can this person actually be considered?".
 * PALMA answers that before the case reaches them: eligibility is screened by
 * a person, and the result is presented to the judge as a settled checklist
 * rather than a pile of raw fields to interpret.
 *
 * This module is the pure part of that — it turns the facts of a candidacy
 * into the six checks a judge sees, and says whether the case is clear. It
 * performs no I/O and knows nothing about Prisma.
 */

export const ELIGIBILITY_CHECKS = [
  'creator_verification',
  'age_requirement',
  'category_eligibility',
  'submission_period',
  'required_information',
  'open_issue',
] as const;

export type EligibilityCheckKey = (typeof ELIGIBILITY_CHECKS)[number];

export type CheckState = 'passed' | 'attention';

export type EligibilityCheck = {
  key: EligibilityCheckKey;
  label: string;
  /** One line telling the judge what was actually established. */
  detail: string;
  state: CheckState;
};

export type CaseFacts = {
  /** Identity assurance status recorded against the creator. */
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'failed' | 'expired' | 'revoked';
  verifiedAt: string | null;
  /** Candidacy status as set by the screening team. */
  candidacyStatus:
    | 'under_review'
    | 'eligible'
    | 'ineligible'
    | 'shortlisted'
    | 'finalist'
    | 'winner'
    | 'withdrawn';
  /** Whether the nomination window had opened when the candidacy was created. */
  withinSubmissionWindow: boolean;
  evidenceCount: number;
  hasNominationReason: boolean;
  integrityFlag: boolean;
  /** Set when a screener has signed the candidacy off. */
  reviewedAt: string | null;
};

export function prepareEligibility(facts: CaseFacts): EligibilityCheck[] {
  const verified = facts.verificationStatus === 'verified';
  // A candidacy that has advanced — shortlisted, finalist, winner — passed
  // eligibility to get there. Only the explicit failure states fail this check.
  const screened =
    facts.candidacyStatus === 'eligible' ||
    facts.candidacyStatus === 'shortlisted' ||
    facts.candidacyStatus === 'finalist' ||
    facts.candidacyStatus === 'winner';

  return [
    {
      key: 'creator_verification',
      label: 'Creator verification',
      detail: verified
        ? 'Identity assurance completed with PALMA’s provider.'
        : `Verification is ${facts.verificationStatus}. Raise with the chair before scoring.`,
      state: verified ? 'passed' : 'attention',
    },
    {
      key: 'age_requirement',
      label: 'Age requirement',
      detail: verified
        ? 'Confirmed 18 or over by the assurance provider. PALMA holds no documents.'
        : 'Not yet confirmed, because verification is incomplete.',
      state: verified ? 'passed' : 'attention',
    },
    {
      key: 'category_eligibility',
      label: 'Category eligibility',
      detail: screened
        ? 'Screened against the published category eligibility and accepted.'
        : `Candidacy is ${facts.candidacyStatus.replace('_', ' ')}.`,
      state: screened ? 'passed' : 'attention',
    },
    {
      key: 'submission_period',
      label: 'Submission period',
      detail: facts.withinSubmissionWindow
        ? 'Nominated inside this season’s open window.'
        : 'Recorded outside the published nomination window.',
      state: facts.withinSubmissionWindow ? 'passed' : 'attention',
    },
    {
      key: 'required_information',
      label: 'Required information',
      detail:
        facts.evidenceCount > 0 && facts.hasNominationReason
          ? `${facts.evidenceCount} item${facts.evidenceCount === 1 ? '' : 's'} of evidence gathered by PALMA, with the audience’s reasoning.`
          : 'The case file is incomplete. PALMA is still gathering material.',
      state: facts.evidenceCount > 0 && facts.hasNominationReason ? 'passed' : 'attention',
    },
    {
      key: 'open_issue',
      label: 'No unresolved eligibility issue',
      detail: facts.integrityFlag
        ? 'An integrity flag is open on this candidacy. The chair has been notified.'
        : facts.reviewedAt
          ? 'Signed off by the eligibility team with nothing outstanding.'
          : 'Nothing outstanding recorded, though screening sign-off is not yet logged.',
      state: facts.integrityFlag ? 'attention' : 'passed',
    },
  ];
}

/** A case is clear when every check passed. Anything else goes to the chair. */
export function caseIsClear(checks: EligibilityCheck[]): boolean {
  return checks.every((check) => check.state === 'passed');
}
