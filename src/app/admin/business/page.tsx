import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Stat } from '@/components/ui/stat';
import { Table, TBody, THead } from '@/components/ui/table';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { SponsorForm } from '@/components/operations/SponsorForm';
import { PackageForm } from '@/components/operations/PackageForm';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { getBusinessOverview } from '@/server/data/business';
import { EMAIL_LIST_VALUES } from '@/domain/email-lists';
import { sql } from '@/server/db/sql';
import { titleCase } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Business',
  description: 'PALMA’s commercial side: sponsors, packages and what is for sale.',
  path: '/admin/business',
  noIndex: true,
});

const STATE_TONE = {
  available: 'olive',
  taken: 'champagne',
  off: 'muted',
} as const;

export default async function BusinessPage() {
  const session = await requirePermission('commercial:view', '/admin/business');
  const overview = await getBusinessOverview();

  const [sponsors, packages] = await Promise.all([
    sql<
      {
        id: string;
        name: string;
        status: string;
        agreementStatus: string;
        contactEmail: string | null;
        websiteUrl: string | null;
        sponsorshipCount: number;
      }[]
    >`
      SELECT
        s."id",
        s."name",
        s."status",
        s."agreementStatus",
        s."contactEmail",
        s."websiteUrl",
        (
          SELECT count(*)::int FROM "Sponsorship" sp WHERE sp."sponsorId" = s."id"
        ) AS "sponsorshipCount"
      FROM "Sponsor" s
      ORDER BY s."status" ASC, s."name" ASC
    `,
    sql<
      {
        id: string;
        name: string;
        description: string | null;
        priceMinor: number;
        currency: string;
        duration: string | null;
        benefits: string[];
        isAvailable: boolean;
      }[]
    >`
      SELECT
        "id",
        "name",
        "description",
        "priceMinor",
        "currency",
        "duration",
        "benefits",
        "isAvailable"
      FROM "SponsorshipPackage"
      ORDER BY "priceMinor" ASC
    `,
  ]);

  const maySponsors = can(session.user.role, 'commercial:manage_sponsors');
  const mayPackages = can(session.user.role, 'commercial:manage_packages');

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Business</span>
        <h1 className="text-4xl">The commercial side</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          PALMA never sells recognition. It sells the ecosystem around it. Association, visibility,
          hospitality, editorial presence. Nothing on this page can reach a nomination, a score, a
          finalist or a winner, and that is enforced in the permission matrix rather than left to
          this page to remember.
        </p>
      </div>

      {overview.liveCount === 0 ? (
        <Notice className="mt-8" title="Nothing is switched on">
          PALMA is operating as an institution and selling nothing, which is the correct
          configuration for a first season. The rails below exist so that turning something on later
          is a decision rather than a rebuild.{' '}
          <Link href="/admin/settings/features" className="palma-link text-ink">
            Features &amp; commercial
          </Link>
        </Notice>
      ) : null}

      <div className="border-stone-deep mt-10 grid gap-10 border-b pb-10 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Rails live" value={`${overview.liveCount} / ${overview.features.length}`} />
        <Stat label="Sponsors" value={overview.sponsors.total} />
        <Stat label="Prospects" value={overview.sponsors.prospects} />
        <Stat label="Signed" value={overview.sponsors.signed} />
        <Stat label="Packages available" value={overview.packages.available} />
      </div>

      {overview.sponsors.expiringSoon > 0 ? (
        <Notice className="mt-8" tone="warning" title="Agreements ending">
          {overview.sponsors.expiringSoon} active sponsorship
          {overview.sponsors.expiringSoon === 1 ? '' : 's'} end within sixty days.
        </Notice>
      ) : null}

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-2">Inventory</h2>
        <p className="text-taupe mb-6 max-w-160 text-xs leading-relaxed">
          What could be sold, derived from what exists and what is switched on rather than typed
          into a page. A placement reading <em>off</em> is not for sale at any price.
        </p>

        <Table>
          <THead>
            <tr>
              <th scope="col">Placement</th>
              <th scope="col">What</th>
              <th scope="col">Detail</th>
              <th scope="col">State</th>
            </tr>
          </THead>
          <TBody>
            {overview.inventory.map((row, index) => (
              <tr key={`${row.kind}-${row.label}-${index}`}>
                <td className="palma-label text-taupe-deep whitespace-nowrap">{row.kind}</td>
                <td className="font-display text-base">{row.label}</td>
                <td className="text-taupe-deep text-sm">{row.detail}</td>
                <td>
                  <Badge variant={STATE_TONE[row.state]}>{titleCase(row.state)}</Badge>
                </td>
              </tr>
            ))}
          </TBody>
        </Table>
      </section>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-2">Sponsors</h2>
        <p className="text-taupe mb-6 max-w-160 text-xs leading-relaxed">
          Contacts, agreement state and notes are PALMA&rsquo;s side of a business relationship and
          are never rendered on a public page. A sponsor appears publicly only once the relationship
          is active <em>and</em> the agreement is signed.
        </p>

        {sponsors.length === 0 ? (
          <EmptyState
            title="No sponsors yet"
            description="A sponsor recorded here is a conversation, not a commitment. Nothing becomes public until an agreement is signed."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <th scope="col">Sponsor</th>
                <th scope="col">Status</th>
                <th scope="col">Agreement</th>
                <th scope="col">Associations</th>
                <th scope="col">Contact</th>
              </tr>
            </THead>
            <TBody>
              {sponsors.map((sponsor) => (
                <tr key={sponsor.id}>
                  <td className="font-display text-base">{sponsor.name}</td>
                  <td>
                    <Badge variant={sponsor.status === 'active' ? 'olive' : 'muted'}>
                      {titleCase(sponsor.status)}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={sponsor.agreementStatus === 'signed' ? 'olive' : 'default'}>
                      {titleCase(sponsor.agreementStatus)}
                    </Badge>
                  </td>
                  <td className="text-taupe-deep">{sponsor.sponsorshipCount}</td>
                  <td className="text-taupe-deep font-mono text-xs break-all">
                    {sponsor.contactEmail ?? '—'}
                  </td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}

        {maySponsors ? (
          <div className="mt-10 max-w-160">
            <h3 className="palma-label text-taupe-deep mb-5">Add or update a sponsor</h3>
            <SponsorForm sponsors={sponsors.map((s) => ({ id: s.id, name: s.name }))} />
          </div>
        ) : null}
      </section>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-2">Packages</h2>
        <p className="text-taupe mb-6 max-w-160 text-xs leading-relaxed">
          Prices are set here, never in code. A benefit that describes any part of a judging
          decision is refused at the point of writing it down rather than argued about later.
        </p>

        {packages.length === 0 ? (
          <EmptyState
            title="No packages yet"
            description="Define what PALMA offers and what it costs. Nothing is published until a package is marked available."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <th scope="col">Package</th>
                <th scope="col">Price</th>
                <th scope="col">Duration</th>
                <th scope="col">Benefits</th>
                <th scope="col">State</th>
              </tr>
            </THead>
            <TBody>
              {packages.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span className="font-display text-base">{entry.name}</span>
                    {entry.description ? (
                      <span className="text-taupe mt-1 block max-w-100 text-xs leading-relaxed">
                        {entry.description}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap">
                    {(entry.priceMinor / 100).toLocaleString('en-GB', {
                      style: 'currency',
                      currency: entry.currency,
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="text-taupe-deep">{entry.duration ?? '—'}</td>
                  <td className="text-taupe-deep text-sm">{entry.benefits.length}</td>
                  <td>
                    <Badge variant={entry.isAvailable ? 'olive' : 'muted'}>
                      {entry.isAvailable ? 'Available' : 'Draft'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}

        {mayPackages ? (
          <div className="mt-10 max-w-160">
            <h3 className="palma-label text-taupe-deep mb-5">Add or update a package</h3>
            <PackageForm packages={packages.map((p) => ({ id: p.id, name: p.name }))} />
          </div>
        ) : null}
      </section>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-6">Audience</h2>
        <div className="border-stone-deep grid gap-8 border-y py-8 sm:grid-cols-3 lg:grid-cols-5">
          {EMAIL_LIST_VALUES.map((list) => (
            <Stat
              key={list.key}
              label={list.name.replace('PALMA ', '')}
              value={overview.subscribers.find((row) => row.key === list.key)?.confirmed ?? 0}
            />
          ))}
        </div>
        <p className="text-taupe mt-5 max-w-160 text-xs leading-relaxed">
          Subscriber counts, and nothing else. PALMA does not build behavioural profiles of the
          people on its lists, and this page will never show individual-level marketing analytics.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-6">The rails</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {overview.features.map((entry) => (
            <li
              key={entry.key}
              className="border-stone-deep/60 flex items-center justify-between gap-4 border-b py-3"
            >
              <span className="text-sm">{entry.name}</span>
              <Badge variant={entry.live ? 'olive' : 'muted'}>{entry.live ? 'Live' : 'Off'}</Badge>
            </li>
          ))}
        </ul>
        {can(session.user.role, 'commercial:manage_features') ? (
          <Button asChild variant="outline" size="sm" className="mt-8">
            <Link href="/admin/settings/features">Change what is switched on</Link>
          </Button>
        ) : (
          <p className="text-taupe mt-6 text-sm">
            Switching a rail on is a super administrator&rsquo;s decision.
          </p>
        )}
      </section>
    </>
  );
}
