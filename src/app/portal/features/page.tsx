import { Notice } from '@/components/ui/feedback';
import { FeaturePanel } from '@/components/operations/FeaturePanel';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Features',
  description: 'Which public surfaces are switched on.',
  path: '/portal/features',
  noIndex: true,
});

/**
 * The same control panel, at the editorial desk.
 *
 * A feature flag decides whether a public surface exists at all, which makes it
 * an editorial decision before it is a commercial one. The desk that owns those
 * pages can take one down at four in the afternoon without going looking for an
 * administrator.
 *
 * What the desk cannot do from here is decide who pays to be on a surface.
 * Creating a sponsor, pricing a package and licensing the mark stay with
 * administration, so switching a surface on and selling a place on it are never
 * the same pair of hands unless somebody holds both deliberately.
 */
export default async function PortalFeaturesPage() {
  await requirePermission('commercial:manage_features', '/portal/features');

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">The desk</span>
        <h1 className="text-4xl">Features</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Which public surfaces are switched on. Everything ships off, and switching one on asks for
          a written reason that goes into the audit log beside your name.
        </p>
      </div>

      <Notice className="mt-8" title="What this desk decides, and what it does not">
        You decide whether a surface is live. You do not decide who appears on it or what they pay:
        sponsors, packages and licensing belong to administration. PALMA never sells recognition,
        and no switch on this page can change that.
      </Notice>

      <FeaturePanel />
    </>
  );
}
