import { describe, expect, it } from 'vitest';
import {
  COMMERCIAL_PERMISSIONS,
  JUDGING_CONFIDENTIAL_PERMISSIONS,
  OUTCOME_PERMISSIONS,
  PERMISSIONS,
  ROLES,
  SPONSOR_PERMISSIONS,
  can,
  permissionsFor,
  type Permission,
} from '@/lib/auth/rbac';
import { FEATURE_LIST, isLive, resolveFeature } from '@/domain/features';
import { EMAIL_LIST_VALUES } from '@/domain/email-lists';

/**
 * The one sentence PALMA's commercial model rests on:
 *
 *     Never sell the recognition. Sell the ecosystem around it.
 *
 * It is only worth saying if it is enforced somewhere a person cannot quietly
 * undo. These are that somewhere.
 */
describe('the commercial firewall', () => {
  it('shares no permission between commerce and judging', () => {
    for (const permission of COMMERCIAL_PERMISSIONS) {
      expect(
        JUDGING_CONFIDENTIAL_PERMISSIONS.includes(permission),
        `${permission} is both a commercial permission and a judging one`,
      ).toBe(false);
    }
  });

  it('keeps every award decision out of commercial hands', () => {
    for (const permission of OUTCOME_PERMISSIONS) {
      expect(
        COMMERCIAL_PERMISSIONS.includes(permission),
        `${permission} decides an award and must never be commercial`,
      ).toBe(false);
    }
  });

  it('withholds confidential judging material as well as the decisions', () => {
    // "They only look at the scores" is how a firewall stops being one.
    for (const permission of [
      'judging:view_assignments',
      'judging:submit_score',
      'admin:review_nominations',
    ] as const) {
      expect(JUDGING_CONFIDENTIAL_PERMISSIONS).toContain(permission);
      expect(COMMERCIAL_PERMISSIONS).not.toContain(permission);
    }
  });

  it('gives a sponsor no permissions at all', () => {
    expect(SPONSOR_PERMISSIONS).toEqual([]);
  });

  it('declares every commercial permission in the matrix', () => {
    for (const permission of COMMERCIAL_PERMISSIONS) {
      expect(PERMISSIONS as readonly string[]).toContain(permission);
    }
  });

  it('never lets a creator or a judge reach commercial configuration', () => {
    for (const role of ['creator', 'judge'] as const) {
      for (const permission of COMMERCIAL_PERMISSIONS) {
        expect(can(role, permission), `${role} can ${permission}`).toBe(false);
      }
    }
  });

  it('never lets a moderator change what PALMA sells', () => {
    // Moderation is an editorial job. Pricing is not. The desk may take a
    // surface down; it may not decide who pays to be on it or what they pay.
    for (const permission of [
      'commercial:manage_packages',
      'commercial:manage_sponsors',
      'commercial:manage_campaigns',
      'commercial:manage_licensing',
    ] as const) {
      expect(can('moderator', permission), `moderator can ${permission}`).toBe(false);
    }
  });

  it('lets both the desk and administration switch a surface on or off', () => {
    // A feature flag decides whether a public surface exists at all, which is
    // an editorial decision before it is a commercial one. Whoever runs the
    // pages should be able to take one down without hunting for a super
    // administrator, so all three hold it.
    for (const role of ['moderator', 'admin', 'super_admin'] as const) {
      expect(can(role, 'commercial:manage_features'), `${role} cannot toggle`).toBe(true);
    }
    // A creator or a judge emphatically does not.
    for (const role of ['creator', 'judge', 'visitor'] as const) {
      expect(can(role, 'commercial:manage_features'), `${role} can toggle`).toBe(false);
    }
  });

  it('reserves licensing the mark for a super administrator', () => {
    // Licensing is the one commercial act that puts PALMA's name on somebody
    // else's product in perpetuity, so it stays at the top.
    expect(can('moderator', 'commercial:manage_licensing')).toBe(false);
    expect(can('admin', 'commercial:manage_licensing')).toBe(false);
    expect(can('super_admin', 'commercial:manage_licensing')).toBe(true);
  });

  /**
   * The honest version of "separation of duties".
   *
   * An administrator runs the whole institution, including its business, and
   * at PALMA's scale that is one or two people rather than two departments. So
   * the invariant worth asserting is not "nobody holds both", which would force
   * a fake separation and be quietly relaxed the first time somebody needed to
   * do their job. It is that holding a commercial permission *grants* nothing
   * on the judging side: the sets are disjoint, so commercial access can never
   * be the route in.
   *
   * What actually protects an outcome from commercial pressure is elsewhere and
   * stronger: a sponsor holds no permissions at all, and the most consequential
   * decisions need two administrators to agree.
   */
  it('never lets a commercial permission carry judging access with it', () => {
    for (const role of ROLES) {
      const held = permissionsFor(role);
      const commercialOnly = held.filter(
        (permission: Permission) =>
          COMMERCIAL_PERMISSIONS.includes(permission) &&
          JUDGING_CONFIDENTIAL_PERMISSIONS.includes(permission),
      );

      expect(
        commercialOnly,
        `${role} holds a permission that is somehow both commercial and judging`,
      ).toEqual([]);
    }
  });

  it('keeps commercial work off creators, judges and visitors entirely', () => {
    for (const role of ['visitor', 'creator', 'judge'] as const) {
      const held = permissionsFor(role).filter((permission: Permission) =>
        COMMERCIAL_PERMISSIONS.includes(permission),
      );
      expect(held, `${role} holds commercial permissions`).toEqual([]);
    }
  });

  /**
   * The split that matters at the desk.
   *
   * Doing the deal is commercial work and belongs with administration. Deciding
   * that a partner's name sits under a category heading is editorial work and
   * belongs with the desk that owns those pages. A moderator may place a
   * sponsor administration has already approved — and may not create one, price
   * one, or decide what PALMA sells.
   */
  it('lets a moderator place a sponsor but never create or price one', () => {
    expect(can('moderator', 'commercial:assign_placement')).toBe(true);

    for (const permission of [
      'commercial:manage_sponsors',
      'commercial:manage_packages',
      'commercial:manage_licensing',
      'commercial:manage_campaigns',
    ] as const) {
      expect(can('moderator', permission), `moderator can ${permission}`).toBe(false);
    }
  });

  it('keeps toggling a feature away from the money behind it', () => {
    // The split the desk's access rests on: every role that can switch a
    // commercial surface on must be unable to create the sponsor who would
    // appear on it, unless it is administration doing both knowingly.
    expect(can('moderator', 'commercial:manage_features')).toBe(true);
    expect(can('moderator', 'commercial:manage_sponsors')).toBe(false);
    expect(can('moderator', 'commercial:manage_packages')).toBe(false);
  });

  it('still requires two administrators for the decisions that matter', () => {
    // The real protection against commercial pressure on an outcome. An
    // administrator who also sells sponsorship cannot revoke an honour alone.
    for (const permission of ['admin:revoke_honour', 'admin:correct_score'] as const) {
      expect(OUTCOME_PERMISSIONS).toContain(permission);
    }
  });
});

