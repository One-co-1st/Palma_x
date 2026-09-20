import { roleSurface } from '@/components/account/RoleSurface';
import { ENTRANCES } from '@/lib/auth/entrances';

export const dynamic = 'force-dynamic';

/**
 * The creator surface.
 *
 * Everyone who signs up on PALMA is a creator, so this is the ordinary account
 * dashboard: the other three paths are for accounts PALMA has additionally
 * given a role.
 */
export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const { session, panel } = await roleSurface(ENTRANCES.creator);
  if (!session) return panel;
  return <>{children}</>;
}
