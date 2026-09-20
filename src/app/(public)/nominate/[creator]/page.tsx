import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { NominateForm } from '@/components/nominate/NominateForm';
import { Reveal } from '@/components/motion/primitives';
import { EditorialImage } from '@/components/palma/EditorialImage';
import { VerificationBadge } from '@/components/palma/badges';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/brand/Wordmark';
import { buildMetadata } from '@/lib/seo';
import { acceptsNominations } from '@/domain/season';
import { canIssueReferralLink } from '@/domain/nomination';
import { countryName, formatDate } from '@/lib/format';
import { getCreator, getCurrentSeason, listCategories, listCreators } from '@/server/data/queries';

export const revalidate = 300;

type Params = { params: Promise<{ creator: string }> };

export async function generateStaticParams() {
  const creators = await listCreators({ limit: 200 });
  return creators.map((creator) => ({ creator: creator.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { creator: slug } = await params;
  const creator = await getCreator(slug);
  if (!creator) {
    return buildMetadata({
      title: 'Nominate',
      description: 'Nominate a creator for a PALMA.',
      path: `/nominate/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `Nominate ${creator.displayName}`,
    description: `Nominate ${creator.displayName} for a PALMA, The Creator Honours. It takes under a minute and needs no account.`,
    path: `/nominate/${creator.slug}`,
    image: `/creators/${creator.slug}/opengraph-image`,
  });
}

/**
 * A creator's own nomination link.
 *
 * It says "this is my nomination page", not "vote for me". The only thing it
 * changes is that the creator is already chosen — it carries no weight in
 * judging, and a nomination made here counts exactly as one made any other way.
 */
export default async function ReferralNominatePage({ params }: Params) {
  const { creator: slug } = await params;
  const creator = await getCreator(slug);
  if (!creator) notFound();

  const season = await getCurrentSeason();
  const categories = await listCategories(season.year);
  const open = acceptsNominations(season.stage);

  const linkLive = canIssueReferralLink({
    isClaimed: creator.isClaimed,
    isSuspended: false,
    verificationStatus: creator.verificationStatus,
  });

  return (
    <>
      {/* A creator's own link is the one PALMA page that gets shared into a
          feed, so it is built like a poster rather than a form with a header:
          the portrait is plated and sealed, and the name is set as large as it
          would be on the night. */}
      <section className="on-ink bg-ink text-ivory border-ink relative overflow-hidden border-b">
        <span aria-hidden="true" className="palma-plate-glow" />

        <Container className="relative py-16 sm:py-24">
          <div className="flex flex-col items-start gap-12 sm:flex-row sm:items-center sm:gap-14">
            {/* The plate: a champagne hairline offset behind the portrait, so
                it reads as mounted rather than pasted on. */}
            <Reveal
              variant="enter"
              className="palma-portrait-plate w-full max-w-52 shrink-0 sm:max-w-56"
            >
              <EditorialImage
                name={creator.displayName}
                src={creator.portraitUrl}
                alt={creator.portraitAlt}
                ratio="square"
                priority
                sizes="(max-width: 640px) 13rem, 14rem"
                className="relative z-10"
              />
              <span aria-hidden="true" className="palma-portrait-rule" />
            </Reveal>

            <Reveal variant="enter" delay={0.1} className="flex min-w-0 flex-col gap-5">
              <span className="palma-label text-champagne">{season.title} · Nomination</span>
              <h1 className="text-5xl leading-[1.02] sm:text-7xl">{creator.displayName}</h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="palma-label text-ivory/55">
                  {countryName(creator.countryCode)}
                </span>
                <VerificationBadge status={creator.verificationStatus} tone="dark" />
              </div>
              {creator.headline ? (
                <p className="text-ivory/70 max-w-130 text-lg leading-relaxed">
                  {creator.headline}
                </p>
              ) : null}
              <p className="text-ivory/40 max-w-130 text-sm leading-relaxed">
                Putting {creator.displayName} forward takes under a minute and needs no account.
              </p>
            </Reveal>
          </div>
        </Container>
      </section>

      <Section className="py-14 sm:py-20">
        <Container>
          {!open ? (
            <EmptyState
              title="Nominations are closed"
              description={`Nominations for ${season.title} are not open. Finalists are announced on ${formatDate(season.finalistsAt)}.`}
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href={`/creators/${creator.slug}`}>View the PALMA record</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-14 lg:grid-cols-12">
              <Reveal className="lg:col-span-7">
                <NominateForm
                  categories={categories.map((entry) => ({
                    slug: entry.slug,
                    name: entry.name,
                    strapline: entry.strapline,
                  }))}
                  creator={{
                    slug: creator.slug,
                    displayName: creator.displayName,
                    countryCode: creator.countryCode,
                    headline: creator.headline,
                    verified: creator.verificationStatus === 'verified',
                  }}
                  referralSlug={creator.slug}
                />
              </Reveal>

              <Reveal as="div" delay={0.08} className="flex flex-col gap-6 lg:col-span-5 lg:pl-10">
                <Notice title="What this link is">
                  This is {creator.displayName}’s nomination page. It only saves you the step of
                  searching for them, a nomination made here carries no more weight than any other,
                  and nomination numbers do not decide who wins.
                </Notice>

                {!linkLive ? (
                  <Notice tone="warning" title="Unverified profile">
                    This creator has not completed PALMA verification. You may still nominate them;
                    an honour cannot be conferred until verification is complete.
                  </Notice>
                ) : null}

                <div className="border-stone-deep flex flex-col gap-4 border p-6">
                  <Wordmark size="sm" href={null} />
                  <p className="text-taupe-deep text-sm leading-relaxed">
                    PALMA is the permanent record of achievement in the creator industry. Every
                    honour is judged by an independent panel and can be verified by anyone.
                  </p>
                  <Button asChild size="sm" variant="outline" className="self-start">
                    <Link href="/about">About PALMA</Link>
                  </Button>
                </div>
              </Reveal>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
