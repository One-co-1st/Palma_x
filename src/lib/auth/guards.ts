import 'server-only';
import { redirect } from 'next/navigation';
import { getSession, type ActiveSession } from './session';
import { can, type Permission, type Role } from './rbac';
import { admits, entranceForPath, homeForRole } from './entrances';

export class AuthorisationError extends Error {
  readonly permission: Permission | null;

  constructor(message: string, permission: Permission | null = null) {
    super(message);
    this.name = 'AuthorisationError';
    this.permission = permission;
  }
}

/**
 * Server-side gate for pages.
 *
 * A visitor is sent to the door that guards *this surface*, not to a shared
 * sign-in — the judging room sends people to /judge, the admin surface to
 * /admin/sign-in. The door is resolved from the path, so no role lookup is
 * needed to decide where an unauthenticated visitor goes.
 *
 * A signed-in account on a surface its own door does not lead to is sent to
 * its own entrance rather than shown the refusal page: it is in the wrong
 * building, not merely under-permissioned.
 */
export async function requireSession(returnTo?: string): Promise<ActiveSession> {
  const entrance = entranceForPath(returnTo);
  const session = await getSession();

  if (!session) {
    redirect(returnTo ? `${entrance.path}?next=${encodeURIComponent(returnTo)}` : entrance.path);
  }

  if (!admits(entrance, session.user.role)) {
    redirect(homeForRole(session.user.role));
  }

  return session;
}

/**
 * Page-level gate. A signed-in user who lacks the permission is sent to a
 * plain refusal page rather than an error boundary — being refused is a normal
 * outcome in an institution with roles, not a fault.
 */
export async function requirePermission(
  permission: Permission,
  returnTo?: string,
): Promise<ActiveSession> {
  const session = await requireSession(returnTo);
  if (!can(session.user.role, permission)) {
    redirect(`/forbidden?permission=${encodeURIComponent(permission)}`);
  }
  return session;
}

/**
 * For Server Actions: never redirects, so the caller can return a typed error
 * to the form instead of throwing a navigation.
 */
export async function authorise(permission: Permission): Promise<ActiveSession> {
  const session = await getSession();
  if (!session) throw new AuthorisationError('You must be signed in to do that.', permission);
  if (!can(session.user.role, permission)) {
    throw new AuthorisationError('You do not have permission to do that.', permission);
  }
  return session;
}

export async function currentRole(): Promise<Role> {
  const session = await getSession();
  return session?.user.role ?? 'visitor';
}
