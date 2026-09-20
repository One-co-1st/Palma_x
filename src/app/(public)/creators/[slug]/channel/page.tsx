import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { PalmMark } from '@/components/brand/PalmMark';
import { buildMetadata } from '@/lib/seo';
import { getCreator } from '@/server/data/queries';
import { fillCreatorSlots, isPlaceholderUrl } from '@/domain/creator-slots';

export const revalidate = 900;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const creator = await getCreator(slug);
  return buildMetadata({
    title: creator ? `${creator.displayName}, Channel` : 'Channel',
    description: 'A channel address PALMA is still waiting on.',
    path: `/creators/${slug}/channel`,
    noIndex: true,
  });
}

/**
 * Where a placeholder channel address sends its readers.
 *
 * A record PALMA wrote before its creator claimed it carries `example.com` as
 * the channel address — a placeholder, not a destination. Sending a reader to
 * a domain that exists only in documentation answers nothing, so the Channel
 * slot links here instead until the creator claims the record and writes down
 * the real address. The moment they do, this page steps aside and sends its
 * visitors back to the record.
 */
export default async function ChannelPlaceholderPage({ params }: Params) {
  const { slug } = await params;
  const creator = await getCreator(slug);
  if (!creator) notFound();

  const { slots } = fillCreatorSlots(creator.links);
  const channel = slots.find((entry) => entry.slot.key === 'channel');

  // A real, creator-supplied channel makes this page redundant.
  if (channel?.link && !isPlaceholderUrl(channel.link.url)) {
    redirect(`/creators/${creator.slug}`);
  }

  return (
    <Section className="relative overflow-hidden py-24 sm:py-32">
      <PalmMark
        variant="line"
        className="text-ink/[0.04] pointer-events-none absolute -top-10 -right-16 h-72"
      />
      <Container size="narrow">
        <div className="relative mx-auto flex max-w-140 flex-col gap-8">
          <Link
            href={`/creators/${creator.slug}`}
            className="palma-label text-taupe-deep hover:text-ink transition-colors"
          >
            ← {creator.displayName}
          </Link>

          <div className="flex flex-col gap-5">
            <span className="palma-label text-taupe-deep">The Channel slot</span>
            <h1 className="text-4xl leading-tight sm:text-5xl">
              This address is still a placeholder.
            </h1>
            <p className="text-taupe-deep leading-relaxed">
              When {creator.displayName} first entered the record, PALMA wrote down a channel
              address it could not yet confirm — the archive&rsquo;s way of leaving a marker where a
              real one will go. It has not been updated since, so rather than send you to a domain
              that exists only in technical documentation, the link brought you here.
            </p>
            <p className="text-taupe-deep leading-relaxed">
              {creator.displayName} has not updated their Channel details yet. When they do, this
              page quietly retires itself and the link goes where it was always meant to.
            </p>
          </div>

          <div className="border-stone-deep flex flex-col gap-3 border p-7">
            <h2 className="palma-label text-taupe-deep">If this is your record</h2>
            <p className="text-taupe-deep text-sm leading-relaxed">
              Claim it, and the Channel slot is yours to fill. PALMA reviews every claim by hand,
              and the placeholder goes the moment the real address arrives.
            </p>
            <Link
              href={`/creator/claim?creator=${creator.slug}`}
              className="palma-label text-olive hover:text-ink mt-1 transition-colors"
            >
              Claim this profile
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
