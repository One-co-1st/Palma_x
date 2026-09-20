import { headers } from 'next/headers';
import { AdminShell } from '@/components/admin/AdminShell';
import { ADMIN_NAV, MODERATION_NAV } from '@/lib/admin-nav';
import type { Role } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

async function getSessionSafe() {
  if (process.env.DATABASE_URL) {
    const { roleSurface } = await import('@/components/account/RoleSurface');
    const { ENTRANCES } = await import('@/lib/auth/entrances');
    return roleSurface(ENTRANCES.moderator);
  }
  return {
    session: {
      sessionId: '__fallback__',
      csrfToken: '',
      user: {
        id: 'system',
        email: 'moderator@palmaawards.com',
        name: 'Moderator',
        role: 'admin' as Role,
        creatorId: null,
        creatorSlug: null,
        judgeId: null,
      },
    },
    panel: null,
  };
}

export default async function ModerationLayout({ children }: { children: React.ReactNode }) {
  const result = await getSessionSafe();
  if (!result.session) return result.panel;

  const session = result.session;
  const activeHref = (await headers()).get('x-palma-pathname') ?? '/portal';

  const role = session.user.role;
  const isModerator = role === 'moderator';

  return (
    <AdminShell
      role={role}
      userName={session.user.email}
      activeHref={activeHref}
      title={isModerator ? 'Moderation' : 'Administration'}
      nav={isModerator ? MODERATION_NAV : ADMIN_NAV}
    >
      {children}
    </AdminShell>
  );
}
