import { notFound } from 'next/navigation';
import { Container } from '@/components/palma/layout';
import { Credential, type CredentialHonour } from '@/components/palma/Credential';
import { HONOUR_LABEL } from '@/components/palma/badges';
import { HONOUR_STANDING, isThePalma } from '@/domain/honours';
import { JsonLd, absoluteUrl, awardJsonLd, buildMetadata } from '@/lib/seo';
import { getCreator } from '@/server/data/queries';

export const revalidate = 900;

type Params = { params: Promise<{ slug: string }> };

/**
 * One address per person: `palmaawards.com/c/maya-rivers`.
 *
 * A creator who wins three times should not be handing out three links, and
 * the one already printed in a press kit has to keep working as they win more.
 * So the address names the person, the page leads with their most recent
 * honour, and everything else they hold is a click away without the address
 * changing.
 *
 * `/c/` rather than `/credential/` because this is the link that goes in a bio
 * where every character is visible, and the shortest honest prefix is the
 * right one.
 *
 * It is deliberately thin. Somebody arriving here was sent by a link and is
 * answering one question, so they get the name, the honour and the seal. The
 * reasoning, the citation and the rest of the career live on the record, which
 * is one link down the page.
 */
export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const creator = await getCreator(slug);
  const honours = creator ? creator.record.filter((e) => e.state === 'active') : [];

  if (!creator || honours.length === 0) {
    return buildMetadata({
      title: 'Credential',
      description: 'A verified PALMA record.',
      path: `/c/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${creator.displayName}. Verified by PALMA`,
    description: `${creator.displayName} holds ${honours.length} ${
      honours.length === 1 ? 'PALMA honour' : 'PALMA honours'
    }. A verified record.`,
    path: `/c/${creator.slug}`,
  });
}

export default async function CredentialPage({ params }: Params) {
  const { slug } = await params;
  const creator = await getCreator(slug);
  if (!creator) notFound();

  const active = creator.record.filter((entry) => entry.state === 'active');
  // Nothing to prove is not a credential. A creator with no honour keeps a
  // profile; they do not get a page asserting they hold something.
  if (active.length === 0) notFound();

  // Most recent first, and where a season produced more than one, the higher
  // honour leads. THE PALMA is never buried under a category win.
  const ordered: CredentialHonour[] = [...active]
    .sort((a, b) => b.year - a.year || HONOUR_STANDING[b.kind] - HONOUR_STANDING[a.kind])
    .map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      label: HONOUR_LABEL[entry.kind],
      what: isThePalma(entry.kind) ? 'THE PALMA' : entry.categoryName,
      year: entry.year,
      code: entry.code,
      revoked: entry.state === 'revoked',
    }));

  const latest = ordered[0]!;

  return (
    <>
      <section className="on-ink bg-ink text-ivory relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="border-champagne/25 pointer-events-none absolute inset-3 border sm:inset-5"
        />
        <Container className="relative flex min-h-[78vh] flex-col justify-center py-20 sm:py-24">
          <Credential
            name={creator.displayName}
            honours={ordered}
            shareUrl={absoluteUrl(`/c/${creator.slug}`)}
            profileHref={`/creators/${creator.slug}`}
          />
        </Container>
      </section>

      <JsonLd
        data={awardJsonLd({
          creatorName: creator.displayName,
          creatorUrl: absoluteUrl(`/creators/${creator.slug}`),
          categoryName: latest.what,
          year: latest.year,
          kind: latest.label,
          code: latest.code,
        })}
      />
    </>
  );
}
