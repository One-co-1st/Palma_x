import { describe, expect, it } from 'vitest';
import {
  CREATOR_EDITABLE_FIELDS,
  INSTITUTIONAL_FIELDS,
  approvalIsBlocked,
  assessClaim,
  belongsToInstitution,
  creatorMayEdit,
  fieldsAreDisjoint,
  isOpenClaim,
  type ClaimSignals,
} from '@/domain/claim';
import {
  FORBIDDEN_VERIFICATION_FIELDS,
  caseReference,
  closureIsBlocked,
  isOpenCase,
  mediaStage,
  outcomeIsMinimal,
} from '@/domain/verification-case';
import { OUTCOME_PERMISSIONS, can, isStaff, type Role } from '@/lib/auth/rbac';

const clear: ClaimSignals = {
  recordUnclaimed: true,
  verificationComplete: true,
  identityStatementSupplied: true,
  evidenceLinkCount: 2,
  invited: false,
  openReports: 0,
};

describe('the claim boundary', () => {
  it('never lets a field be both creator-editable and institutional', () => {
    expect(fieldsAreDisjoint()).toBe(true);
  });

  it('lets a creator edit how they are presented', () => {
    for (const field of ['biography', 'headline', 'portraitUrl', 'links']) {
      expect(creatorMayEdit(field), field).toBe(true);
    }
  });

  it('never lets a creator edit PALMA’s record of what happened', () => {
    for (const field of INSTITUTIONAL_FIELDS) {
      expect(creatorMayEdit(field), field).toBe(false);
      expect(belongsToInstitution(field), field).toBe(true);
    }
  });

  it('refuses the specific thing a creator will ask for', () => {
    // "Actually, delete my 2027 finalist record."
    expect(creatorMayEdit('finalist')).toBe(false);
    expect(creatorMayEdit('honours')).toBe(false);
    expect(creatorMayEdit('parohEntries')).toBe(false);
    expect(creatorMayEdit('auditLog')).toBe(false);
  });

  it('does not treat an unknown field as editable', () => {
    expect(creatorMayEdit('isSuspended')).toBe(false);
    expect(creatorMayEdit('userId')).toBe(false);
    expect(CREATOR_EDITABLE_FIELDS).not.toContain('isClaimed');
  });
});

describe('claim review', () => {
  it('clears a well-evidenced claim', () => {
    expect(assessClaim(clear).every((check) => check.state === 'passed')).toBe(true);
    expect(approvalIsBlocked(clear)).toBeNull();
  });

  it('blocks approval when the record is already held', () => {
    expect(approvalIsBlocked({ ...clear, recordUnclaimed: false })).toMatch(/already held/);
  });

  it('blocks approval without age and identity assurance', () => {
    expect(approvalIsBlocked({ ...clear, verificationComplete: false })).toMatch(/assurance/);
  });

  it('accepts an invitation in place of self-supplied evidence', () => {
    const invited = assessClaim({ ...clear, evidenceLinkCount: 0, invited: true });
    expect(invited.find((check) => check.key === 'evidence')?.state).toBe('passed');
  });

  it('flags an open report without blocking outright', () => {
    const signals = { ...clear, openReports: 2 };
    expect(assessClaim(signals).find((c) => c.key === 'reports')?.state).toBe('attention');
    expect(approvalIsBlocked(signals)).toBeNull();
  });

  it('knows which claims still need a person', () => {
    expect(isOpenClaim('submitted')).toBe(true);
    expect(isOpenClaim('awaiting_information')).toBe(true);
    expect(isOpenClaim('escalated')).toBe(true);
    expect(isOpenClaim('approved')).toBe(false);
    expect(isOpenClaim('rejected')).toBe(false);
    expect(isOpenClaim('withdrawn')).toBe(false);
  });
});

describe('manual verification', () => {
  it('formats a quotable case reference', () => {
    expect(caseReference(2027, 421)).toBe('AV-2027-00421');
  });

  it('tracks the media lifecycle explicitly', () => {
    expect(mediaStage({ receivedAt: null, deletedAt: null })).toBe('none_received');
    expect(mediaStage({ receivedAt: '2027-09-14', deletedAt: null })).toBe('held');
    expect(mediaStage({ receivedAt: '2027-09-14', deletedAt: '2027-09-15' })).toBe('deleted');
  });

  it('refuses to close a case while media is still held', () => {
    expect(closureIsBlocked({ receivedAt: '2027-09-14', deletedAt: null })).toMatch(/still held/);
    expect(closureIsBlocked({ receivedAt: '2027-09-14', deletedAt: '2027-09-15' })).toBeNull();
    expect(closureIsBlocked({ receivedAt: null, deletedAt: null })).toBeNull();
  });

  it('keeps an outcome to a status, a reference and a hash', () => {
    expect(
      outcomeIsMinimal({
        status: 'verified',
        resultHash: 'a3f…',
        providerReference: 'ref_123',
        decidedAt: '2027-09-15',
      }),
    ).toBe(true);
  });

  it('rejects an outcome carrying anything PALMA refuses to hold', () => {
    for (const field of FORBIDDEN_VERIFICATION_FIELDS) {
      expect(outcomeIsMinimal({ status: 'verified', [field]: 'x' }), field).toBe(false);
    }
  });

  it('knows which cases are still open', () => {
    expect(isOpenCase('open')).toBe(true);
    expect(isOpenCase('awaiting_information')).toBe(true);
    expect(isOpenCase('verified')).toBe(false);
    expect(isOpenCase('refused')).toBe(false);
  });
});

describe('the editorial boundary', () => {
  it('lets editors and moderators into the back office', () => {
    for (const role of ['moderator', 'admin', 'super_admin'] as Role[]) {
      expect(can(role, 'operations:view_dashboard'), role).toBe(true);
      expect(isStaff(role), role).toBe(true);
    }
  });

  it('never lets an editor or moderator touch an award outcome', () => {
    for (const role of ['moderator'] as Role[]) {
      for (const permission of OUTCOME_PERMISSIONS) {
        expect(can(role, permission), `${role} must not hold ${permission}`).toBe(false);
      }
    }
  });

  it('never lets a creator or judge into the back office', () => {
    for (const role of ['creator', 'judge', 'visitor'] as Role[]) {
      expect(can(role, 'operations:view_dashboard'), role).toBe(false);
      expect(can(role, 'admin:view_dashboard'), role).toBe(false);
      expect(can(role, 'claims:review'), role).toBe(false);
      expect(can(role, 'verification:review_manual'), role).toBe(false);
    }
  });

  it('gives the moderator the whole of the editorial and moderation job', () => {
    for (const permission of [
      'editorial:edit_creator',
      'editorial:create_creator',
      'journal:publish',
      'claims:review',
      'claims:decide',
      'verification:review_manual',
      'moderation:act',
    ] as const) {
      expect(can('moderator', permission), permission).toBe(true);
    }
  });

  it('keeps the administrator out of nothing the moderator can do', () => {
    for (const permission of [
      'editorial:edit_creator',
      'claims:decide',
      'verification:review_manual',
      'moderation:act',
    ] as const) {
      expect(can('admin', permission), permission).toBe(true);
    }
  });
});
