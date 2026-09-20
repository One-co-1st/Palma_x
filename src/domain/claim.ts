/**
 * Claims.
 *
 * A PALMA creator record exists before anyone claims it — PALMA makes one the
 * first time a creator is nominated. A claim links a User to that record. It
 * never creates a second one, and it never transfers control of the record's
 * history.
 *
 *     unclaimed record → claim request → review → approval → User ↔ Creator
 *
 * The module is pure: it decides what a claim *means*, not how it is stored.
 */

export const CLAIM_STATUSES = [
  'submitted',
  'awaiting_information',
  'escalated',
  'approved',
  'rejected',
  'withdrawn',
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

/** Statuses that still need a person. Everything else is settled. */
export const OPEN_CLAIM_STATUSES: readonly ClaimStatus[] = [
  'submitted',
  'awaiting_information',
  'escalated',
];

export function isOpenClaim(status: ClaimStatus): boolean {
  return OPEN_CLAIM_STATUSES.includes(status);
}

/**
 * What a creator may change about their own record once they hold it.
 *
 * This is the presentation of the creator: how they wish to be described. It
 * is deliberately a short list, and it is the *only* list — anything absent
 * from it belongs to PALMA.
 */
export const CREATOR_EDITABLE_FIELDS = [
  'displayName',
  'pronouns',
  'countryCode',
  'city',
  'headline',
  'biography',
  'portraitUrl',
  'portraitAlt',
  'websiteUrl',
  'links',
] as const;

export type CreatorEditableField = (typeof CREATOR_EDITABLE_FIELDS)[number];

/**
 * What belongs to PALMA's institutional record, permanently.
 *
 * A verified creator holding their own profile still cannot touch any of it.
 * "Delete my 2027 finalist record" is not a setting; it is a request, handled
 * under the complaints procedure, and usually refused.
 */
export const INSTITUTIONAL_FIELDS = [
  'nominations',
  'candidacies',
  'shortlist',
  'finalist',
  'winner',
  'honours',
  'judgingScores',
  'judgingAssignments',
  'verificationHistory',
  'achievements',
  'parohEntries',
  'awardDates',
  'auditLog',
] as const;

export type InstitutionalField = (typeof INSTITUTIONAL_FIELDS)[number];

export function creatorMayEdit(field: string): boolean {
  return (CREATOR_EDITABLE_FIELDS as readonly string[]).includes(field);
}

export function belongsToInstitution(field: string): boolean {
  return (INSTITUTIONAL_FIELDS as readonly string[]).includes(field);
}

/**
 * The one invariant worth asserting in code: nothing is editable by a creator
 * and institutional at the same time. A field that drifted into both lists
 * would quietly hand PALMA's history to the person it is about.
 */
export function fieldsAreDisjoint(): boolean {
  return CREATOR_EDITABLE_FIELDS.every((field) => !belongsToInstitution(field));
}

/** The signals a reviewer is shown, so the decision is not a vibe. */
export type ClaimSignals = {
  /** The record is not already held by somebody else. */
  recordUnclaimed: boolean;
  /** Age and identity assurance has been completed for this creator. */
  verificationComplete: boolean;
  /** The claimant supplied the identity statement PALMA asks for. */
  identityStatementSupplied: boolean;
  /** At least one link offered as evidence of control. */
  evidenceLinkCount: number;
  /** The claimant arrived through an invitation PALMA itself issued. */
  invited: boolean;
  /** An open report naming this creator. */
  openReports: number;
};

export type ClaimCheck = {
  key: string;
  label: string;
  detail: string;
  state: 'passed' | 'attention';
};

export function assessClaim(signals: ClaimSignals): ClaimCheck[] {
  return [
    {
      key: 'record_unclaimed',
      label: 'Record is unclaimed',
      detail: signals.recordUnclaimed
        ? 'No account currently holds this PALMA record.'
        : 'This record is already held. Approving would move it. Escalate first.',
      state: signals.recordUnclaimed ? 'passed' : 'attention',
    },
    {
      key: 'verification',
      label: 'Age and identity assurance',
      detail: signals.verificationComplete
        ? 'Completed with PALMA’s provider. No documents are held.'
        : 'Not complete. Open a verification case before approving.',
      state: signals.verificationComplete ? 'passed' : 'attention',
    },
    {
      key: 'identity_statement',
      label: 'Identity statement supplied',
      detail: signals.identityStatementSupplied
        ? 'The claimant has stated who they are and why this record is theirs.'
        : 'Nothing supplied. Request more information.',
      state: signals.identityStatementSupplied ? 'passed' : 'attention',
    },
    {
      key: 'evidence',
      label: 'Evidence of control',
      detail:
        signals.evidenceLinkCount > 0
          ? `${signals.evidenceLinkCount} link${signals.evidenceLinkCount === 1 ? '' : 's'} offered as evidence of control of the public identity.`
          : signals.invited
            ? 'None offered, though PALMA invited this claim directly.'
            : 'No evidence of control offered.',
      state: signals.evidenceLinkCount > 0 || signals.invited ? 'passed' : 'attention',
    },
    {
      key: 'invitation',
      label: 'Invited by PALMA',
      detail: signals.invited
        ? 'Arrived through an invitation PALMA issued for this record.'
        : 'Claimed without an invitation. Ordinary, and not a concern by itself.',
      state: 'passed',
    },
    {
      key: 'reports',
      label: 'No open report',
      detail:
        signals.openReports === 0
          ? 'Nothing outstanding against this creator.'
          : `${signals.openReports} open report${signals.openReports === 1 ? '' : 's'} name this creator. Resolve before approving.`,
      state: signals.openReports === 0 ? 'passed' : 'attention',
    },
  ];
}

/**
 * Approval is never automatic — a person decides — but PALMA refuses to let a
 * claim be approved over the two things that would make approval unsafe.
 */
export function approvalIsBlocked(signals: ClaimSignals): string | null {
  if (!signals.recordUnclaimed) {
    return 'This record is already held by another account. Escalate rather than approve.';
  }
  if (!signals.verificationComplete) {
    return 'Age and identity assurance is not complete for this creator.';
  }
  return null;
}
