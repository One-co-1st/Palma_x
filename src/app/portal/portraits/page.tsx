import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { PortraitWithdrawForm } from '@/components/operations/PortraitWithdrawForm';
import { EditorialImage } from '@/components/palma/EditorialImage';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { sql } from '@/server/db/sql';
import { formatShortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Portraits',
  description: 'Portraits on PALMA records.',
  path: '/portal/portraits',
  noIndex: true,
});

/**
 * Portraits, after the queue.
 *
 * This page used to be a gate: nothing appeared on a record until somebody
 * here clicked approve. It is now a window. Portraits publish on upload, and
 * what this shows is what is already up, newest first, so the desk can look
 * through a season's worth in a minute and take down anything that should not
 * be there.
 *
 * The change is in who waits. It used to be every creator, for the rare bad
 * image; now it is only the bad image, for however long it takes somebody to
 * notice. That is the right way round for a site whose uploaders are verified
 * people putting their own face on a record that carries their name.
 */
type LivePortraitRow = {
  id: string;
  width: number;
  height: number;
  byteSize: number;
  alt: string | null;
  updatedAt: Date;
  creatorSlug: string;
  creatorDisplayName: string;
  creatorPortraitUrl: string | null;
};

type WithdrawnPortraitRow = {
  id: string;
  withdrawnAt: Date | null;
  withdrawnReason: string | null;
  creatorDisplayName: string;
};

export default async function PortraitsPage() {
  await requirePermission('editorial:edit_creator', '/portal/portraits');

  const [liveRows, withdrawnRows] = await Promise.all([
    sql<LivePortraitRow[]>`
      select
        p.id,
        p.width,
        p.height,
        p."byteSize",
        p.alt,
        p."updatedAt",
        c.slug as "creatorSlug",
        c."displayName" as "creatorDisplayName",
        c."portraitUrl" as "creatorPortraitUrl"
      from "CreatorPortrait" p
      join "Creator" c on c.id = p."creatorId"
      where p.status = 'published'
      order by p."updatedAt" desc
      limit 60
    `,
    sql<WithdrawnPortraitRow[]>`
      select
        p.id,
        p."withdrawnAt",
        p."withdrawnReason",
        c."displayName" as "creatorDisplayName"
      from "CreatorPortrait" p
      join "Creator" c on c.id = p."creatorId"
      where p.status = 'withdrawn'
      order by p."withdrawnAt" desc
      limit 15
    `,
  ]);

  const live = liveRows.map((row) => ({
    id: row.id,
    width: row.width,
    height: row.height,
    byteSize: row.byteSize,
    alt: row.alt,
    updatedAt: row.updatedAt,
    creator: {
      slug: row.creatorSlug,
      displayName: row.creatorDisplayName,
      portraitUrl: row.creatorPortraitUrl,
    },
  }));

  const withdrawn = withdrawnRows.map((row) => ({
    id: row.id,
    withdrawnAt: row.withdrawnAt,
    withdrawnReason: row.withdrawnReason,
    creator: { displayName: row.creatorDisplayName },
  }));

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">The record</span>
        <h1 className="text-4xl">Portraits</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Every portrait on a PALMA record, most recent first. They publish on upload, so nothing
          here is waiting on you, look through them and take down anything that should not be up.
        </p>
      </div>

      <Notice className="mt-8" title="What comes down">
        Anything explicit, anything sexual, anything that is plainly not the creator, and anything
        carrying a logo, a price or a promotion, a portrait is not an advertisement. Not a bad
        photograph: this is a record of people, not a gallery, and PALMA does not have taste about
        somebody&rsquo;s face. A withdrawal deletes the image, and the reason you write is what the
        creator reads on their own profile page, so write it to be read by them.
      </Notice>

      <section className="mt-14">
        <h2 className="palma-label text-taupe-deep mb-6">
          On records {live.length > 0 ? `· ${live.length}` : ''}
        </h2>

        {live.length === 0 ? (
          <EmptyState
            title="No portraits yet"
            description="One appears here the moment a creator uploads it, which is also the moment it appears on their record."
          />
        ) : (
          <ul className="grid gap-10 lg:grid-cols-2">
            {live.map((portrait) => (
              <li key={portrait.id} className="border-stone-deep flex flex-col gap-5 border p-6">
                <div className="flex flex-wrap items-start gap-5">
                  <div className="w-32 shrink-0">
                    <EditorialImage
                      name={portrait.creator.displayName}
                      src={portrait.creator.portraitUrl}
                      alt={portrait.alt}
                      ratio="square"
                      sizes="8rem"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <Link
                      href={`/portal/creators/${portrait.creator.slug}`}
                      className="font-display hover:text-olive text-xl transition-colors"
                    >
                      {portrait.creator.displayName}
                    </Link>
                    <span className="palma-label text-taupe-deep">
                      {portrait.width}×{portrait.height} · {Math.round(portrait.byteSize / 1024)}KB
                    </span>
                    <span className="palma-label text-taupe">
                      Uploaded {formatShortDate(portrait.updatedAt.toISOString())}
                    </span>
                  </div>
                </div>

                <div className="border-stone-deep/60 border-t pt-4">
                  <span className="palma-label text-taupe-deep">Their description</span>
                  <p className="text-taupe-deep mt-2 text-sm leading-relaxed">
                    {portrait.alt ?? <span className="text-taupe">None given.</span>}
                  </p>
                </div>

                <PortraitWithdrawForm
                  portraitId={portrait.id}
                  name={portrait.creator.displayName}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {withdrawn.length > 0 ? (
        <section className="mt-16">
          <h2 className="palma-label text-taupe-deep mb-6">Taken down</h2>
          <ul className="flex flex-col">
            {withdrawn.map((portrait) => (
              <li
                key={portrait.id}
                className="border-stone-deep/60 flex flex-col gap-2 border-b py-4"
              >
                <span className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <span className="font-display text-base">{portrait.creator.displayName}</span>
                  <span className="flex flex-wrap items-center gap-3">
                    <Badge variant="muted">Deleted</Badge>
                    <span className="palma-label text-taupe">
                      {portrait.withdrawnAt
                        ? formatShortDate(portrait.withdrawnAt.toISOString())
                        : ''}
                    </span>
                  </span>
                </span>
                {portrait.withdrawnReason ? (
                  <span className="text-taupe-deep text-sm leading-relaxed">
                    {portrait.withdrawnReason}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
