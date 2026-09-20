import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Notice } from '@/components/ui/feedback';
import { ProductForm } from '@/components/operations/ProductForm';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { PRODUCT_CATEGORIES, verdictReading } from '@/domain/product-library';
import { listDeskProducts } from '@/server/data/product-library';
import { featureLive } from '@/server/features';
import { sql } from '@/server/db/sql';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Kulture',
  description: 'The Product Library, and what is published in it.',
  path: '/portal/kulture',
  noIndex: true,
});

/**
 * Kulture, at the desk.
 *
 * The Product Library is editorial work and lives with the editors. An
 * administrator can switch the Library on and sign the partner; they have no
 * business writing a verdict, and there is no route from this page to one
 * unless they are also a moderator.
 */
export default async function PortalKulturePage() {
  await requirePermission('kulture:manage_products', '/portal/kulture');

  const [entries, live, sponsors] = await Promise.all([
    listDeskProducts(),
    featureLive('product_library'),
    sql<{ id: string; name: string }[]>`
      SELECT "id", "name"
      FROM "Sponsor"
      WHERE "status" = 'active'
      ORDER BY "name" ASC
    `,
  ]);

  const published = entries.filter((entry) => entry.isPublished).length;

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">The desk</span>
        <h1 className="text-4xl">Kulture</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          The Product Library: a short, curated list of things creators actually use, each with a
          PALMA verdict and an honest account of what it is not good for.
        </p>
      </div>

      <Notice
        className="mt-8"
        tone={live ? 'ceremonial' : 'warning'}
        title={live ? 'The Library is live' : 'The Library is switched off'}
      >
        {live ? (
          <>
            Published entries are visible at{' '}
            <Link href="/kulture/products" className="palma-link text-ink">
              /kulture/products
            </Link>
            .
          </>
        ) : (
          <>
            Nothing here is public. Entries can be written and published in advance; they appear
            when the Product Library feature is switched on at{' '}
            <Link href="/portal/features" className="palma-link text-ink">
              Features
            </Link>
            .
          </>
        )}
      </Notice>

      <Notice className="mt-5" title="What a partner buys, and what they do not">
        Partnership pays for a place in the Library and a disclosure line composed by PALMA. It
        cannot move a verdict, a strength or a limitation: those fields are written here and are
        never shown to a partner before publication. PALMA publishes no affiliate links, takes no
        commission, and an outbound link may carry no query string at all, which is what makes a
        commission impossible rather than merely discouraged.
      </Notice>

      <section className="mt-12">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
          {entries.length} entries, {published} published
        </h2>

        {entries.length === 0 ? (
          <p className="text-taupe-deep mt-6 max-w-160 leading-relaxed">
            Nothing yet. Twenty or thirty products somebody has actually used is the target. A
            catalogue nobody looked at is worse than no library.
          </p>
        ) : (
          <div className="border-stone-deep mt-6 overflow-x-auto border">
            <table className="w-full min-w-180 border-collapse text-left text-sm">
              <thead className="border-stone-deep border-b">
                <tr>
                  {['Product', 'Category', 'Verdict', 'Partner', 'State'].map((column) => (
                    <th key={column} scope="col" className="palma-label text-taupe-deep p-3">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-stone-deep/50 border-b last:border-none">
                    <td className="p-3">
                      <span className="font-display block text-lg leading-tight">{entry.name}</span>
                      <span className="text-taupe palma-label">{entry.brand}</span>
                    </td>
                    <td className="text-taupe-deep p-3">{entry.categoryLabel}</td>
                    <td className="p-3 tabular-nums">
                      {entry.verdict === null ? (
                        <span className="text-taupe">, </span>
                      ) : (
                        <>
                          {entry.verdict.toFixed(1)}
                          <span className="text-taupe block text-xs">
                            {verdictReading(entry.verdict)}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="text-taupe-deep p-3">
                      {entry.sponsorName ?? <span className="text-taupe">None</span>}
                    </td>
                    <td className="p-3">
                      <Badge variant={entry.isPublished ? 'olive' : 'muted'}>
                        {entry.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
          Add an entry
        </h2>
        <div className="mt-8">
          <ProductForm categories={[...PRODUCT_CATEGORIES]} sponsors={sponsors} />
        </div>
      </section>
    </>
  );
}
