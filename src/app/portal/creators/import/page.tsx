import Link from 'next/link';
import { CreatorImportForm } from '@/components/operations/CreatorImportForm';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { MAX_IMPORT_ROWS } from '@/domain/creator-import';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Import creators',
  description: 'Write creator records into the archive in bulk.',
  path: '/portal/creators/import',
  noIndex: true,
});

export default async function ImportCreatorsPage() {
  await requirePermission('editorial:import_creators', '/portal/creators/import');

  return (
    <>
      <Link href="/portal/creators" className="palma-label text-taupe-deep hover:text-ink">
        ← Creator records
      </Link>

      <div className="mt-8 flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">The record</span>
        <h1 className="text-4xl">Import creators</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          PALMA&rsquo;s records exist before their creators do. That is the premise the claim flow
          rests on. This writes them in bulk so an archive can be preset and waiting, rather than
          typed one at a time.
        </p>
      </div>

      <div className="mt-12 grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="min-w-0 lg:col-span-7">
          <CreatorImportForm />
        </div>

        <aside className="flex min-w-0 flex-col gap-8 lg:col-span-5">
          <div className="border-stone-deep border p-7">
            <h2 className="palma-label text-taupe-deep mb-4">The columns</h2>
            <ol className="text-taupe-deep flex flex-col gap-3 text-sm leading-relaxed">
              <li>
                <strong className="text-ink">1. Name</strong>. Required. The name they work under.
              </li>
              <li>
                <strong className="text-ink">2. Country</strong>, two letters (GB, IE, NG). Blank
                defaults to GB.
              </li>
              <li>
                <strong className="text-ink">3. City</strong>. Optional.
              </li>
              <li>
                <strong className="text-ink">4. Headline</strong>. Optional, up to 160 characters.
              </li>
              <li>
                <strong className="text-ink">5. Links</strong>. Optional, separated by spaces or
                pipes. Up to six. PALMA names each one from its domain.
              </li>
            </ol>
          </div>

          <div className="border-stone-deep border p-7">
            <h2 className="palma-label text-taupe-deep mb-4">What it will not do</h2>
            <ul className="text-taupe-deep flex flex-col gap-3 text-sm leading-relaxed">
              <li>
                <strong className="text-ink">Publish anything.</strong> Every imported record is an
                unpublished stub. A bulk route that could publish is one that eventually publishes
                something nobody read.
              </li>
              <li>
                <strong className="text-ink">Overwrite anything.</strong> A name already in the
                archive is reported and skipped. Import must never be a way to quietly rewrite a
                record somebody holds.
              </li>
              <li>
                <strong className="text-ink">Claim anything.</strong> Imported records are
                unclaimed, which is exactly what makes them claimable.
              </li>
              <li>
                <strong className="text-ink">Guess.</strong> A line PALMA cannot read is listed with
                its number rather than half-imported.
              </li>
            </ul>
          </div>

          <p className="text-taupe text-xs leading-relaxed">
            Up to {MAX_IMPORT_ROWS} rows at a time. Larger archives go in batches, which also keeps
            the preview readable.
          </p>
        </aside>
      </div>
    </>
  );
}
