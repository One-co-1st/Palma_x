import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { EntrancePanel } from './EntrancePanel';
import { getSession, type ActiveSession } from '@/lib/auth/session';
import { admits, homeForRole, type Entrance } from '@/lib/auth/entrances';

/**
 * A role's surface: its door and its dashboard at one path.
 *
 * Signed out, the path renders that role's sign-in. Signed in as the right
 * role, it renders the dashboard. Signed in as somebody else, it sends you to
 * your own path rather than refusing you — being in the wrong building is not
 * the same as lacking permission, and a 403 would be the wrong answer to it.
 *
 * Returning `null` for the session means the caller should render nothing of
 * its own: the panel has already been returned in its place.
 */
export async function roleSurface(
  entrance: Entrance,
): Promise<{ session: ActiveSession; panel: null } | { session: null; panel: React.ReactElement }> {
  const session = await getSession();

  if (!session) {
    const pathname = (await headers()).get('x-palma-pathname') ?? entrance.path;
    const next = pathname === entrance.path ? undefined : pathname;
    return { session: null, panel: <EntrancePanel entrance={entrance} next={next} /> };
  }

  if (!admits(entrance, session.user.role)) {
    redirect(homeForRole(session.user.role));
  }

  return { session, panel: null };
}
