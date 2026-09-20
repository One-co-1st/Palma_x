import { describe, expect, it } from 'vitest';
import {
  canIssueReferralLink,
  checkNomination,
  MAX_REASON_LENGTH,
  MIN_REASON_LENGTH,
  nominatorKey,
  referralPath,
  type NominationCheckInput,
} from '@/domain/nomination';

const base: NominationCheckInput = {
  nominatorEmail: 'someone@example.com',
  creatorAccountEmails: ['maya@example.com'],
  alreadyNominated: false,
  creatorIsSuspended: false,
  categoryIsOpen: true,
  seasonAcceptsNominations: true,
  nominatorIsBlocked: false,
  reasonLength: 120,
};

describe('nominator identity', () => {
  it('treats one inbox as one nominator', () => {
    expect(nominatorKey('Someone@Example.com')).toBe('someone@example.com');
    expect(nominatorKey('  someone@example.com  ')).toBe('someone@example.com');
  });

  it('folds sub-addressing for every provider', () => {
    expect(nominatorKey('someone+palma@example.com')).toBe('someone@example.com');
    expect(nominatorKey('someone+a+b@example.com')).toBe('someone@example.com');
  });

  it('folds dots only where the provider ignores them', () => {
    // Gmail ignores dots; most providers do not, and folding them elsewhere
    // would merge two genuinely different people.
    expect(nominatorKey('a.b.c@gmail.com')).toBe('abc@gmail.com');
    expect(nominatorKey('a.b.c@googlemail.com')).toBe('abc@gmail.com');
    expect(nominatorKey('a.b.c@example.com')).toBe('a.b.c@example.com');
  });

  it('does not fall over on malformed input', () => {
    expect(nominatorKey('not-an-email')).toBe('not-an-email');
    expect(nominatorKey('@example.com')).toBe('@example.com');
  });
});

describe('accepting a nomination', () => {
  it('accepts an ordinary one', () => {
    expect(checkNomination(base).ok).toBe(true);
  });

  it('refuses once the season or category has closed', () => {
    expect(checkNomination({ ...base, seasonAcceptsNominations: false })).toMatchObject({
      ok: false,
      code: 'season_closed',
    });
    expect(checkNomination({ ...base, categoryIsOpen: false })).toMatchObject({
      ok: false,
      code: 'category_closed',
    });
  });

  it('refuses self-nomination, whichever alias of their address they use', () => {
    expect(
      checkNomination({
        ...base,
        nominatorEmail: 'maya+palma@example.com',
        creatorAccountEmails: ['maya@example.com'],
      }),
    ).toMatchObject({ ok: false, code: 'self_nomination' });
  });

  it('counts one nomination per person, per creator, per category', () => {
    expect(checkNomination({ ...base, alreadyNominated: true })).toMatchObject({
      ok: false,
      code: 'already_nominated',
    });
  });

  it('lets the same person nominate other creators and other categories', () => {
    // `alreadyNominated` is scoped to one candidacy by the caller; a different
    // creator or category arrives here as a fresh check.
    expect(checkNomination({ ...base, alreadyNominated: false }).ok).toBe(true);
  });

  it('refuses a blocked address and a suspended creator', () => {
    expect(checkNomination({ ...base, nominatorIsBlocked: true }).ok).toBe(false);
    expect(checkNomination({ ...base, creatorIsSuspended: true })).toMatchObject({
      ok: false,
      code: 'creator_unavailable',
    });
  });

  it('asks for a reason, but not an essay', () => {
    expect(checkNomination({ ...base, reasonLength: MIN_REASON_LENGTH - 1 })).toMatchObject({
      ok: false,
      code: 'reason_too_short',
    });
    expect(checkNomination({ ...base, reasonLength: MAX_REASON_LENGTH + 1 })).toMatchObject({
      ok: false,
      code: 'reason_too_long',
    });
    expect(MAX_REASON_LENGTH).toBeLessThanOrEqual(500);
  });
});

describe('creator referral links', () => {
  it('is issued only for a claimed, verified, unsuspended profile', () => {
    expect(
      canIssueReferralLink({ isClaimed: true, isSuspended: false, verificationStatus: 'verified' }),
    ).toBe(true);
    expect(
      canIssueReferralLink({
        isClaimed: false,
        isSuspended: false,
        verificationStatus: 'verified',
      }),
    ).toBe(false);
    expect(
      canIssueReferralLink({ isClaimed: true, isSuspended: true, verificationStatus: 'verified' }),
    ).toBe(false);
    expect(
      canIssueReferralLink({ isClaimed: true, isSuspended: false, verificationStatus: 'pending' }),
    ).toBe(false);
  });

  it('points at the creator’s own nomination page', () => {
    expect(referralPath('maya-rivers')).toBe('/nominate/maya-rivers');
  });
});