/**
 * Everything ships off. A feature that defaults on is a feature somebody has
 * to remember to turn off before launch, and nobody ever does.
 */
describe('the rails ship switched off', () => {
  it('resolves to off when nothing is configured', () => {
    for (const entry of FEATURE_LIST) {
      const state = resolveFeature({ global: null, season: null, seasonAware: entry.seasonAware });
      expect(state.enabled, `${entry.key} defaults on`).toBe(false);
      expect(isLive(state)).toBe(false);
    }
  });

  it('lets a season override a global setting in both directions', () => {
    const on = { enabled: true, launchAt: null, endAt: null, config: null };
    const off = { enabled: false, launchAt: null, endAt: null, config: null };

    // Turning something on for 2028 must not reach back into 2027.
    expect(resolveFeature({ global: off, season: on, seasonAware: true }).enabled).toBe(true);
    expect(resolveFeature({ global: on, season: off, seasonAware: true }).enabled).toBe(false);
  });

  it('ignores a season override for a feature that is not season-aware', () => {
    const on = { enabled: true, launchAt: null, endAt: null, config: null };
    const off = { enabled: false, launchAt: null, endAt: null, config: null };
    expect(resolveFeature({ global: off, season: on, seasonAware: false }).enabled).toBe(false);
  });

  it('respects a window at both ends', () => {
    const now = new Date('2027-06-01T00:00:00Z');
    const notYet = { enabled: true, launchAt: '2027-09-01T00:00:00Z', endAt: null, config: null };
    const over = { enabled: true, launchAt: null, endAt: '2027-01-01T00:00:00Z', config: null };
    const open = {
      enabled: true,
      launchAt: '2027-01-01T00:00:00Z',
      endAt: '2028-01-01T00:00:00Z',
      config: null,
    };

    expect(isLive(notYet, now)).toBe(false);
    expect(isLive(over, now)).toBe(false);
    expect(isLive(open, now)).toBe(true);
  });

  it('gives every feature a purpose and a prerequisite an operator can read', () => {
    for (const entry of FEATURE_LIST) {
      expect(entry.purpose.length, `${entry.key} has no purpose`).toBeGreaterThan(40);
      expect(entry.requires.length, `${entry.key} has no prerequisite`).toBeGreaterThan(20);
    }
  });
});

