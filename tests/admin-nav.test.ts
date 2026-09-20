import { describe, expect, it } from 'vitest';
import { ADMIN_NAV, MODERATION_NAV, navFor } from '@/lib/admin-nav';
import { OUTCOME_PERMISSIONS, ROLES, can, isStaff, type Role } from '@/lib/auth/rbac';
import { PERIODS, isPeriod } from '@/server/data/command-centre';

describe('the administration sidebar', () => {
  it('never shows a role a destination it cannot open', () => {
    for (const role of ROLES) {
      for (const group of navFor(role)) {
        for (const item of group.items) {
          expect(can(role, item.permission), `${role} shown ${item.href}`).toBe(true);
        }
      }
    }
  });

  it('drops groups that empty out rather than showing a dead heading', () => {
    for (const role of ROLES) {
      for (const group of navFor(role)) {
        expect(group.items.length, `${group.title} empty for ${role}`).toBeGreaterThan(0);
      }
    }
  });

  it('gives a super administrator the whole institution', () => {
    const groups = navFor('super_admin');
    expect(groups).toHaveLength(ADMIN_NAV.length);
    const items = groups.flatMap((group) => group.items);
    expect(items).toHaveLength(ADMIN_NAV.flatMap((group) => group.items).length);
  });

  it('shows a moderator nothing of the administration surface', () => {
    const hrefs = navFor('moderator').flatMap((group) => group.items.map((item) => item.href));
    expect(hrefs).not.toContain('/admin');
    expect(hrefs).not.toContain('/admin/selection');
    expect(hrefs).not.toContain('/admin/users');
    expect(hrefs).not.toContain('/admin/settings');
    expect(hrefs).not.toContain('/admin/enforcement');
  });

  it('gives the moderator their own dashboard, with the queues on it', () => {
    const hrefs = navFor('moderator', MODERATION_NAV).flatMap((group) =>
      group.items.map((item) => item.href),
    );
    expect(hrefs).toContain('/portal');
    expect(hrefs).toContain('/portal/claims');
    expect(hrefs).toContain('/portal/verification');
    expect(hrefs).toContain('/portal/reports');
    expect(hrefs).toContain('/portal/creators');
  });

  it('lets an administrator reach the same queues, not a second copy of them', () => {
    const hrefs = navFor('admin').flatMap((group) => group.items.map((item) => item.href));
    expect(hrefs).toContain('/portal/claims');
    expect(hrefs).toContain('/portal/creators');
  });

  it('shows nothing at all to a creator, a judge or a visitor', () => {
    for (const role of ['creator', 'judge', 'visitor'] as Role[]) {
      expect(navFor(role), role).toHaveLength(0);
      expect(isStaff(role)).toBe(false);
    }
  });

  it('keeps the outcome permissions off every non-admin staff role', () => {
    for (const role of ['moderator'] as Role[]) {
      for (const permission of OUTCOME_PERMISSIONS) {
        expect(can(role, permission), `${role} holds ${permission}`).toBe(false);
      }
    }
  });

  it('reserves enforcement and analytics for administrators', () => {
    expect(can('admin', 'admin:enforce')).toBe(true);
    expect(can('super_admin', 'admin:enforce')).toBe(true);
    expect(can('moderator', 'admin:enforce')).toBe(false);
    expect(can('moderator', 'admin:view_analytics')).toBe(false);
  });
});

describe('period filtering', () => {
  it('accepts only the periods it offers', () => {
    for (const period of PERIODS) expect(isPeriod(period)).toBe(true);
    expect(isPeriod('yesterday')).toBe(false);
    expect(isPeriod(undefined)).toBe(false);
    expect(isPeriod('')).toBe(false);
  });
});
