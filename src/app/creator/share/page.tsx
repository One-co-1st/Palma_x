import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { CopyLink, CopyMark } from '@/components/palma/CopyLink';
import { buildMetadata, absoluteUrl } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { getCreatorPortal } from '@/server/data/portal';
import { CREATOR_NAV } from '@/lib/creator-nav';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Your links',
  description: 'The link you share to be nominated, and the one that proves what you hold.',
  path: '/creator/share',
  noIndex: true,
});

/**
 * A creator has two addresses, and they do opposite jobs.
 *
 * The nomination link asks for something: it opens a form with the creator
 * already chosen, and it only matters while nominations are open. The record
 * link proves something: it is permanent, it leads with the most recent
 * honour, and it keeps working as more are won, so the one printed in a press
 * kit never has to be reissued.
 *
 * They were previously two cards in a column of nine, which is why nobody
 * could tell them apart. Here they are the page, side by side, each said
 * plainly.
 */
export default async function CreatorSharePage() {
  const session = await requireSession('/creator/share');
  const portal = await getCreatorPortal(session.user.id);

  const recordPath = portal?.creatorSlug ? `/c/${portal.creatorSlug}` : null;
  const newest = portal?.achievements[0] ?? null;

  return (
    <PortalShell
      title="PALMA Portal"
      subtitle="Your links"
      userName={session.user.email}
      nav={CREATOR_NAV}
      activeHref="/creator/share"
    >
      <div className="grid max-w-240 gap-10 lg:grid-cols-2">
        <section className="border-stone-deep flex flex-col border p-7">
          <h2 className="palma-label text-taupe-deep mb-2">The link you share</h2>
          <p className="text-taupe-deep mb-5 text-sm leading-relaxed">
            Put this in a bio or a post. It opens a nomination page with you already chosen, so
            nobody has to search for you. It carries no extra weight with the panel, and the number
            of nominations it brings in decides nothing.
          </p>

          {portal?.referralPath ? (
            <>
              <p className="border-stone-deep bg-stone/25 mb-4 flex items-center gap-2 border px-4 py-3 font-mono text-sm break-all">
                <span className="min-w-0 break-all">{absoluteUrl(portal.referralPath)}</span>
                <CopyMark
                  value={absoluteUrl(portal.referralPath)}
                  label="Copy your nomination link"
                />
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <CopyLink value={absoluteUrl(portal.referralPath)} label="Copy nomination link" />
                <Button asChild size="sm" variant="ghost">
                  <Link href={portal.referralPath}>Preview it</Link>
                </Button>
              </div>
            </>
          ) : (
            <p className="text-taupe-deep text-sm leading-relaxed">
              Issued once your record is claimed and verified. Finish{' '}
              <Link href="/creator/verification" className="palma-link text-ink">
                verification
              </Link>{' '}
              and it appears here.
            </p>
          )}
        </section>

        <section className="border-stone-deep flex flex-col border p-7">
          <h2 className="palma-label text-taupe-deep mb-2">The link that proves it</h2>
          <p className="text-taupe-deep mb-5 text-sm leading-relaxed">
            One address, for good. It leads with your most recent honour and keeps working as you
            win more, so it never has to be reissued. This is the one for a press kit, a CV or a
            profile that outlives a season.
          </p>

          {recordPath ? (
            <>
              <p className="border-stone-deep bg-stone/25 mb-4 flex items-center gap-2 border px-4 py-3 font-mono text-sm break-all">
                <span className="min-w-0 break-all">{absoluteUrl(recordPath)}</span>
                <CopyMark value={absoluteUrl(recordPath)} label="Copy your record link" />
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <CopyLink value={absoluteUrl(recordPath)} label="Copy record link" />
                <Button asChild size="sm" variant="ghost">
                  <Link href={recordPath}>Preview it</Link>
                </Button>
              </div>
            </>
          ) : (
            <p className="text-taupe-deep text-sm leading-relaxed">
              Your record link appears once PALMA holds a record for you.
            </p>
          )}
        </section>
      </div>

      <section className="border-stone-deep mt-10 max-w-240 border p-7">
        <h2 className="palma-label text-taupe-deep mb-3">A single honour, on its own</h2>
        <p className="text-taupe-deep mb-5 max-w-160 text-sm leading-relaxed">
          Each honour also has its own permanent page and verification code, for when you are citing
          one specifically rather than the whole record. Anyone can check it without an account.
        </p>

        {newest ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="border-stone-deep bg-stone/25 flex items-center gap-2 border px-4 py-2 font-mono text-sm">
              {newest.code}
              <CopyMark value={newest.code} label="Copy the verification code" />
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href={`/verify/${newest.code}`}>Open the verification page</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href={`/verify/${newest.code}/opengraph-image`} download>
                Download the share card
              </a>
            </Button>
          </div>
        ) : (
          <p className="text-taupe text-sm">Available once you hold an honour.</p>
        )}
      </section>

      <Notice className="mt-10 max-w-240" title="On using the mark">
        Winners and finalists may state the honour they hold anywhere. Share cards are generated
        from the record itself, so they cannot misstate it. What the mark may and may not sit beside
        is in the{' '}
        <Link href="/legal/mark" className="palma-link text-ink">
          mark policy
        </Link>
        .
      </Notice>
    </PortalShell>
  );
}
