/**
 * Manual age assurance.
 *
 * PALMA delegates age and identity assurance to a specialist provider and
 * stores none of what the provider sees. A small number of cases cannot be
 * settled that way — the provider is down, throws an exception, or returns a
 * result that needs a person. Those become cases.
 *
 * The rule that shapes this module: **what PALMA keeps is an outcome, not a
 * document.** Where media is received for a manual check it lives in a
 * restricted workspace outside the database, and it is deleted when the case
 * is decided. A case cannot be closed while media is still held.
 */

export const VERIFICATION_CASE_REASONS = [
  'provider_unavailable',
  'provider_exception',
  'result_requires_review',
  'reverification_due',
] as const;

export type VerificationCaseReason = (typeof VERIFICATION_CASE_REASONS)[number];

export const REASON_LABEL: Record<VerificationCaseReason, string> = {
  provider_unavailable: 'Third-party verification unavailable',
  provider_exception: 'Third-party verification exception',
  result_requires_review: 'Third-party result requires manual review',
  reverification_due: 'Reverification due',
};

export const VERIFICATION_CASE_STATUSES = [
  'open',
  'awaiting_information',
  'verified',
  'refused',
  'abandoned',
] as const;

export type VerificationCaseStatus = (typeof VERIFICATION_CASE_STATUSES)[number];

export const OPEN_CASE_STATUSES: readonly VerificationCaseStatus[] = [
  'open',
  'awaiting_information',
];

export function isOpenCase(status: VerificationCaseStatus): boolean {
  return OPEN_CASE_STATUSES.includes(status);
}

/** AV-2027-00421 — quotable in an email without quoting anything private. */
export function caseReference(year: number, sequence: number): string {
  return `AV-${year}-${String(sequence).padStart(5, '0')}`;
}

export type MediaState = {
  receivedAt: string | null;
  deletedAt: string | null;
};

export type MediaStage = 'none_received' | 'held' | 'deleted';

export function mediaStage(media: MediaState): MediaStage {
  if (!media.receivedAt) return 'none_received';
  return media.deletedAt ? 'deleted' : 'held';
}

export const MEDIA_STAGE_LABEL: Record<MediaStage, string> = {
  none_received: 'No media received. Decided on the provider’s result alone',
  held: 'Media held in the restricted workspace, pending deletion',
  deleted: 'Submitted media deleted',
};

/**
 * A case may not be closed while media is still held. Closing is what triggers
 * deletion, so a closed case with media outstanding would mean documents left
 * sitting in a workspace with nothing left to prompt anyone to remove them.
 */
export function closureIsBlocked(media: MediaState): string | null {
  return mediaStage(media) === 'held'
    ? 'Submitted media is still held. Delete it as part of closing this case.'
    : null;
}

/** What PALMA keeps once a case is decided. Deliberately four small things. */
export type VerificationOutcome = {
  status: Extract<VerificationCaseStatus, 'verified' | 'refused' | 'abandoned'>;
  resultHash: string | null;
  providerReference: string | null;
  decidedAt: string;
};

/**
 * The fields a verification record must never carry. Asserted in tests rather
 * than merely written down in a policy nobody reads.
 */
export const FORBIDDEN_VERIFICATION_FIELDS = [
  'documentImage',
  'passportNumber',
  'idNumber',
  'selfie',
  'dateOfBirth',
  'address',
  'nationalInsuranceNumber',
] as const;

export function outcomeIsMinimal(outcome: Record<string, unknown>): boolean {
  return FORBIDDEN_VERIFICATION_FIELDS.every((field) => !(field in outcome));
}
