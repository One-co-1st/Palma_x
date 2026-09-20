import { describe, expect, it } from 'vitest';
import {
  can,
  canAny,
  canSelfServiceReset,
  isInvitableRole,
  isStaff,
  INVITABLE_ROLES,
  permissionsFor,
  ROLES,
  SPONSOR_PERMISSIONS,
} from '@/lib/auth/rbac';

describe('role permissions', () => {
  it('gives a visitor nothing', () => {
    expect(permissionsFor('visitor')).toHaveLength(0);
    expect(can('visitor', 'nomination:submit')).toBe(false);
    expect(can(null, 'admin:view_dashboard')).toBe(false);
  });

  it('lets creators nominate but never judge or administer', () => {
    expect(can('creator', 'nomination:submit')).toBe(true);
    expect(can('creator', 'judging:submit_score')).toBe(false);
    expect(can('creator', 'admin:select_winners')).toBe(false);
  });

  it('lets judges score but never select finalists or winners', () => {
    expect(can('judge', 'judging:submit_score')).toBe(true);
    expect(can('judge', 'judging:declare_conflict')).toBe(true);
    expect(can('judge', 'admin:select_finalists')).toBe(false);
    expect(can('judge', 'admin:select_winners')).toBe(false);
    expect(can('judge', 'admin:correct_score')).toBe(false);
  });

  it('keeps moderators out of judging and selection', () => {
    expect(can('moderator', 'judging:submit_score')).toBe(false);
    expect(can('moderator', 'admin:select_winners')).toBe(false);
    expect(can('moderator', 'admin:revoke_honour')).toBe(false);
  });

  it('gives the moderator the editorial job as well, since they are one role', () => {
    expect(can('moderator', 'journal:publish')).toBe(true);
    expect(can('moderator', 'editorial:edit_creator')).toBe(true);
    expect(can('moderator', 'moderation:act')).toBe(true);
  });

  it('lets administrators manage the roster, but reserves the whole system for super administrators', () => {
    expect(can('admin', 'admin:manage_users')).toBe(true);
    expect(can('admin', 'admin:manage_system')).toBe(false);
    expect(can('super_admin', 'admin:manage_users')).toBe(true);
    expect(can('super_admin', 'admin:manage_system')).toBe(true);
  });

  it('never lets any role score and select in a way sponsors could reach', () => {
    // Sponsors hold no role at all: the matrix has nothing to grant them.
    expect(SPONSOR_PERMISSIONS).toHaveLength(0);
  });

  it('identifies staff roles', () => {
    expect(ROLES.filter(isStaff)).toEqual(['moderator', 'admin', 'super_admin']);
  });

  it('canAny matches any of the listed permissions', () => {
    expect(canAny('judge', ['admin:select_winners', 'judging:submit_score'])).toBe(true);
    expect(canAny('creator', ['admin:select_winners', 'judging:submit_score'])).toBe(false);
  });

  it('makes every platform-operator role invite-only, and no others', () => {
    expect(INVITABLE_ROLES).toEqual(['judge', 'moderator', 'admin', 'super_admin']);
    expect(isInvitableRole('judge')).toBe(true);
    expect(isInvitableRole('moderator')).toBe(true);
    expect(isInvitableRole('admin')).toBe(true);
    expect(isInvitableRole('super_admin')).toBe(true);
    expect(isInvitableRole('creator')).toBe(false);
    expect(isInvitableRole('visitor')).toBe(false);
    expect(isInvitableRole('not-a-role')).toBe(false);
  });

  it('lets the desk read nominations, and keeps judges away from them', () => {
    // The count and the reasons are desk work: they decide who is worth
    // investigating and who enters contention.
    expect(can('moderator', 'admin:review_nominations')).toBe(true);
    expect(can('admin', 'admin:review_nominations')).toBe(true);

    // And a judge holds no route to either. This is what keeps the promise
    // published in the Rules, the Terms and the panel's own briefing email
    // true, so it must not be relaxed without rewriting all three.
    expect(can('judge', 'admin:review_nominations')).toBe(false);
    expect(can('creator', 'admin:review_nominations')).toBe(false);
    expect(can('visitor', 'admin:review_nominations')).toBe(false);
  });

  it('reserves the self-service password reset for creators alone', () => {
    expect(canSelfServiceReset('creator')).toBe(true);
    expect(canSelfServiceReset('judge')).toBe(false);
    expect(canSelfServiceReset('moderator')).toBe(false);
    expect(canSelfServiceReset('admin')).toBe(false);
    expect(canSelfServiceReset('super_admin')).toBe(false);
    expect(canSelfServiceReset('visitor')).toBe(false);
  });
});
