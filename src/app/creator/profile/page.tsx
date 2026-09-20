import { PortalShell } from '@/components/palma/PortalShell';
import { Notice } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PortraitForm } from '@/components/account/PortraitForm';
import { LinksForm, ProfileForm } from '@/components/account/PortalForms';
import { buildMetadata } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { getCreatorPortal } from '@/server/data/portal';
import { CREATOR_NAV } from '@/lib/creator-nav';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Your profile',
  description: 'The portrait, the details and the links on your PALMA record.',
  path: '/creator/profile',
  noIndex: true,
});

/**
 * Everything a creator writes about themselves, on one page.
 *
 * Editable whether or not the record is published: somebody waiting on the
 * desk is exactly the person who needs to fix what the desk is waiting on.
 */
export default async function CreatorProfilePage() {
  const session = await requireSession('/creator/profile');
  const portal = await getCreatorPortal(session.user.id);

  return (
    <PortalShell
      title="PALMA Portal"
      subtitle="Your profile"
      userName={session.user.email}
      nav={CREATOR_NAV}
      activeHref="/creator/profile"
    >
      {!portal?.profile ? (
        <Notice tone="warning" title="No record yet">
          <p>
            PALMA has not written a record for you, or you have not claimed one. There is nothing to
            edit until there is.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild size="sm" variant="outline">
              <Link href="/creator">Back to the overview</Link>
            </Button>
          </div>
        </Notice>
      ) : (
        <div className="flex max-w-200 flex-col gap-14">
          <section>
            <h2 className="palma-label text-taupe-deep mb-2">Your portrait</h2>
            <p className="text-taupe-deep mb-6 max-w-140 text-sm leading-relaxed">
              One picture, shown on your record, on your nomination link and wherever PALMA names
              you. Without one your record carries the PALMA plate, which is a deliberate design
              rather than a gap, but the plate is not you.
            </p>
            <PortraitForm
              standing={portal.portrait}
              name={portal.displayName ?? session.user.name}
            />
          </section>

          <section>
            <h2 className="palma-label text-taupe-deep mb-6">Profile details</h2>
            <ProfileForm defaults={portal.profile} />
          </section>

          <section>
            <h2 className="palma-label text-taupe-deep mb-2">Where your work lives</h2>
            <p className="text-taupe-deep mb-6 max-w-140 text-sm leading-relaxed">
              The editorial desk reads your record from these. Keep them current: a dead link is
              worse than no link, and PALMA will not publish a record it cannot check.
            </p>
            <LinksForm defaults={portal.links} />
          </section>
        </div>
      )}
    </PortalShell>
  );
}
