import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { listSponsors } from '@/server/data/queries';
import { OUTCOME_PERMISSIONS } from '@/lib/auth/rbac';
import { titleCase } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Sponsors & partners',
  description: 'PALMA commercial relationships.',
  path: '/admin/sponsors',
  noIndex: true,
});

export default async function SponsorsPage() {
  await requirePermission('admin:manage_sponsors', '/admin/sponsors');
  const sponsors = await listSponsors();

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Business</span>
        <h1 className="text-4xl">Sponsors &amp; partners</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Sponsorship is a commercial relationship with PALMA and nothing else. It is recorded
          against a season or a category, and it is the only part of the institution deliberately
          built with no connection to the rest.
        </p>
      </div>

      <Notice tone="warning" className="mt-8" title="The boundary is structural, not a policy">
        A sponsor holds no role in PALMA&rsquo;s permission matrix. There is no sponsor account, no
        sponsor-readable relation on any judging table, and no messaging path between a sponsor and
        a judge, because none was ever built. The permissions that decide an award (
        {OUTCOME_PERMISSIONS.map((permission) => permission.split(':')[1]?.replace(/_/g, ' ')).join(
          ', ',
        )}
        ) are held only by administrators.
      </Notice>

      {sponsors.length === 0 ? (
        <EmptyState
          className="mt-12"
          title="No sponsorships recorded"
          description="Sponsorships are created against a season and a tier."
        />
      ) : (
        <div className="mt-12 flex flex-col gap-px">
          {sponsors.map((sponsor) => (
            <article
              key={`${sponsor.slug}-${sponsor.categoryName ?? 'season'}`}
              className="border-stone-deep border p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-xl">{sponsor.name}</h2>
                <Badge variant={sponsor.tier === 'headline' ? 'olive' : 'muted'}>
                  {titleCase(sponsor.tier)}
                </Badge>
              </div>

              {sponsor.summary ? (
                <p className="text-taupe-deep mt-3 text-sm leading-relaxed">{sponsor.summary}</p>
              ) : null}

              <dl className="border-stone-deep/60 mt-5 flex flex-wrap gap-x-10 gap-y-3 border-t pt-4 text-sm">
                <div className="flex gap-3">
                  <dt className="text-taupe">Scope</dt>
                  <dd>{sponsor.categoryName ?? 'Across the season'}</dd>
                </div>
                {sponsor.websiteUrl ? (
                  <div className="flex min-w-0 gap-3">
                    <dt className="text-taupe">Site</dt>
                    <dd className="min-w-0 break-all">{sponsor.websiteUrl}</dd>
                  </div>
                ) : null}
                <div className="flex gap-3">
                  <dt className="text-taupe">Judging access</dt>
                  <dd className="text-olive">None</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}

      <p className="text-taupe mt-10 max-w-160 text-sm leading-relaxed">
        The public statement of all this, what a partnership buys and what it can never buy, is at{' '}
        <Link href="/about/sponsors" className="palma-link text-ink">
          /about/sponsors
        </Link>
        , and the binding version is in the{' '}
        <Link href="/legal/rules" className="palma-link text-ink">
          competition rules
        </Link>
        . Contract and invoicing are handled outside PALMA; nothing financial is stored here.
      </p>
    </>
  );
}
