import { describe, expect, it } from 'vitest';
import {
  ENTRANCES,
  ENTRANCE_LIST,
  admits,
  entranceByKey,
  entranceForPath,
  entranceForRole,
  homeForRole,
  housedAt,
} from '@/lib/auth/entrances';
import { ROLES, type Role } from '@/lib/auth/rbac';

/**
 * Four paths, one per role. Each is both the door and the dashboard, so these
 * assertions are about one thing rather than two that can drift apart.
 */
describe('the four surfaces', () => {
  it('houses every role at exactly one path', () => {
    for (const role of ROLES) {
      if (role === 'visitor') continue;
      const homes = ENTRANCE_LIST.filter((entrance) => housedAt(entrance, role));
      expect(homes, `${role} lives at ${homes.length} paths`).toHaveLength(1);
    }
  });

  it('puts each role where you said it goes', () => {
    expect(homeForRole('creator')).toBe('/creator');
    expect(homeForRole('judge')).toBe('/judge');
    expect(homeForRole('moderator')).toBe('/portal');
    expect(homeForRole('admin')).toBe('/admin');
    expect(homeForRole('super_admin')).toBe('/admin');
  });

  it('makes the door and the dashboard the same path', () => {
    for (const entrance of ENTRANCE_LIST) {
      for (const role of entrance.roles) {
        expect(homeForRole(role)).toBe(entrance.path);
      }
    }
  });

  it('gives the four paths four distinct URLs', () => {
    const paths = ENTRANCE_LIST.map((entrance) => entrance.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toEqual(['/creator', '/judge', '/portal', '/admin']);
  });

  /**
   * Living somewhere and being let in are different questions, and the one
   * place they legitimately come apart is moderation: an administrator holds
   * every moderator permission and their own sidebar links straight at those
   * queues, so bouncing them would break the page that sent them.
   */
  it('admits each role at its own path, and administrators at the desk', () => {
    const admitted: Record<Role, string[]> = {
      visitor: [],
      creator: ['/creator'],
      judge: ['/judge'],
      moderator: ['/portal'],
      admin: ['/portal', '/admin'],
      super_admin: ['/portal', '/admin'],
    };

    for (const role of ROLES) {
      const paths = ENTRANCE_LIST.filter((entrance) => admits(entrance, role)).map(
        (entrance) => entrance.path,
      );
      expect(paths.sort(), `${role}`).toEqual([...admitted[role]].sort());
    }
  });

  it('never lets a creator or a judge into an operator surface', () => {
    for (const role of ['creator', 'judge'] as const) {
      for (const key of ['moderator', 'admin'] as const) {
        expect(admits(ENTRANCES[key], role), `${role} at ${ENTRANCES[key].path}`).toBe(false);
      }
    }
  });

  it('never lets a moderator into administration', () => {
    expect(admits(ENTRANCES.admin, 'moderator')).toBe(false);
  });

  it('sends an administrator home to /admin even though the desk admits them', () => {
    expect(admits(ENTRANCES.moderator, 'admin')).toBe(true);
    expect(housedAt(ENTRANCES.moderator, 'admin')).toBe(false);
    expect(homeForRole('admin')).toBe('/admin');
  });

  it('falls back to the creator surface for a visitor', () => {
    expect(entranceForRole('visitor').key).toBe('creator');
  });

  it('resolves the surface from the path, without needing a role', () => {
    expect(entranceForPath('/judge').key).toBe('judge');
    expect(entranceForPath('/judge/abc123').key).toBe('judge');
    expect(entranceForPath('/portal').key).toBe('moderator');
    expect(entranceForPath('/portal/claims').key).toBe('moderator');
    expect(entranceForPath('/admin').key).toBe('admin');
    expect(entranceForPath('/admin/audit').key).toBe('admin');
    expect(entranceForPath('/creator').key).toBe('creator');
    expect(entranceForPath('/creator/start').key).toBe('creator');
  });

  it('does not mistake a lookalike public path for a surface', () => {
    // /about/judging and /judges are public pages, not the judging room.
    expect(entranceForPath('/about/judging').key).toBe('creator');
    expect(entranceForPath('/about/judges').key).toBe('creator');
    expect(entranceForPath('/administration').key).toBe('creator');
    expect(entranceForPath(undefined).key).toBe('creator');
  });

  it('resolves a surface by key and refuses an unknown one', () => {
    expect(entranceByKey('judge')).toBe(ENTRANCES.judge);
    expect(entranceByKey('staff')).toBeUndefined();
    expect(entranceByKey('nonsense')).toBeUndefined();
  });
});
