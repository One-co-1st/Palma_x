import { roleSurface } from '@/components/account/RoleSurface';
import { ENTRANCES } from '@/lib/auth/entrances';

export const dynamic = 'force-dynamic';

/** The judging room. Signed out, this path is the panel's sign-in. */
export default async function JudgeLayout({ children }: { children: React.ReactNode }) {
  const { session, panel } = await roleSurface(ENTRANCES.judge);
  if (!session) return panel;
  return <>{children}</>;
}
