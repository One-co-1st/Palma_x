import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/palma/PortalShell';
import { StartRecordForm } from '@/components/account/StartRecordForm';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { sql } from '@/server/db/sql';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Start a record',
  description: 'Start your PALMA creator record.',
  path: '/creator/start',
  noIndex: true,
});

export default async function StartRecordPage() {
  const session = await requireSession('/creator/start');

  const heldRows = await sql<{ slug: string; displayName: string; isPublished: boolean }[]>`
    SELECT "slug", "displayName", "isPublished"
    FROM "Creator"
    WHERE "userId" = ${session.user.id}
    LIMIT 1
  `;
  const held = heldRows[0] ?? null;

  // An account already holding a record is editing, not starting.
  if (held) redirect('/creator');

  return (
    <PortalShell title="PALMA Portal" subtitle="Start a record" userName={session.user.email}>
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="max-w-160 lg:col-span-7">
          <p className="text-taupe-deep mb-10 leading-relaxed">
            PALMA writes most records itself, the first time a creator is nominated. The industry is
            larger than the archive, though, so if nothing here is you. Start it.
          </p>

          <StartRecordForm />
        </div>

        <aside className="flex flex-col gap-8 lg:col-span-5">
          <div className="border-stone-deep border p-7">
            <h2 className="palma-label text-taupe-deep mb-4">What happens next</h2>
            <ol className="text-taupe-deep flex flex-col gap-3 text-sm leading-relaxed">
              <li>1. The record is created, held by your account, and not published.</li>
              <li>2. A moderator checks the links and the copy.</li>
              <li>3. It is published, or you are asked for more.</li>
              <li>
                4. Age and identity assurance follows. No honour is conferred without it, and PALMA
                never holds your documents.
              </li>
            </ol>
          </div>

          <Notice title="Already in the archive?">
            Search first, a record may already exist from a nomination you never heard about.{' '}
            <Link href="/creator/claim" className="palma-link text-ink">
              Claim a record
            </Link>
            .
          </Notice>

          <Notice tone="warning" title="What a record is not">
            A page you control. PALMA publishes the record and keeps the history: you decide how you
            are described, the institution decides what it says happened.
          </Notice>
        </aside>
      </div>
    </PortalShell>
  );
}
