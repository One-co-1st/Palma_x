import { headers } from 'next/headers';
import { AdminShell } from '@/components/admin/AdminShell';
import { roleSurface } from '@/components/account/RoleSurface';
import { ENTRANCES } from '@/lib/auth/entrances';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, panel } = await roleSurface(ENTRANCES.admin);
  if (!session) return panel;

  const activeHref = (await headers()).get('x-palma-pathname') ?? '/admin';

  return (
    <AdminShell role={session.user.role} userName={session.user.email} activeHref={activeHref}>
      {children}
    </AdminShell>
  );
}
