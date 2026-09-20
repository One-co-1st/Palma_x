import Link from 'next/link';
import { CreatorRecordForm } from '@/components/operations/Forms';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Add creator',
  description: 'Create a PALMA creator record.',
  path: '/portal/creators/new',
  noIndex: true,
});

export default async function NewCreatorPage() {
  await requirePermission('editorial:create_creator', '/portal/creators/new');

  return (
    <>
      <Link href="/portal/creators" className="palma-label text-taupe-deep hover:text-ink">
        ← Creator records
      </Link>

      <div className="mt-8 flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Content</span>
        <h1 className="text-4xl">Add a creator record</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          The record is created unclaimed. Nobody holds it until a claim is reviewed and approved,
          and creating one grants no account, no role and no access.
        </p>
      </div>

      <div className="mt-12 grid gap-14 lg:grid-cols-12">
        <div className="max-w-160 lg:col-span-7">
          <CreatorRecordForm />
        </div>

        <div className="lg:col-span-5">
          <Notice title="Public and internal are different things">
            Everything on this form is published. Anything PALMA wants to record privately,
            provenance, a conversation, a doubt, goes in an internal note on the record once it
            exists. The two are never mixed.
          </Notice>
        </div>
      </div>
    </>
  );
}