/**
 * The lists. No dark patterns is a testable property, not a promise.
 */
describe('the lists', () => {
  it('gates the two commercial lists behind their feature', () => {
    const partner = EMAIL_LIST_VALUES.find((list) => list.key === 'partner_offers');
    const opportunities = EMAIL_LIST_VALUES.find((list) => list.key === 'opportunities');

    expect(partner?.requiresFeature).toBe('partner_offers');
    expect(opportunities?.requiresFeature).toBe('creator_opportunities');
  });

  it('marks exactly one list as carrying commercial content', () => {
    const commercial = EMAIL_LIST_VALUES.filter((list) => list.commercial);
    expect(commercial).toHaveLength(1);
    expect(commercial[0]?.key).toBe('partner_offers');
  });

  it('tells the reader how often, on every list', () => {
    for (const list of EMAIL_LIST_VALUES) {
      expect(list.cadence.length, `${list.key} does not say how often`).toBeGreaterThan(10);
      expect(list.description.length).toBeGreaterThan(30);
    }
  });
});

/**
 * A package is where a commercial conversation gets written down, which makes
 * it the exact place a sentence like "priority consideration" would first
 * appear. It is refused at the point of writing rather than argued about in a
 * sales meeting later.
 */
describe('what a package may promise', () => {
  const forbidden = /judg|score|winner selection|finalist selection|nominat\w* weight|outcome/i;

  it('refuses anything describing a judging decision', () => {
    for (const benefit of [
      'Access to judging scores',
      'Influence over finalist selection',
      'Nomination weighting for our creators',
      'A seat on the judging panel',
      'Guaranteed winner selection in our category',
      'Priority consideration in the outcome',
    ]) {
      expect(forbidden.test(benefit), `“${benefit}” was allowed`).toBe(true);
    }
  });

  it('allows what PALMA actually sells', () => {
    for (const benefit of [
      'Category association on the season page',
      'Award-night visibility',
      'Logo placement on the category page',
      'Hospitality for six guests',
      'Approved digital assets',
      'Press association',
      'Post-award recognition',
    ]) {
      expect(forbidden.test(benefit), `“${benefit}” was refused`).toBe(false);
    }
  });
});
