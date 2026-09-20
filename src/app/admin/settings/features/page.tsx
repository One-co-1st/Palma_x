import Link from 'next/link';
import { Notice } from '@/components/ui/feedback';
import { FeaturePanel } from '@/components/operations/FeaturePanel';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Features & commercial',
  description: 'What PALMA is currently selling, and what it is not.',
  path: '/admin/settings/features',
  noIndex: true,
});

/**
 * The control room.
 *
 * Everything here ships off. A feature that defaults on is a feature somebody
 * has to remember to turn off before launch, and nobody ever does.
 *
 * Two things this page insists on saying. Each switch carries its prerequisite,
 * because a feature turned on before the thing it needs is how a public page
 * ends up advertising something that does not exist. And every change is
 * audited with the actor and the reason, because "when did we start selling
 * that, and who decided?" is a question an institution has to be able to answer
 * about itself.
 */
export default async function FeaturesPage() {
  await requirePermission('commercial:manage_features', '/admin/settings/features');

  return (
    <>
      <div className="flex flex-col gap-3">
        <Link href="/admin/settings" className="palma-label text-taupe-deep hover:text-ink">
          ← Settings
        </Link>
        <span className="palma-label text-taupe-deep">System</span>
        <h1 className="text-4xl">Features &amp; commercial</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          What PALMA is selling, and what it is not. Everything here ships switched off: build the
          rails now, turn the trains on when PALMA is ready.
        </p>
      </div>

      <Notice className="mt-8" title="The line none of these crosses">
        PALMA never sells recognition. A sponsor buys visibility, association, hospitality and
        editorial presence, never a nomination, a score, a finalist or a winner. That separation is
        enforced in the permission matrix and asserted by tests, not left to this page to remember.
      </Notice>

      <FeaturePanel />
    </>
  );
}
